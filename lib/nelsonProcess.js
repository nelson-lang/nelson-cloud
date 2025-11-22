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
// Import required modules
const CONFIGURATION = require('../etc/configuration.json');
const { spawn } = require('child_process');
const { Address4, Address6 } = require('ip-address');
const socketio = require('socket.io');
const os = require('os');
//=============================================================================
// Start the Nelson process
startNelsonProcess();
//=============================================================================
// Define frozen object of socket event types to ensure consistency
const SOCKET_EVENTS = Object.freeze({
  PROMPT: 'prompt', // Handling user prompts
  CLC: 'clc', // Clear console event
  QUIT: 'quit', // Quit application event
  AVAILABLE: 'available', // Application availability status
  UNAVAILABLE: 'unavailable',
  DISCONNECT: 'disconnect', // Socket disconnection
  SIOEMIT: 'sioemit', // Socket IO emit event
  COMMAND_RECEIVED: 'command_received', // Command received acknowledgment
  REPLY: 'reply', // Response to a command
});
//=============================================================================
/**
 * Main function to start and manage the Nelson process
 * Handles inter-process communication via Socket.IO
 */
function startNelsonProcess() {
  let io = []; // Array to store socket connections
  let nelsonApp; // Child process running Nelson application
  let commandio; // Socket.IO instance for command communication
  let hasCleaned = false;

  function cleanup(terminateNelson = false) {
    if (hasCleaned) {
      return;
    }
    hasCleaned = true;
    if (terminateNelson) {
      nelsonApp?.kill();
    }
    commandio?.close?.();
    commandio = undefined;
    nelsonApp = undefined;
  }

  process.once('SIGINT', () => cleanup(true));
  process.once('SIGTERM', () => cleanup(true));
  process.once('disconnect', () => cleanup(true));
  process.once('exit', () => cleanup());
  // Listen for messages from the parent process
  process.on('message', (msg) => {
    switch (msg.msgtype) {
      case 'initialization':
        // Initialize socket and start Nelson application
        handleInitialization(msg.id);
        break;
      case 'command':
        // Forward command to Nelson application
        commandio?.emit('command', { data: msg.data });
        break;
      case 'prompt':
        // Handle user prompt
        console.log(`emit prompt ${msg.data}`);
        commandio?.emit('prompt', msg.data);
        break;
      case 'clc':
        // Clear console
        commandio?.emit('clc');
        break;
      case 'available':
        // Set application as available
        commandio?.emit('available');
        break;
      case 'stop':
        // Stop the application
        commandio?.emit('stop');
        cleanup(true);
        break;
      case 'quit':
        // Terminate Nelson application
        cleanup(true);
        break;
      default:
        // Log unknown message types
        console.warn(`Unknown message: ${msg.msgtype}`);
    }
  });
  //=============================================================================
  /**
   * Initialize socket connection and start Nelson application
   * @param {number} port - Port number for socket connection
   */
  function handleInitialization(port) {
    hasCleaned = false;
    // Set up socket connection
    const { io: socketIOInstance, address: commandAddress } =
      initializeSocket(port);
    commandio = socketIOInstance;

    // Bind socket events to process
    commandio.on('connection', (socket) => {
      bindSocketToProcess(socket, process);
    });

    // Determine and spawn Nelson application
    const { app, parameters } = getAppAndParameters(commandAddress);
    nelsonApp = spawn(app, parameters);
    nelsonApp.on('exit', (code, signal) => {
      process.send?.({ msgtype: 'process_exit', code, signal });
      cleanup();
    });
    nelsonApp.on('error', (error) => {
      process.send?.({ msgtype: 'process_error', error: error.message });
    });

    // Handle socket disconnection
    commandio.on('disconnect', () => {
      console.info('Socket disconnected');
    });
  }
  //=============================================================================
  /**
   * Initialize Socket.IO with a given port and find local IPv4 address
   * @param {number} port - Port number to use for socket connection
   * @returns {Object} Socket.IO instance and command address
   */
  function initializeSocket(port) {
    // Create Socket.IO instance
    const ioInstance = socketio(port);
    const addressInfo = resolveNetworkAddress();
    const addressString =
      addressInfo.family === 'IPv6'
        ? `http://[${addressInfo.address.correctForm()}]:${port}`
        : `http://${addressInfo.address.address}:${port}`;
    return {
      io: ioInstance,
      address: addressString,
    };
  }
  //=============================================================================
  /**
   * Determine application and its parameters based on configuration
   * @param {string} commandAddress - Socket connection address
   * @returns {Object} Application path and parameters
   */
  function getAppAndParameters(commandAddress) {
    // Choose between Docker or native application based on configuration
    const app = CONFIGURATION.USE_DOCKER
      ? CONFIGURATION.DOCKER
      : CONFIGURATION.NELSON_APPLICATION;

    // Get corresponding parameters
    const baseParameters = CONFIGURATION.USE_DOCKER
      ? CONFIGURATION.DOCKER_PARAMETERS
      : CONFIGURATION.NELSON_APPLICATION_PARAMETERS;

    const parameters = [...(baseParameters ?? []), commandAddress];
    return { app, parameters };
  }
  //=============================================================================
  /**
   * Resolve network address for the socket connection
   * Favors IPv4 over IPv6, and external over internal addresses
   * @returns {Object} Resolved address and family (IPv4/IPv6)
   */
  function resolveNetworkAddress() {
    const interfaces = Object.values(os.networkInterfaces())
      .flat()
      .filter(Boolean);
    const candidate =
      interfaces.find((details) => details.family === 'IPv4' && !details.internal) ??
      interfaces.find((details) => details.family === 'IPv6' && !details.internal) ??
      interfaces.find((details) => details.family === 'IPv4') ??
      interfaces.find((details) => details.family === 'IPv6');

    if (!candidate || typeof candidate.address !== 'string') {
      throw new Error('No network address available.');
    }

    const addressValue = candidate.address.includes('%')
      ? candidate.address.split('%')[0]
      : candidate.address;

    const address =
      candidate.family === 'IPv6'
        ? new Address6(addressValue)
        : new Address4(addressValue);

    return { address, family: candidate.family };
  }
  //=============================================================================
}
//=============================================================================
/**
 * Bind socket events to the main process
 * Enables communication between socket and parent process
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Process} process - Parent process
 */
