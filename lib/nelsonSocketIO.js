//=============================================================================
// Copyright (c) 2016-present Allan CORNET (Nelson)
//=============================================================================
// LICENCE_BLOCK_BEGIN
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
// LICENCE_BLOCK_END
//=============================================================================
'use strict';
//=============================================================================
const CONFIGURATION = require('../etc/configuration.json');
//=============================================================================
const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const childProcess = require('child_process');
const findFreePort = require('find-free-port');
const limiter = require('./rate-limiter.js');
//=============================================================================
const SOCKET_TO_CHILD_FORWARDERS = {
  command: (data) => ({ msgtype: 'command', data }),
  clc: () => ({ msgtype: 'clc' }),
  stop: () => ({ msgtype: 'stop' }),
  available: () => ({ msgtype: 'available' }),
  unavailable: () => ({ msgtype: 'unavailable' }),
  disconnect: () => ({ msgtype: 'quit' }),
};
//=============================================================================
const CHILD_TO_SOCKET_FORWARDERS = {
  command_received: (socket) => socket.emit('command_received'),
  prompt: (socket, msg) => socket.emit('prompt', msg.output),
  reply: (socket, msg) => socket.emit('reply', msg),
  clc: (socket) => socket.emit('clc'),
  stop: (socket) => socket.emit('stop'),
  available: (socket) => socket.emit('available'),
  unavailable: (socket) => socket.emit('unavailable'),
  quit: (socket) => socket.emit('quit'),
};
//=============================================================================
const app = express();
const resourcesDir = path.join(__dirname, '..', 'resources');
const nelsonProcessPath = path.join(__dirname, 'nelsonProcess.js');
//=============================================================================
function nelsonSocketIO() {
  const server = http.Server(app);
  const io = socketio(server);
  //=============================================================================
  server.on('error', (err) => {
    console.error('Failed to start Nelson Cloud server:', err.message);
  });
  server.listen(CONFIGURATION.PORT, () => {
    console.log(`Server running at http://localhost:${CONFIGURATION.PORT}`);
  });
  //=============================================================================
  app.use(limiter);
  app.use(express.static(resourcesDir));
  app.get('/', (req, res) => {
    res.sendFile(path.join(resourcesDir, 'index.html'));
  });
  //=============================================================================
  io.on('connection', (socket) => {
    const child = childProcess.fork(nelsonProcessPath);

    child.on('message', (msg) => {
      child_emit(socket, msg);
    });

    findFreePort(
      CONFIGURATION.MIN_NELSON_PORT,
      CONFIGURATION.MAX_NELSON_PORT,
      (err, freePort) => {
        if (err) {
          console.error('Unable to find free Nelson port:', err.message);
          socket.emit('error', {
            message: 'Unable to initialise Nelson session.',
          });
          child.kill();
          return;
        }

        child.send({ msgtype: 'initialization', id: freePort });
        io.emit('initialization');

        child_on(socket, child, io);
      },
    );
  });
  //=============================================================================
}
//=============================================================================
function child_on(socket, child, ios) {
  Object.entries(SOCKET_TO_CHILD_FORWARDERS).forEach(
    ([event, buildMessage]) => {
      socket.on(event, (data) => {
        const payload = buildMessage(data);
        if (payload) {
          child.send(payload);
        }
      });
    },
  );

  socket.on('reply', (data = {}) => {
    const payload = { ...data };
    if (!payload.from && socket.session?.name) {
      payload.from = socket.session.name;
    }
    ios.emit('reply', payload);
  });

  socket.on('send_variable', (data) => {
    ios.emit('send_variable', data);
  });

  socket.on('quit', () => {
    ios.emit('quit');
  });
}
//=============================================================================
function child_emit(socket, msg) {
  const forwarder = CHILD_TO_SOCKET_FORWARDERS[msg.msgtype];
  if (forwarder) {
    forwarder(socket, msg);
    return;
  }
  socket.emit(msg.msgtype, msg.output);
}
//=============================================================================
module.exports = { nelsonSocketIO, __test__: { child_on, child_emit } };
//=============================================================================
