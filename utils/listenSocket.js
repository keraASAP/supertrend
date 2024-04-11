const events = require("events");
const WebSocket = require("ws");

function listenSocket(socketUrl, callback) {
  let cbCalled = false;

  const eventEmitter = new events.EventEmitter();

  listen();

  function listen() {
    let lastReceived = Date.now();
    let url = socketUrl;

    const socket = new WebSocket(url);
    let resetId = setInterval(function () {
      if (Date.now() > lastReceived + 10 * 1000) {
        try {
          socket.ping();
        } catch (err) {}
      }

      if (Date.now() - lastReceived > 20 * 1000) {
        try {
          socket.terminate();
        } catch (err) {
          clearInterval(resetId);
          listen();
        }
      }
    }, 15000);

    socket.on("open", function () {
      lastReceived = Date.now();
      if (!cbCalled) {
        cbCalled = true;
        callback(eventEmitter);
      }
    });

    socket.on("close", function () {
      clearInterval(resetId);
      listen();
    });

    socket.on("error", () => {});

    socket.on("pong", () => {
      lastReceived = Date.now();
    });

    socket.on("ping", function () {
      lastReceived = Date.now();
      try {
        socket.pong();
      } catch (err) {}
    });

    socket.on("message", function (message) {
      eventEmitter.emit("message", message);
      lastReceived = Date.now();
    });
  }
}

module.exports = listenSocket;
