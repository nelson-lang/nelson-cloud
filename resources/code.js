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
const socket = io.connect();
//=============================================================================
main(socket);
//=============================================================================
function main(socket) {
  const element = document.getElementById('mainDiv');
  document.getElementById('evaluateButton').disabled = true;
  document.getElementById('stopButton').disabled = true;
  //=============================================================================
  socket.on('initialization', function () {
    const div = document.getElementById('replies');
    div.textContent = '';
    document.getElementById('evaluateButton').disabled = true;
    document.getElementById('stopButton').disabled = true;
    element.style.visibility = 'visible';
  });
  //=============================================================================
  socket.on('clc', function () {
    var div = document.getElementById('replies');
    div.textContent = '';
  });
  //=============================================================================
  socket.on('available', function () {
    element.style.display = 'block';
    document.getElementById('evaluateButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
  });
  //=============================================================================
  socket.on('unavailable', function () {
    document.getElementById('evaluateButton').disabled = true;
    document.getElementById('stopButton').disabled = false;
  });
  //=============================================================================
  socket.on('help', function (url) {
    if (url !== undefined) {
      Object.assign(document.createElement('a'), {
        target: '_blank',
        href: url,
      }).click();
    }
  });
  //=============================================================================
  socket.on('reply', function (data) {
    var div = document.getElementById('replies');
    var str = data.output.replace('\r\n', '\n');
    if (str.includes('\b')) {
      for (var i = 0; i < str.length; i++) {
        div.textContent += str.charAt(i);
        if (str.charAt(i) === '\b') {
          div.textContent = div.textContent.substring(
            0,
            div.textContent.length - 2,
          );
        }
      }
    } else {
      div.textContent += str;
    }

    window.scrollTo(0, document.body.scrollHeight);
  });
  //=============================================================================
  socket.on('send_variable', function (data) {
    const type = 'text/plain;charset=utf-8';
    var obj = JSON.parse(data);
    const filename = 'nelson-result-' + obj.name + '.json';
    download(data, filename, type);
  });
  //=============================================================================
  socket.on('quit', function () {});
}
//=============================================================================
function onStopButton() {
  socket.emit('stop');
}
//=============================================================================
function onEvaluateButton() {
  var command = document.getElementById('command').value;
  if (command !== '') {
    var div = document.getElementById('replies');
    div.textContent = div.textContent + command + '\n';
    document.getElementById('command').value = '';
    socket.emit('command', command);
    document.getElementById('evaluateButton').disabled = true;
    document.getElementById('stopButton').disabled = false;
  }
}
//=============================================================================
function download(data, filename, type) {
  var file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob)
    // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else {
    // Others
    var a = document.createElement('a'),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}
//=============================================================================
