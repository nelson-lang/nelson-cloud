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
const io = require('socket.io-client');
//=============================================================================
const defaultTimeout = 4;
const longerTimeout = 8;
//=============================================================================
var socket;
//=============================================================================
jest.setTimeout(30000);
//=============================================================================
beforeEach(function (done) {
  setTimeout(() => {
    socket = io.connect('http://localhost:9090', {
      serveClient: false,
      'reconnection delay': 0,
      'reopen delay': 0,
      'force new connection': true,
    });
    socket.on('connect', function () {
      done();
    });
    socket.on('disconnect', function () {
      done();
    });
  }, longerTimeout);
});
//=============================================================================
afterEach(function (done) {
  setTimeout(() => {
    if (socket.connected) {
      socket.disconnect();
    } else {
    }
    done();
  }, longerTimeout);
});
//=============================================================================
describe('Nelson SocketIO tests', function () {
  //=============================================================================
  it('should receive connect and send available.', function (done) {
    setTimeout(() => {
      socket.on('available', function (data) {
        done();
      });
    }, longerTimeout);
  });
  //=============================================================================
  it('should receive unavailable during computation.', function (done) {
    setTimeout(() => {
      socket.on('available', function (data) {
        socket.emit('command', 'A = ones(1000);');
        socket.on('unavailable', function (data) {
          done();
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should receive available after computation.', function (done) {
    setTimeout(() => {
      socket.on('available', function (data) {
        socket.emit('command', 'A = ones(1000);');
        socket.on('unavailable', function () {
          socket.on('available', function () {
            done();
          });
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should receive prompt', function (done) {
    setTimeout(() => {
      socket.on('prompt', function (data) {
        const expectedResult = '>> ';
        expect(data).toEqual(expectedResult);
        done();
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should send an command to nelson and get result (variable exists).', function (done) {
    setTimeout(() => {
      socket.on('available', function (data) {
        socket.emit('command', 'A = 1 + 1;');
        socket.on('available', function () {
          socket.emit('command', "siogetvariable('A')");
          socket.on('send_variable', function (data) {
            try {
              const expectedResult =
                '{"name":"A","exists":true,"type":"double","dims":[1,1],"value":2}';
              expect(data).toEqual(expectedResult);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should send an command to nelson and get result (variable does not exist).', function (done) {
    setTimeout(() => {
      socket.on('available', function () {
        socket.emit('command', "siogetvariable('A')");
        socket.on('send_variable', function (data) {
          try {
            const expectedResult = '{"name":"A","exists":false,"value":[]}';
            expect(data).toEqual(expectedResult);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should send clc command to browser.', function (done) {
    setTimeout(() => {
      socket.on('available', function () {
        socket.emit('command', 'clc');
        socket.on('clc', function () {
          done();
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should stop nelson loop in progress.', function (done) {
    setTimeout(() => {
      socket.on('available', function () {
        socket.emit('command', 'while (true), A = 1, end');
        socket.on('unavailable', function () {
          socket.emit('stop');
          socket.on('available', function () {
            done();
          });
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should return help url to open by web browser.', function (done) {
    setTimeout(() => {
      socket.on('available', function () {
        socket.emit('command', 'doc sin');
        socket.on('help', function (data) {
          try {
            const expectedResult =
              'https://nelson-lang.github.io/nelson-gitbook/releases/en_US/v1.15.0/index.html?open=./trigonometric_functions/sin.html';
            expect(data).toEqual(expectedResult);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
  it('should receive quit message at exit.', function (done) {
    setTimeout(() => {
      socket.on('available', function () {
        socket.emit('command', 'exit');
        socket.on('quit', function () {
          done();
        });
      });
    }, defaultTimeout);
  });
  //=============================================================================
});
//=============================================================================
