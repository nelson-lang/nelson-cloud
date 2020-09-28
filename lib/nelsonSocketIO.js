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
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const child_process = require('child_process');
const findFreePort = require('find-free-port');
const nelsonProcess = require('./nelsonProcess');
//=============================================================================
function nelsonSocketIO() {
  const server = http.Server(app);
  const io = socketio(server);
  //=============================================================================
  server.listen(CONFIGURATION.PORT);
  //=============================================================================
  app.use(express.static(__dirname + '/../resources'));
  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/resources/index.html');
  });
  //=============================================================================
  io.on('connection', function (socket) {
    //start process
    var child = child_process.fork(__dirname + '/nelsonProcess.js');
    //messaging with nelson js
    child.on('message', function (msg) {
      child_emit(socket, msg);
    });

    let freePort;
    findFreePort(
      CONFIGURATION.MIN_NELSON_PORT,
      CONFIGURATION.MAX_NELSON_PORT,
      function (err, freePort) {
        child.send({ msgtype: 'initialization', id: freePort });
        io.to('browser').emit('initialization');

        child_on(socket, child, io);
      }
    );
  });
  //=============================================================================
  console.log('Server running at http://localhost:' + CONFIGURATION.PORT);
  //=============================================================================
}
//=============================================================================
function child_on(socket, child, ios) {
  socket.on('command', function (data) {
    child.send({ msgtype: 'command', data: data });
  });

  socket.on('clc', function () {
    child.send({ msgtype: 'clc' });
  });

  socket.on('stop', function () {
    child.send({ msgtype: 'stop' });
  });

  socket.on('available', function () {
    child.send({ msgtype: 'available' });
  });

  socket.on('unavailable', function () {
    child.send({ msgtype: 'available' });
  });

  socket.on('disconnect', function () {
    child.send({ msgtype: 'quit' });
  });

  socket.on('reply', function (data) {
    data.from = socket.session.name;
    io.to('browser').emit('reply', data);
  });

  socket.on('send_variable', function (data) {
    io.to('browser').emit('send_variable', data);
  });

  socket.on('quit', function () {
    io.to('browser').emit('quit');
  });
}
//=============================================================================
function child_emit(socket, msg) {
  switch (msg.msgtype) {
    case 'command_received':
      socket.emit('command_received');
      break;
    case 'prompt':
      socket.emit('prompt', msg.output);
      break;
    case 'reply':
      socket.emit(msg.msgtype, msg);
      break;
    case 'clc':
      socket.emit('clc');
      break;
    case 'stop':
      socket.emit('stop');
      break;
    case 'available':
      socket.emit('available');
      break;
    case 'unavailable':
      socket.emit('unavailable');
      break;
    case 'quit':
      socket.emit('quit');
      break;
    default:
      socket.emit(msg.msgtype, msg.output);
      break;
  }
}
//=============================================================================
module.exports = { nelsonSocketIO };
//=============================================================================
