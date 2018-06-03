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
'use strict';
//=============================================================================
const configuration = require('../etc/configuration.json');
const express = require('express');
const http = require('http');
const path = require('path');
//=============================================================================
function NelsonWebServer() {
  const app = express();
  const server = http.createServer(app);

  // eslint-disable-next-line no-unused-vars
  app.get('/', function(req, res, next) {
    const indexHtmlFile = path.join(__dirname, configuration.INDEX_HTML);
    res.sendFile(indexHtmlFile);
  });

  server.listen(configuration.PORT);
  // eslint-disable-next-line no-console
  console.log('http://localhost:' + configuration.PORT);
}
//=============================================================================
module.exports = { NelsonWebServer };
//=============================================================================
