//=============================================================================
// Copyright (c) 2016-2018 Allan CORNET (Nelson)
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
var io = require('socket.io-client');
//=============================================================================
describe('Suite of unit tests', function() {
  var socket;
  //=============================================================================
  beforeEach(function(done) {
    setTimeout(() => {
      socket = io.connect(
        'http://localhost:9090',
        {
          'reconnection delay': 0,
          'reopen delay': 0,
          'force new connection': true
        }
      );
      socket.on('connect', function() {
        done();
      });
      socket.on('disconnect', function() {
        done();
      });
    }, 50);
  });
  //=============================================================================
  afterEach(function(done) {
    setTimeout(() => {
      if (socket.connected) {
        socket.disconnect();
      } else {
      }
      done();
    }, 50);
  });
  //=============================================================================
  describe('Nelson SocketIO tests', function() {
    //=============================================================================
    it('should receive connect and send available.', function(done) {
      setTimeout(() => {
        socket.on('available', function(data) {
          done();
        });
      }, 50);
    });
    //=============================================================================
    it('should receive unavailable during computation.', function(done) {
      setTimeout(() => {
        socket.on('available', function(data) {
          socket.emit('command', 'A = ones(1000);');
          socket.on('unavailable', function(data) {
            done();
          });
        });
      }, 50);
    });
    //=============================================================================
    it('should receive available after computation.', function(done) {
      setTimeout(() => {
        socket.on('available', function(data) {
          socket.emit('command', 'A = ones(1000);');
          socket.on('unavailable', function() {
            socket.on('available', function() {
              done();
            });
          });
        });
      }, 50);
    });
    //=============================================================================
    it('should send an command to nelson and get result (variable exists).', function(done) {
      setTimeout(() => {
        socket.on('available', function(data) {
          socket.emit('command', 'A = 1 + 1;');
          socket.on('available', function() {
            socket.emit('command', "siogetvariable('A')");
            socket.on('send_variable', function(data) {
              try {
                const expectedResult = '{"name":"A","exists":true,"value":2}';
                expect(data).toEqual(expectedResult);
                done();
              } catch (e) {
                done(e);
              }
            });
          });
        });
      }, 50);
    });
    //=============================================================================
    it('should send an command to nelson and get result (variable does not exist).', function(done) {
      setTimeout(() => {
        socket.on('available', function() {
          socket.emit('command', "siogetvariable('A')");
          socket.on('send_variable', function(data) {
            try {
              const expectedResult = '{"name":"A","exists":false,"value":[]}';
              expect(data).toEqual(expectedResult);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      }, 50);
    });
    //=============================================================================
  });
});
//=============================================================================
