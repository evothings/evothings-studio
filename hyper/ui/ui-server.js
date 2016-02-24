/*
File: ui-server.js
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
var LOGGER = require('../server/log.js')
var SERVER = require('../server/file-server.js')
var FILEUTIL = require('../server/file-util.js')
var MONITOR = require('../server/file-monitor.js')
var BABEL = require('babel-core')
var GLOB = require('glob')
var PATH = require('path')

/**
 * Server/IO functions.
 */
exports.defineServerFunctions = function(hyper)
{
	hyper.SERVER = SERVER
	hyper.MONITOR = MONITOR

	var mRunAppGuardFlag = false
	var mNumberOfConnectedClients = 0

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
			hyper.UI.reloadApp(changedFiles)
		})
	}

	hyper.UI.startServer = function()
	{
		// Start server tasks.
		SERVER.connectToRemoteServer()
		MONITOR.setTraverseNumDirectoryLevels(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		MONITOR.startFileSystemMonitor()
	}

	hyper.UI.stopServer = function()
	{
		// Stop server tasks.
		SERVER.disconnectFromRemoteServer()
		MONITOR.stopFileSystemMonitor()
	}

	function clientInfoCallback(message)
	{
		mNumberOfConnectedClients = parseInt(message.data.numberOfConnectedClients, 10)
		hyper.UI.setConnectedCounter(mNumberOfConnectedClients)
	}

	// Called when a connect key is sent from the server.
	function requestConnectKeyCallback(message)
	{
		//LOGGER.log('[ui-server.js] requestConnectKeyCallback called for message')
		//console.dir(message)
		hyper.UI.setConnectKeyTimeout(message.data.timeout)
		hyper.UI.displayConnectKey(message.data.connectKey)
	}

	// Hard-coded for Babel.
	hyper.UI.buildApp = function(rootPath, sourcePath, destPath, successFun, errorFun)
	{
		console.log('buildApp: ' + rootPath)

        var options =
        {
            follow: false,
            nomount: true,
            nodir: true,
            root: PATH.join(rootPath, sourcePath)
        }
        var sourceFiles = GLOB.sync('/**/*', options)

        console.log('globbed files:')
        for (var i = 0; i < sourceFiles.length; ++i)
        {
            console.log('  ' + sourceFiles[i])
        }

        hyper.UI.buildAppFiles(rootPath, sourcePath, sourceFiles, destPath, successFun, errorFun)
	}

	hyper.UI.buildAppFiles = function(rootPath, sourcePath, sourceFiles, destPath, successFun, errorFun)
	{
		console.log('buildAppFiles')

		function buildNextFile()
		{
			// Is build done?
			if (0 == sourceFiles.length)
			{
		        console.log('build done')
				successFun()
				return
			}

			// Build next file.
			var filePath = sourceFiles.pop()
			var fullSourcePath = PATH.join(rootPath, sourcePath, filePath)
			var fullDestPath = PATH.join(rootPath, destPath, filePath)

		    console.log('@@@@@ buildNextFile: ' + fullSourcePath)

		    hyper.UI.buildAppFile(
		        fullSourcePath,
		        fullDestPath,
		        buildFileComplete)
		}

		function buildFileComplete(error, result, fullDestPath)
		{
			if (error)
			{
			    console.log('##### Build error: ' + error.message)

			    // Build terminates here.
			    errorFun(error)
			}
			else if (result)
			{
			    console.log('Build result write')
			    //console.log(result)

                // Save result.
                var encoding = ('string' == typeof result) ? 'utf8' : null
                FSEXTRA.outputFileSync(fullDestPath, result, { encoding: encoding })

			    // Build next file.
			    buildNextFile()
			}
		}

        // TODO: Move.
		function reloadApp()
		{
			// Reload app.
			SERVER.reloadApp()

			// Start monitoring again.
			MONITOR.startFileSystemMonitor()
		}

        // Start building files.
		buildNextFile()
	}

	hyper.UI.buildAppFile = function(fullSourcePath, fullDestPath, resultCallback)
	{
        function buildFile()
        {
        console.log('BuildFile: ' + fullSourcePath)
            // JavaScript.
		    if ('js' == fullSourcePath.substr(-2))
		    {
			    buildJsFile()
		    }
		    else
		    {
		        // Default if to return file data unprocessed.
		        buildFileDefault()
		    }

		    // TODO: Add SASS, add plugin mechanism.
		}

	    function buildJsFile()
	    {

        console.log('buildJsFile')

		    //http://babeljs.io/docs/usage/options/
		    var presetsPath = PATH.join(
		        hyper.UI.getWorkbenchPath(),
		        'node_modules',
		        'babel-preset-es2015')
		    var options =
		    {
		    	"ast": false,
		    	"babelrc": false,
		    	"presets": [presetsPath]
		    }
		    BABEL.transformFile(fullSourcePath, options, buildJsComplete)
		}

		function buildJsComplete(error, result)
		{
        console.log('buildJsComplete')
		    var data = !!result ? result.code : null
        console.log('buildJsComplete: ' + data)
		    resultCallback(error, data, fullDestPath)
		}

	    function buildFileDefault()
	    {
		    var data = FS.readFileSync(fullSourcePath, { encoding: null })
		    resultCallback(null, data, fullDestPath)
		}

        // Build the file.
        buildFile()
	}

	// The Run button in the UI has been clicked.
	// Clicking too fast can cause muliple windows
	// to open. Guard against this case.
	hyper.UI.runApp = function(path)
	{
		if (!mRunAppGuardFlag)
		{
			mRunAppGuardFlag = true
			hyper.UI.runAppNow(path)
			setTimeout(function() { mRunAppGuardFlag = false }, 500)
		}
	}

    // Run the app.
	hyper.UI.runAppNow = function(path)
	{
		LOGGER.log('[ui-server.js] runApp: ' + path)

        MONITOR.stopFileSystemMonitor()

		// Prepend application path if this is not an absolute path.
		var fullPath = hyper.UI.getAppFullPath(path)

		// Path where files are served.
		var wwwPath = PATH.dirname(fullPath)

		// Path for app root.
		var rootPath = PATH.normalize(PATH.join(wwwPath, '../'))

		// Path for monitoring files.
		var monitorPath = rootPath

        // Set www server path.
		SERVER.setAppPath(fullPath)

		// Set files to monitor.
		MONITOR.setBasePath(monitorPath)

		// Build project (optionally)
		// TODO: Check settings in evothings.json
		hyper.UI.buildApp(
		    rootPath,
		    'src',
		    'www',
		    buildAppSuccess,
		    buildAppError)

		function buildAppSuccess()
        {
            console.log('Build app success')

            runApp()

			// Start monitoring.
			MONITOR.startFileSystemMonitor()
        }

		function buildAppError(error)
        {
            console.log('Build app error: ' + error.message)

            // TODO: Display build error window.

			// Start monitoring so that live reload will
			// work when fixing errors.
			MONITOR.startFileSystemMonitor()
        }

        function runApp()
        {
            if (mNumberOfConnectedClients <= 0)
            {
                // This function is defined in hyper-ui.html.
                hyper.UI.noClientConnectedHander()
            }
            else
            {
                // Set active app path (note that this is path, not fullPath).
                hyper.UI.activeAppPath = path

                // Refresh list of my apps.
                hyper.UI.displayAppLists()

                // Otherwise, load the requested file on connected clients.
                SERVER.runApp()
            }
		}
	}

	// Live reload.
	hyper.UI.reloadApp = function(changedFiles)
	{
		console.log('@@@reloadApp: ' + changedFiles[0])
		LOGGER.log('[ui-server.js] reloadApp')

		// Build project (optionally)
		// TODO: Check settings in evothings.json
		hyper.UI.buildAppFiles(
		rootPath, sourcePath, sourceFiles, destPath, successFun, errorFun)
		hyper.UI.buildAppFiles(
		    rootPath,
		    'src',
		    'www',
		    buildAppSuccess,
		    buildAppError)

		function buildAppSuccess()
        {
            console.log('Build app success')

            runApp()

			// Start monitoring.
			MONITOR.startFileSystemMonitor()
        }

		function buildAppError(error)
        {
            console.log('Build app error: ' + error.message)

            // TODO: Display build error window.

			// Start monitoring so that live reload will
			// work when fixing errors.
			MONITOR.startFileSystemMonitor()
        }

        // TODO: Move to file monitor callback.
		function reloadApp()
		{
			// Reload app.
			SERVER.reloadApp()

			// Start monitoring again.
			MONITOR.startFileSystemMonitor()
		}

		hyper.UI.displayProjectList()
    }
}

