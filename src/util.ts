const fs = require('fs')

import {buildInfoPath} from './constants'

export function setBuildInfo(content) {
  fs.writeFileSync(
    buildInfoPath,
    content || ""
  );
}

export function getBuildInfo() {
  if (fs.existsSync(buildInfoPath)) {
    return fs.readFileSync(buildInfoPath, 'utf-8');
  }
}

export function delBuildInfo() {
  if (fs.existsSync(buildInfoPath)) {
    fs.unlink(buildInfoPath);
  }
}

export function isTSX(path) {
  return path.match(/\.tsx$/gi);
}

export function isEjs(path) {
  return path.match(/\.ejs$/gi)
}

export function generateFileName(path) {
  let path2Array = path.split("/");
  return path2Array.slice(-2).join("-").replace(/\.vue$/, "")
}