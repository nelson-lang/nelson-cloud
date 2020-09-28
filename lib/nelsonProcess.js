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
const spawn = require('child_process').spawn;
const ip = require('ip');
const socketio = require('socket.io');
//=============================================================================
nelsonProcess();
//=============================================================================
function nelsonProcess() {
  //=============================================================================
  var io = [];
  var nelsonApp;
  var commandio;
  //=============================================================================
  process.on('message', function (msg) {
    switch (msg.msgtype) {
      case 'initialization':
        {
          const port = msg.id;
          commandio = socketio(port);
          const commandaddr = 'http://' + ip.address() + ':' + port;
          commandio.on('connection', function (socket) {
            socketToProcess(socket, process);
          });

          let app;
          let parameters;
          if (CONFIGURATION.USE_DOCKER) {
            app = CONFIGURATION.DOCKER;
            parameters = CONFIGURATION.DOCKER_PARAMETERS;
          } else {
            app = CONFIGURATION.NELSON_APPLICATION;
            parameters = CONFIGURATION.NELSON_APPLICATION_PARAMETERS;
          }
          parameters.push(commandaddr);
          nelsonApp = spawn(app, parameters);

          commandio.on('disconnect', function (socket) {});
        }
        break;
      case 'command':
        {
          commandio.emit('command', { data: msg.data });
        }
        break;
      case 'prompt':
        {
          console.log('emit prompt ' + msg.data);
          commandio.emit('prompt', msg.data);
        }
        break;
      case 'clc':
        {
          commandio.emit('clc');
        }
        break;
      case 'available':
        {
          commandio.emit('available');
        }
        break;
      case 'stop':
        {
          commandio.emit('stop');
        }
        break;
      case 'quit':
        {
          nelsonApp.kill();
        }
        break;
      default:
        {
          console.log('unknow message : ' + msg.msgtype);
        }
        break;
    }
  });
  //=============================================================================
}
//=============================================================================
function socketToProcess(socket, process) {
  socket.on('command_received', function () {
    process.send({ msgtype: 'command_received' });
  });

  socket.on('reply', function (data) {
    process.send({ msgtype: 'reply', output: data.output });
  });

  socket.on('prompt', function (data) {
    process.send({ msgtype: 'prompt', output: data });
  });

  socket.on('clc', function () {
    process.send({ msgtype: 'clc' });
  });

  socket.on('quit', function () {
    process.send({ msgtype: 'quit' });
  });

  socket.on('available', function () {
    process.send({ msgtype: 'available' });
  });

  socket.on('unavailable', function () {
    process.send({ msgtype: 'unavailable' });
  });

  socket.on('disconnect', function () {
    process.send({ msgtype: 'disconnect' });
  });

  socket.on('sioemit', function (data) {
    process.send({ msgtype: data.name, output: data.message });
  });
}
//=============================================================================