function bindSocketToProcess(socket, process) {
  // Map socket events to process messages
  socket.on(SOCKET_EVENTS.COMMAND_RECEIVED, () => {
    process.send({ msgtype: SOCKET_EVENTS.COMMAND_RECEIVED });
  });

  socket.on(SOCKET_EVENTS.REPLY, (data) => {
    process.send({ msgtype: SOCKET_EVENTS.REPLY, output: data.output });
  });

  socket.on(SOCKET_EVENTS.PROMPT, (data) => {
    process.send({ msgtype: SOCKET_EVENTS.PROMPT, output: data });
  });

  socket.on(SOCKET_EVENTS.CLC, () => {
    process.send({ msgtype: SOCKET_EVENTS.CLC });
  });

  socket.on(SOCKET_EVENTS.QUIT, () => {
    process.send({ msgtype: SOCKET_EVENTS.QUIT });
  });

  socket.on(SOCKET_EVENTS.AVAILABLE, () => {
    process.send({ msgtype: SOCKET_EVENTS.AVAILABLE });
  });

  socket.on(SOCKET_EVENTS.UNAVAILABLE, () => {
    process.send({ msgtype: SOCKET_EVENTS.UNAVAILABLE });
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    process.send({ msgtype: SOCKET_EVENTS.DISCONNECT });
  });

  socket.on(SOCKET_EVENTS.SIOEMIT, (data) => {
    process.send({ msgtype: data.name, output: data.message });
  });
}
//=============================================================================
