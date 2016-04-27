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
var EVENTS = require('../server/system-events.js')
var FS = require('fs')
var APP_SETTINGS = require('../server/app-settings.js')


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
			// Build changed files and reload.
			//
			// Intercept _filesync directory files and let them go to file upload without reload
			//
			console.log('-- changed files callback --')
			console.dir(changedFiles)
			var syncFiles = []
			var normalFiles = []
			changedFiles.forEach(function(filepath)
			{
				if(filepath.indexOf('_filesync') > -1)
				{
					syncFiles.push(filepath)
				}
				else
				{
					normalFiles.push(filepath)
				}
			})
			//
			//
			if(normalFiles.length > 0)
			{
				hyper.UI.reloadApp(changedFiles)
			}
			if(syncFiles.length > 0)
			{
				console.log('sync files detected!!')
				console.dir(syncFiles)

				syncFiles.forEach(function(path)
				{
					var ap = SERVER.getBasePath()
					if(ap.indexOf('/www'))
					{
						ap = ap.replace('/www','/app')
					}
					var fullPath = ap+'/'+path

					console.log('+++++++++++++++++++++++ fullPath')
					console.dir(fullPath)
					var name = path.substring(path.lastIndexOf('/'+1, path.length))
					try
					{
						var filedata = FS.readFileSync(fullPath, 'base64')
						var stat = FS.statSync(fullPath)
						console.log('stat for '+name)
						console.log(JSON.stringify(stat))
						console.log('data for '+name)
						console.dir(filedata)
						if(path.indexOf('.js') > -1)
						{
							//SERVER.executeFileData(data, {})
							EVENTS.publish(EVENTS.EXECUTEFILEDATA,{file: filedata, viewer:{}} )
						}
						else
						{
							//var data = new Buffer(filedata, 'binary').toString('base64')
							var escapedata= escape(encodeURIComponent(filedata))
							//var file = {name:name , size: stat.size, data: window.btoa(escapedata)}
							var file = {name:name , size: stat.size, data: escapedata}
							//SERVER.injectFileData(file, {})
							EVENTS.publish(EVENTS.INJECTFILEDATA,{file: file, viewer:{}} )
						}
					}
					catch(e)
					{
						console.log('*** main-window-server caught exception for file reference: '+e)
					}
					MONITOR.startFileSystemMonitor()
				})
			}
		})
	}

	hyper.UI.startServer = function()
	{
		// Start server tasks.
		SERVER.connectToRemoteServer()
		MONITOR.setTraverseNumDirectoryLevels(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
	}

	hyper.UI.stopServer = function()
	{
		// Stop server tasks.
		SERVER.disconnectFromRemoteServer()
		MONITOR.stopFileSystemMonitor()
	}

	function clientInfoCallback(message)
	{
		LOGGER.log('[main-window-server.js] clientInfoCallback called')
		hyper.UI.mNumberOfConnectedClients = parseInt(message.data.numberOfConnectedClients, 10)
		hyper.UI.setConnectedCounter(hyper.UI.mNumberOfConnectedClients)
	}

	// Called when a connect key is sent from the server.
	function requestConnectKeyCallback(message)
	{
		LOGGER.log('[main-window-server.js] requestConnectKeyCallback called for message')
		//console.dir(message)
		hyper.UI.setConnectKeyTimeout(message.data.timeout)
		hyper.UI.displayConnectKey(message.data.connectKey)
	}
}

