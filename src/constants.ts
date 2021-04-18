const path = require('path')

export const MESSAGE = '0004'
export const BEATS = "0001"
export const UPDATE = "0002"
export const SCRIPT_ID = "_script_"
export const BUILD_PATH = "build/static"
export const COMPILE_ERROR = '0003'

export const tmpDir = path.join(process.cwd(), './.tmp/tmp_sock');
export const buildDir = path.join(process.cwd(), './build/static');
export const buildInfoPath = path.join(process.cwd(), './buildinfo.json');
export const sockPath = path.join(tmpDir, 'midproxy.sock');
