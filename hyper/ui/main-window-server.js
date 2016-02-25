/*
File: main-window-server.js
Description: HyperReload server-related UI functions.
Author: Mikael Kindborg

License:

Copyright (c) 2013-2014 Mikael Kindborg

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*** Imported modules ***/

var SETTINGS = require('../settings/settings.js')
var SERVER = require('../server/file-server.js')
var MONITOR = require('../server/file-monitor.js')
var LOGGER = require('../server/log.js')

/**
 * Server/IO functions.
 */
exports.defineServerFunctions = function(hyper)
{
	hyper.SERVER = SERVER
	hyper.MONITOR = MONITOR

	hyper.UI.mNumberOfConnectedClients = 0

	// Initialize the file server (the socket.io client
	// that handles file requests).
	hyper.UI.setupServer = function()
	{
		SERVER.setClientInfoCallbackFun(clientInfoCallback)
		SERVER.setRequestConnectKeyCallbackFun(requestConnectKeyCallback)

		MONITOR.setFileSystemChangedCallbackFun(function(changedFiles)
		{
		    // TODO: Update.
			// Build changed files and reload.

			// TODO: ENABLE!
			// hyper.UI.reloadApp(changedFiles)
		})
	}

	hyper.UI.startServer = function()
	{
		// Start server tasks.
		SERVER.connectToRemoteServer()
		MONITOR.setTraverseNumDirectoryLevels(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		// Starts when clicking Run, do not start here.
		//MONITOR.startFileSystemMonitor()
	}

	hyper.UI.stopServer = function()
	{
		// Stop server tasks.
		SERVER.disconnectFromRemoteServer()
		MONITOR.stopFileSystemMonitor()
	}

	function clientInfoCallback(message)
	{
		hyper.UI.mNumberOfConnectedClients = parseInt(message.data.numberOfConnectedClients, 10)
		hyper.UI.setConnectedCounter(hyper.UI.mNumberOfConnectedClients)
	}

	// Called when a connect key is sent from the server.
	function requestConnectKeyCallback(message)
	{
		//LOGGER.log('[main-window-server.js] requestConnectKeyCallback called for message')
		//console.dir(message)
		hyper.UI.setConnectKeyTimeout(message.data.timeout)
		hyper.UI.displayConnectKey(message.data.connectKey)
	}
}

