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
const { Address4 } = require('ip-address');
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
        break;
      case 'quit':
        // Terminate Nelson application
        nelsonApp?.kill();
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
    const commandio = socketio(port);

    // Find first external IPv4 network interface
    const networkInterfaces = os.networkInterfaces();
    const ipv4 = Object.values(networkInterfaces)
      .flat()
      .find((details) => details.family === 'IPv4' && !details.internal);

    // Throw error if no external IPv4 address found
    if (!ipv4) {
      throw new Error('No external IPv4 address found.');
    }

    // Create address object
    const addr = new Address4(ipv4.address);
    return {
      io: commandio,
      address: `http://${addr.address}:${port}`,
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
    const parameters = CONFIGURATION.USE_DOCKER
      ? CONFIGURATION.DOCKER_PARAMETERS
      : CONFIGURATION.NELSON_APPLICATION_PARAMETERS;

    // Append command address to parameters
    parameters.push(commandAddress);
    return { app, parameters };
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
