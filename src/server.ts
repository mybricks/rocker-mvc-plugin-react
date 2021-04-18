const fs = require('fs');
const net = require('net');
const EventEmitter = require('events');

import {COMPILE_ERROR, MESSAGE, UPDATE, BEATS} from './constants'

export class Server extends EventEmitter {
  constructor() {
    super();
    this.socketList = [];
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  listen(sockPath, callback) {
    if (fs.existsSync(sockPath)) {
      fs.unlinkSync(sockPath);
    }

    this.sockPath = sockPath;
    this.server.listen(sockPath, callback);
  }

  close() {
    const sockPath = this.sockPath;
    if (fs.existsSync(sockPath)) {
      fs.unlinkSync(sockPath);
    }

    this.server.close();
  }

  send(message) {
    this.socketList.forEach((socket) => {
      socket.write(message + "__$$$__");
    })
  }

  compileFail(error) {
    this.send(JSON.stringify({status: COMPILE_ERROR, buildMsg: error}));
  }

  message(msg) {
    this.send(JSON.stringify({status: MESSAGE, buildMsg: msg}));
  }

  notifyUpdate(msg) {
    this.send(JSON.stringify({status: UPDATE, buildMsg: msg}));
  }

  handleConnection(socket) {
    this.socketList.push(socket);
    let temporary = ""

    socket.on('data', (chunk) => {
      const msg = chunk.toString();

      if (msg.lastIndexOf("__$$$__") === -1 || msg.lastIndexOf("__$$$__") + 7 < msg.length) {
        temporary += msg;
        return
      }

      temporary += msg;
      temporary.split("__$$$__").forEach((msg) => {
        if (msg === '') return;

        if (BEATS === msg) {
          this.emit('beats');
        } else {
          try {
            msg = JSON.parse(msg)
            this.emit('build', msg)
          } catch (e) {
            this.message(e.stack)
          }
        }
      })

      temporary = ""
    })


    socket.on("end", () => {
      let i = this.socketList.indexOf(socket);
      if (i > -1) {
        this.socketList.splice(i, 1);
      }
    })
  }
}