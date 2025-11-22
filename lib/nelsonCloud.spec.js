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
const EventEmitter = require('events');
const {
  __test__: { child_on, child_emit },
} = require('./nelsonSocketIO');
//=============================================================================
class MockSocket extends EventEmitter {
  constructor(session = undefined) {
    super();
    this.session = session;
  }
}
//=============================================================================
describe('child_on', () => {
  function createHarness(session) {
    const socket = new MockSocket(session);
    const child = { send: jest.fn() };
    const ios = { emit: jest.fn() };
    child_on(socket, child, ios);
    return { socket, child, ios };
  }

  test.each([
    ['command', 'disp(42);', { msgtype: 'command', data: 'disp(42);' }],
    ['clc', undefined, { msgtype: 'clc' }],
    ['stop', undefined, { msgtype: 'stop' }],
    ['available', undefined, { msgtype: 'available' }],
    ['unavailable', undefined, { msgtype: 'unavailable' }],
    ['disconnect', undefined, { msgtype: 'quit' }],
  ])(
    'forwards %s events to the child process',
    (eventName, payload, expected) => {
      const { socket, child } = createHarness();
      if (payload === undefined) {
        socket.emit(eventName);
      } else {
        socket.emit(eventName, payload);
      }
      expect(child.send).toHaveBeenCalledTimes(1);
      expect(child.send).toHaveBeenCalledWith(expected);
    },
  );

  it('emits reply events through io with inferred sender name when missing', () => {
    const { socket, ios } = createHarness({ name: 'session-1' });
    const payload = { text: 'Hello' };
    socket.emit('reply', payload);
    expect(ios.emit).toHaveBeenCalledWith('reply', {
      text: 'Hello',
      from: 'session-1',
    });
    expect(payload).toEqual({ text: 'Hello' });
  });

  it('preserves explicit sender information on reply events', () => {
    const { socket, ios } = createHarness({ name: 'session-1' });
    const payload = { text: 'Hello', from: 'user-provided' };
    socket.emit('reply', payload);
    expect(ios.emit).toHaveBeenCalledWith('reply', payload);
  });

  it('broadcasts variables retrieved from nelson', () => {
    const { socket, ios } = createHarness();
    const variablePayload = { name: 'A', value: 42 };
    socket.emit('send_variable', variablePayload);
    expect(ios.emit).toHaveBeenCalledWith('send_variable', variablePayload);
  });

  it('broadcasts quit instructions to all listeners', () => {
    const { socket, ios } = createHarness();
    socket.emit('quit');
    expect(ios.emit).toHaveBeenCalledWith('quit');
  });
});
//=============================================================================
describe('child_emit', () => {
  test.each([
    [{ msgtype: 'command_received' }, (msg) => ['command_received']],
    [{ msgtype: 'prompt', output: '>> ' }, (msg) => ['prompt', msg.output]],
    [{ msgtype: 'reply', output: 'payload' }, (msg) => ['reply', msg]],
    [{ msgtype: 'clc' }, (msg) => ['clc']],
    [{ msgtype: 'stop' }, (msg) => ['stop']],
    [{ msgtype: 'available' }, (msg) => ['available']],
    [{ msgtype: 'unavailable' }, (msg) => ['unavailable']],
    [{ msgtype: 'quit' }, (msg) => ['quit']],
    [
      { msgtype: 'custom', output: 'value' },
      (msg) => [msg.msgtype, msg.output],
    ],
  ])('emits %p through the provided socket', (message, expectedFactory) => {
    const socket = { emit: jest.fn() };
    child_emit(socket, message);
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith(...expectedFactory(message));
  });
});
//=============================================================================
