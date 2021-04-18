const net = require('net');
const EventEmitter = require('events');

import {COMPILE_ERROR, MESSAGE, UPDATE, BEATS} from './constants'

export class Client extends EventEmitter {
  constructor(options) {
    options = options || {};
    super();
    if (options.socket) {
      this.socket = options.socket;
    } else {
      this.socket = net.connect(options.sockPath);
    }
    this.bind();
  }

  bind() {
    const socket = this.socket;
    socket.on('error', (err) => {
      this.emit("error", err);
    })

    socket.on('connect', () => {
      this.emit("connect");
    })

    let temporary = ""
    socket.on('data', (chunk) => {
      let message = {};
      const msg = chunk.toString();

      if (msg.lastIndexOf("__$$$__") === -1 || msg.lastIndexOf("__$$$__") + 7 < msg.length) {
        temporary += msg;
        return
      }

      temporary += msg;
      temporary.split("__$$$__").forEach((msg) => {
        if (msg === "") return;

        try {
          msg = JSON.parse(msg)
        } catch (e) {
          console.log(e.stack);
        }

        if (msg.status === UPDATE) {
          this.emit("update", msg.buildMsg);
        }

        if (msg.status === COMPILE_ERROR) {
          this.emit("compileError", msg.buildMsg)
        }

        if (msg.status === MESSAGE) {
          this.emit("message", msg.buildMsg)
        }
      })

      temporary = "";
    })

    socket.on('end', () => {
      this.emit("end")
    })
  }

  beats() {
    this.send(BEATS);
  }

  send(message) {
    this.socket.write(`${message}__$$$__`);
  }
}