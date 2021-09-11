import * as fs from "fs";
import * as path from "path";
import * as exec from "child_process";
import * as webpack from "webpack";
import {Logger} from "@mybricks/rocker-commons";

import {merge} from "webpack-merge";
import entryFactory from "./entry.js";
import * as mkdirp from "mkdirp";

import {SCRIPT_ID, sockPath, tmpDir, buildDir} from './constants'
import {isTSX, setBuildInfo,generateFileName} from './util'

import {Server} from './server'

const execSync = exec.execSync;

process.title = 'rocker_render_plugin_daemon';

const webpackDevConfig = require("../build/webpack.dev.js");
const webpackServConfig = require("../build/webpack.service.js");

const ENV = {
  dev: "dev",
  local: "local"
}
let watching;
let server = new Server();
let timer = null;

process.on('SIGTERM', function () {
  closeAll("手动 kill 构建进程，终止构建，删除 socket 文件");
});

process.on('unhandledRejection', function (reason, promise) {
  closeAll(`unhandle error: ${reason}`);
})

process.on('uncaughtException', function (reason, promise) {
  closeAll(`uncaught error: ${reason}`);
})

mkdirp.sync(tmpDir);

server.listen(sockPath, () => {
  Logger.info('构建进程开始监听 socket 文件');
});

server.on("beats", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    closeAll("没有检测到存活的应用，关闭构建进程");
  }, 600000)
})

server.on("build", function (data) {
  if (data.close) {
    closeAll("手动 kill 构建进程，终止构建，删除 socket 文件");
    return;
  }
  build(data.param, data.files, data.types, data.prevBuild)
})

// 观察文件状态
// var watcher = chokidar.watch(process.cwd(), {
//     persistent: true,
//     ignored: /node_modules/
// });
// watcher
// .on('unlinkDir', path => {
//     if (path === tmpDir || path === buildDir) {
//         closeAll(`socket 文件被手动或程序删除，关闭构建进程${path}`);
//     }
// });

function closeAll(text?: string) {
  clearTimeout(timer);
  closeWatching();
  // util.delBuildInfo();
  server.message(text)
  server.close();
  process.exit(0);
}

function closeWatching() {
  if (watching && typeof watching.close === 'function') {
    watching.close();
  }
}

// 构建阶段使用的变量，用来判断本次构建是否是重新的构建，或是有新路由添加
let prevBuildFiles = [];

function build(param, files, types, preBuild) {
  const newFile = files.some((file) => {
    return prevBuildFiles.indexOf(file) === -1
  });

  const isLocal = param.env === ENV.dev || param.env === ENV.local;

  //  非重新构建或预构建，且没有新文件
  if (newFile || preBuild) {
    prevBuildFiles = files;
  } else {
    server.notifyUpdate();
    return;
  }

  let webpackConfig;
  const baseEntryPath = path.join(process.cwd(), './.tmp/entry');
  const baseBuildPath = path.join(buildDir, './static');

  // 判断绝对路径或是相对路径
  server.message("开始进行webpack配置");
  let userWebpack;
  try {
    if (param.webpackConfig) {
      if (param.webpackConfig.indexOf(".") === 0) {
        param.webpackConfig = path.join(process.cwd(), param.webpackConfig);
      }
      userWebpack = require(param.webpackConfig);
    }
  } catch (e) {
    server.message(e.stack);
  }


  if (param.webpackConfig && param.webpackConfigMode === 'replace') {
    if (!isLocal) {
      const buildExist = fs.existsSync(buildDir);

      if (!buildExist) {
        Logger.error("业务方选择自构建时，请将构建好的 build 目录提交到服务器")
      }

      server.notifyUpdate();
      closeAll("非本地环境构建 或 本地预构建完成，不进行 watching，关闭构建进程");
      return;
    } else {
      webpackConfig = userWebpack;
    }
  } else {
    // 防止已存在的 watching 干扰
    closeWatching();
    execSync(`rm -rf ${baseEntryPath} ${baseBuildPath}`);
    Logger.info("重启构建进程 删除 entry、build 目录");


    let entry = {};
    // 生成入口文件
    mkdirp.sync(baseEntryPath);

    files.forEach((filePath, index) => {
      if (!isTSX(filePath)) return;
      const fileKey = generateFileName(filePath);
      const tmpFilePath = path.join(baseEntryPath, fileKey + ".js");
      const fileId = SCRIPT_ID;

      const type = types[index] || 'html';
      let entryFileContent = ''
      if (type === 'html') {
        entryFileContent = entryFactory(filePath, fileId)
      } else if (type === 'module') {
        //entryFileContent = moduleEntryFactory(filePath)
      }
      fs.writeFileSync(tmpFilePath, entryFileContent);
      entry[fileKey] = tmpFilePath;
    });

    webpackConfig = webpackDevConfig;
    if (param.env === "prod") {
      webpackConfig = webpackServConfig;
    }

    if (param.webpackConfig && param.webpackConfigMode === "extend") {
      let userEntry = (<any>userWebpack).entry;
      let defaultEntry = entry;
      webpackConfig = userWebpack;
      webpackConfig.entry = Object.assign({}, defaultEntry, userEntry);
    } else if (param.webpackConfig) {
      webpackConfig.entry = entry;
      webpackConfig = merge(webpackConfig, userWebpack);
    } else {
      webpackConfig.entry = entry;
    }
  }

  let prevHash = "";

  server.message("webpack配置完成")
  try {
    const compiler = webpack(webpackConfig);
    watching = compiler.watch({
      aggregateTimeout: 300,
      poll: 300,
    }, (e, s) => {
      const curHash = s.toJson().hash;
      if (curHash === prevHash) return;
      prevHash = curHash;

      if (e) {
        server.compileFail(e.message);
        closeAll("webpack 构建 e 错误");
        return;
      }
      if (s.hasErrors() && s.compilation.errors[0]) {
        server.compileFail(s.compilation.errors[0].message);

        if (!isLocal || preBuild) {
          closeAll("构建失败，关闭构建进程");
        }
      }

      let chunkMap = s.toJson().assetsByChunkName;
      let jsChunkMap = {};
      for (let name in chunkMap) {
        let output = chunkMap[name];

        if (typeof chunkMap[name] === 'string') {
          output = [].concat(output)
        }

        if (Array.isArray(output)) {
          let css = output.filter(
            name => name.search(/\.css$/) !== -1
          );
          let js = output.filter(
            name => name.search(/\.js$/) !== -1
          );

          css = css.length ? css[0] : "";
          js = js.length ? js[0] : "";

          jsChunkMap[name] = {
            css,
            js
          };
        }
      }

      setBuildInfo(JSON.stringify(jsChunkMap));

      server.notifyUpdate(s.toString({
        modules: false,
        colors: true,
        chunks: false,
        assets: true,
        assetsSort: "field",
        builtAt: true,
        cached: false,
        cachedAssets: false,
        children: false,
        chunkGroups: false,
        chunkModules: false,
        chunkOrigins: false,
        moduleTrace: false,
        performance: true,
        providedExports: false,
        publicPath: false,
        reasons: false,
        source: false,
        entrypoints: false,
        warnings: false,
      }));

      if (!isLocal || preBuild) {
        closeAll("非本地环境构建 或 本地预构建完成，不进行 watching，关闭构建进程");
      }
    })
  } catch (e) {
    server.compileFail(e.message);
    closeAll("webpack 配置错误");
  }

}