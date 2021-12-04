import {SCRIPT_ID, sockPath} from './constants'

import {generateFileName, isEjs, isTSX, getBuildInfo} from './util'
import * as fs from 'fs'
import * as path from 'path'
import * as exec from "child_process";
import * as EJS from "ejs";
import {Client} from "./client";
import {Logger} from "@mybricks/rocker-commons";

import * as Socket from 'socket.io'

type CompileParam = {
  wrapper: string,
  env?: string,
  cdn?: {
    group: string,
    project: string,
    version?: string,
  },
  webpackConfig?: object | string,
  webpackConfigMode?: string,
  cssSplit?: boolean,
  debugPort?: number
  cb: () => {}
}

export default function (param: CompileParam) {
  return function (data) {
    if (param.env === 'local') {
      param.env = 'dev'
    }
    render(param, data)
  }
}

const isFirstCluster = process.env.NODE_APP_INSTANCE == "1" || !process.env.NODE_APP_INSTANCE
const prevBuild = process.argv[2] === "build";
const closeBuild = process.argv[2] === "close";

const ENV = {
  dev: "dev",
  local: "local"
}
const defaultRenderType = 'html'
const defaultDebugPort = 8500

let srcPre = '/build/static/'

function render(param: CompileParam, data) {
  let wrapperPath = param.wrapper;
  if (!wrapperPath) {
    throw TypeError('plugin必须提供wrapper');
  } else if (wrapperPath.indexOf(".") === 0) {
    wrapperPath = path.join(process.cwd(), wrapperPath);
  }

  let files = [];
  let types = [];

  data.forEach((paths, clz) => {
    paths.forEach((module, path) => {
      const render = module.render;
      if (!render) {
        return;
      }

      if (Array.isArray(render)) {
        render && render.forEach((it) => {
          if (isTSX(it.path)) {
            files.push(it.path);
            types.push(it.renderType || defaultRenderType)
          }
        });
      } else {
        Object.keys(render).forEach((renderKey) => {
          render[renderKey].forEach((it) => {
            if (isTSX(it.path)) {
              files.push(it.path);
            }
          })
        })
      }
    })
  })

  if (files.length === 0) {
    return;
  }

  let client;
  let timer;
  const isLocal = param.env === ENV.dev || param.env === ENV.local;
  const staticPath = path.join(process.cwd(), './build/static');

  Logger.info(`当前环境: ${isLocal ? '本地' : 'zebra'}`);

  let io
  if (isLocal) {
    io = Socket(param.debugPort || defaultDebugPort)
  }

  let anonymity = function (chunkMap) {
    chunkMap = chunkMap || {};

    let generateTagSync = function ({
                                      // script src
                                      src,
                                      // script id
                                      id,
                                      cssSrc
                                    }) {
      var scriptHtml = '', propHtml = '', linkHtml = '';
      if (param.cssSplit) {
        linkHtml += `<link rel="stylesheet" href="${cssSrc}">`
      }
      propHtml += ` data-obj="<$$$$$= JSON.stringify(obj) $$$$$>"`;
      scriptHtml += `<script id="${id}"  ${propHtml} src="${src}">
            </script>`;
      return linkHtml + scriptHtml;
    };

    let defineCompiler = function (it, i, render) {
      if (param.webpackConfig && param.webpackConfigMode === 'replace') {
        const fileName = it.path.split("/").pop();
        const pattern = fileName.split(".").slice(0, -1);
        let html = "";
        try {
          html = fs.readFileSync(path.join(process.cwd(), `./build/pages/${pattern}.html`), 'utf-8');
        } catch (e) {
          throw new Error(`没有在 pages 目录下找到与${pattern}对应的 html 文件， 请检查 render 中 vue 文件与构建完成后 html 名称是否对应`);
        }
        const str = `id="${SCRIPT_ID}" data-obj="<%= JSON.stringify(obj) %>"`
        const ejsHtml = html.replace(`id="${SCRIPT_ID}"`, str);
        if (ejsHtml === html) {
          Logger.error(`没有在 ${pattern}.html 中找到 id 为 ${SCRIPT_ID} 的 script 标签，请检查 webpack 配置`);
        }

        render[i].compile = function () {
          return function (model) {
            let tpt = EJS.compile(ejsHtml, {});
            return tpt({
              obj: model
            })
          }
        }
        return;
      }

      // 从 chunkMap 中获取 js 文件名， css 文件名
      const entryIndex = generateFileName(it.path);
      const fileNameMap = chunkMap ? chunkMap[entryIndex] : entryIndex;

      const cssFilename = fileNameMap ? fileNameMap['css'] : entryIndex + '.css'
      const jsFilename = fileNameMap ? fileNameMap['js'] : entryIndex + '.js'
      const cssSrc = srcPre + cssFilename
      const jsSrc = srcPre + jsFilename

      if (render.length == 1) {
        if (isEjs(it.path)) {
          render[i].compile = ejsCompileFactory(it.path, chunkMap);
        } else {
          // 编译非 ejs 文件，分为 module 和 html
          const renderType = it.renderType || defaultRenderType;
          if (renderType === defaultRenderType) {
            let fileContent = fs.readFileSync(it.wrapper || wrapperPath, 'utf-8')
            if (isLocal) {
              fileContent = addReloadScript(fileContent, param.debugPort)
            }

            fileContent = fileContent.replace(/<\/body\s*>/, `<script id="<%=id %>" data-obj="<%= JSON.stringify(obj) %>" src="<%= src %>" crossorigin="anonymous"></script>\n</body>`)

            let tpt = EJS.compile(fileContent, 'utf8');

            render[i].compile = function () {
              return function (model) {
                let ejs = model.ejs;
                let data = {
                  id: SCRIPT_ID,
                  cssSrc: cssSrc,
                  src: jsSrc,
                  chunkMap: chunkMap,
                  prePath: srcPre,
                  obj: model,
                  jsFilename,
                  env: param.env
                }

                if (ejs) {
                  Object.keys(ejs).forEach((key) => {
                    if (!data[key]) {
                      data[key] = ejs[key];
                    }
                  })
                }
                return tpt(data);
              }
            };
          } else if (renderType === 'module') {
            const moduleBundlePath = path.join(process.cwd(), jsSrc);
            const content = fs.readFileSync(moduleBundlePath, 'utf8')
            render[i].compile = function () {
              return function () {
                return content
              }
            }
          }
        }
      } else {
        // 直接读取ejs
        if (isTSX(it.path)) {
          render[i].compile = ejsCompileFactory(it.path, chunkMap);
        } else {
          // 编译vue
          const entryIndex = generateFileName(it.path);
          render[i].compile = function () {
            let scriptHtml = generateTagSync({
              cssSrc: cssSrc,
              src: jsSrc,
              id: SCRIPT_ID,
            });
            return function (model) {
              let tpt = EJS.compile(scriptHtml, {delimiter: '$$$$$'});
              return tpt({
                obj: model
              });
            }
          };
        }
      }
    }

    data.forEach((paths, clz) => {
      paths.forEach((module, p) => {
        if (!module.render) {
          return;
        }

        if (Array.isArray(module.render)) {
          let render = module.render;
          module.render && module.render.forEach((it, i) => {
            defineCompiler(it, i, render);
          });
        } else {
          Object.keys(module.render).forEach((renderKey) => {
            const distinctRender = module.render[renderKey];

            distinctRender.forEach((it, i) => {
              defineCompiler(it, i, distinctRender);
            })
          })
        }
      })
    })

    io && io.emit('page-reload');
  }

  // 业务方使用 cdn 发布，且不在本地环境，替换url链接
  if (param.cdn && !isLocal) {
    const cdn = param.cdn;
    srcPre = `https://s.${param.env === 'prod' ? '' : (param.env + '.')}geilicdn.com/${cdn.group}/${cdn.project}/`
    // if (cdn.version) {
    //     srcPre += `${cdn.version}/`
    // }
  }

  // 如果 build/static 已经存在，则说明已经构建出 build 目录。如果非本地环境则不再进行构建
  if (fs.existsSync(staticPath) && !isLocal) {
    Logger.info("存在 build 目录，zebra 环境不再创建子进程构建")
    detectChunkMap();
    return;
  }

  if (!isFirstCluster) {
    detectChunkMap();
    return;
  }

  Logger.info("未检测到 build 目录，即将执行构建");

  function handleClientEvent(client) {
    client.on("connect", () => {
      client.beats();
      timer = setInterval(() => {
        client.beats();
      }, 20000)
      Logger.info("开始编译文件");
      client.send(JSON.stringify({param: param, files, types, prevBuild: prevBuild, close: closeBuild}));
    })

    client.on("update", (buildMsg) => {
      Logger.info("文件编译完成");
      if (buildMsg) {
        Logger.info(buildMsg);
      }
      
      typeof param.cb === "function" && param.cb();
      detectChunkMap();
    })

    client.on("compileError", (buildMsg) => {
      Logger.error('webpack构建错误');
      Logger.error(buildMsg);
    })

    client.on("message", (buildMsg) => {
      Logger.info(buildMsg);
    })

    client.on("end", () => {
      Logger.info("构建进程关闭，不再发送心跳");
      clearInterval(timer);
      if (prevBuild || closeBuild) {
        process.exit();
      }
    })

    client.on("error", (e) => {
      if (fs.existsSync(sockPath)) {
        fs.unlinkSync(sockPath);
      }
      Logger.info("连接构建进程失败，删除 socket 文件，重启构建进程");
      Logger.error(e.message);

      detectProcess();
    })
  }

  function detectChunkMap() {
    let chunkMap = getBuildInfo();
    try {
      chunkMap = JSON.parse(chunkMap);
    } catch (e) {
      chunkMap = {};
    }

    if (chunkMap !== undefined) {
      anonymity(chunkMap);
    } else {
      setTimeout(detectChunkMap, 1000);
    }
  }

  // 开启 child-process.js 的过程是异步的，轮训监听是否存在 sockPath 文件
  function detectionServer() {
    if (fs.existsSync(sockPath)) {
      client = new Client({sockPath: sockPath});
      handleClientEvent(client);
    } else {
      setTimeout(detectionServer, 50);
    }
  }

  // 检测是否存在 sock 文件，如果存在，则进行连接，否则创建
  function detectProcess() {
    if (fs.existsSync(sockPath)) {
      Logger.info("找到对应的 socket 文件，建立与构建进程的链接")
      client = new Client({sockPath: sockPath});
      handleClientEvent(client);
    } else {
      Logger.info("没有找到对应的 socket 文件");
      if (!isLocal) {
        Logger.info("zebra 环境，创建构建子进程");
        let sp = exec.spawn('node', [path.join(__dirname, './child-process.js'), param.env], {
          stdio: 'inherit',
          execArgv: []
        });
      } else {
        Logger.info("本地环境，创建新的构建 daemon 进程");
        // let sp = exec.spawn('node', [path.join(__dirname, './child-process.js'), param.env], {
        //     detached: true,
        //     stdio: 'inherit',
        //     execArgv: []
        // });
        let sp = exec.spawn('nohup', ['node', path.join(__dirname, './child-process.js'), param.env, '>/dev/null 2>&1 &'], {
          detached: true,
          // stdio: 'inherit',
          shell: true,
          execArgv: []
        });
        sp.unref()
      }

      detectionServer()
    }
  }

  detectProcess();
}

function addReloadScript(wrapper, port = defaultDebugPort) {
  const script = `<script src="https://assets.geilicdn.com/m/vms-no-require-sockeio/0.0.1/index.js"></script>
  <script>
  var socket = io.connect('//127.0.0.1:${port}', {
      reconnection: false
  });
  socket.on('connect', function () {
      socket.on('page-reload', function (data) {
          window.location.reload();
      });
  });
  </script>`

  const index = wrapper.indexOf('</html>')
  if (!index) return wrapper + script

  const pre = wrapper.slice(0, index)
  const after = wrapper.slice(index)
  return pre + script + after
}

function ejsCompileFactory(ejsPath, chunkMap) {
  return function () {
    return function (model) {
      let tpt = EJS.compile(fs.readFileSync(ejsPath, 'utf8'));
      let data = {
        chunkMap: chunkMap,
        prePath: srcPre
      };
      let ejs = model.ejs;
      if (ejs) {
        Object.keys(ejs).forEach((key) => {
          data[key] = ejs[key];
        })
      }
      return tpt(data)
    }
  }
}