/*
File: main-window-build.js
Description: HyperReload build functions.
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
var APP_SETTINGS = require('../server/app-settings.js')
var FILEUTIL = require('../server/file-util.js')
var MONITOR = require('../server/file-monitor.js')
var BABEL = require('babel-core')
var GLOB = require('glob')
var PATH = require('path')
var FS = require('fs')
var FSEXTRA = require('fs-extra')

/**
 * Functions for building and running apps.
 */
exports.defineBuildFunctions = function(hyper)
{
    // Protect the run button from rapid clicking.
	var mRunAppGuardFlag = false

    var displayBuildResult = function(message)
    {
        console.log('@@@ Build result: ' + message)
        hyper.UI.displayBuildMessage(message)
    }

	// The Run button in the UI has been clicked.
	// Clicking too fast can cause muliple windows
	// to open. Guard against this case.
	hyper.UI.runApp = function(path)
	{
		if (!mRunAppGuardFlag)
		{
			mRunAppGuardFlag = true
			runAppNow(path)
			// Must guard during build, clearing flag below instead.
			//setTimeout(function() { mRunAppGuardFlag = false }, 500)
        console.log('@@@ runApp exit')
		}
        console.log('@@@ runApp exit 2')
	}

    // Run the app.
	var runAppNow = function(path)
	{
		LOGGER.log('[main-window-build.js] runAppNow: ' + path)

        // Stop monitoring files while building.
        MONITOR.stopFileSystemMonitor()

		// Prepend application path if this is not an absolute path.
		var fullPath = hyper.UI.getAppFullPath(path)

        buildAppIfNeeded(fullPath, null, buildCallback)

        function buildCallback(error)
        {
        console.log('@@@ buildCallback: ' + error)
            if (error)
            {
                // Display the build error.
                displayBuildResult(error.message)
            }
            else
            {
                // Run the app.
                runApp()
            }

        console.log('@@@ runAppNow 2')

			// Start monitoring so that live reload will work.
			// TODO: Enable when montor file paths are fixed.
			// MONITOR.startFileSystemMonitor()

        console.log('@@@ runAppNow 3')
            // Clear guard flag.
            setTimeout(function() { mRunAppGuardFlag = false;
        console.log('@@@ runAppNow 4') }, 200)
        }

        function runApp()
        {
        console.log('@@@ runAppNow runApp : ' + path)
            if (hyper.UI.mNumberOfConnectedClients <= 0)
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
        console.log('@@@ runAppNow runApp exit')
		}
	}


	/**
	 * @param fullPath - the project folder root.
	 */
    var buildAppIfNeeded = function(fullPath, changedFiles, buildCallback)
    {
        console.log('@@@ buildAppIfNeeded fullPath: ' + fullPath)

        // Standard HTML file project.
	    if (FILEUTIL.fileIsHTML(fullPath))
	    {
	        // Set server paths using the location of the HTML file.
	        var appBasePath = PATH.dirname(fullPath)
	        var indexFile = PATH.basename(fullPath)
		    SERVER.setAppPath(appBasePath)
		    SERVER.setAppFileName(indexFile)
		    // Set app id, will create evothings.json with new id if not existing.
		    SERVER.setAppID(APP_SETTINGS.getAppID(appBasePath))
		    MONITOR.setBasePath(appBasePath)

		    // No build performed when running an HTML file project.
            buildCallback(null)
            return
	    }
	    // Project specified by directory with evothings.json.
	    else if (FILEUTIL.fileIsDirectory(fullPath))
	    {
	        // Get app to run from evothings.json.
	        var indexFile = APP_SETTINGS.getIndexFile(fullPath)
	        if (!indexFile)
	        {
	            // Error.
	            evothingsSettingMissingError()
	            return
	        }

	        // Get www dir.
	        var wwwDir = APP_SETTINGS.getWwwDir(fullPath)
	        if (!wwwDir)
	        {
	            // Error.
	            evothingsSettingMissingError()
	            return
	        }

	        // Set server www path. Build continues below.
		    SERVER.setAppPath(PATH.join(fullPath, wwwDir))
		    SERVER.setAppFileName(indexFile)
		    SERVER.setAppID(APP_SETTINGS.getAppID(fullPath))
		    MONITOR.setBasePath(fullPath)
	    }
	    else
	    {
	        // Error.
	        evothingsSettingMissingError()
	        return
	    }

	    // Get app source dir from evothings.json.
	    var appDir = APP_SETTINGS.getAppDir(fullPath)
	    if (!appDir)
	    {
	        // Error.
	        evothingsSettingMissingError()
	        return
	    }

		// Path to source files.
		var srcPath = PATH.join(fullPath, appDir)

		// Path where files are served.
		var destPath = PATH.join(fullPath, wwwDir)

		// Build project
		buildApp(srcPath, destPath, buildDone)

		function buildDone(error)
        {
            console.log('Build done')

            if (error)
            {
	            callCallbackWithError(error)
            }
            else
            {
                buildCallback()
            }
        }

        function evothingsSettingMissingError()
        {
	        callCallbackWithError(
	            'evothings.json is missing or index-file entry is missing: '
	            + fullPath)
	    }

        function callCallbackWithError(errorMessage)
        {
	        buildCallback({ message: errorMessage })
	    }
    }

	var buildApp = function(sourcePath, destPath, doneCallback)
	{
		console.log('buildApp: ' + sourcePath)

        var options =
        {
            follow: false,
            nomount: true,
            nodir: true,
            root: sourcePath
        }
        var sourceFiles = GLOB.sync('/**/*', options)

        console.log('@@@ globbed files: ' + sourceFiles.length)
        for (var i = 0; i < sourceFiles.length; ++i)
        {
            console.log('  ' + sourceFiles[i])
        }

        buildAppFiles(sourcePath, sourceFiles, destPath, doneCallback)
	}

	var buildAppFiles = function(sourcePath, sourceFiles, destPath, doneCallback)
	{
		console.log('buildAppFiles')

		function buildNextFile()
		{
			// Is build done?
			if (0 == sourceFiles.length)
			{
		        console.log('buildAppFiles done')
				doneCallback()
				return
			}

			// Build next file.
			var filePath = sourceFiles.pop()
			var fullSourcePath = PATH.join(sourcePath, filePath)
			var fullDestPath = PATH.join(destPath, filePath)

		    console.log('@@@ buildNextFile: ' + fullSourcePath)

		    buildAppFile(
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
			    doneCallback(error)
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

        // Start building files.
		buildNextFile()
	}

	var buildAppFile = function(fullSourcePath, fullDestPath, resultCallback)
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

		    // Disable strict mode.
		    if (data)
		    {
		        data = data.replace("'use strict';", '')
		    }

            //console.log('buildJsComplete: ' + data)

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
/*
	// Live reload.
	hyper.UI.reloadApp = function(changedFiles)
	{
		console.log('@@@reloadApp: ' + changedFiles[0])
		LOGGER.log('[main-window-build.js] reloadApp')

		// Build project (optionally)
		// TODO: Check settings in evothings.json
		hyper.UI.buildAppFiles(
		    sourcePath, sourceFiles, destPath, successFun, errorFun)
		hyper.UI.buildAppFiles(
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
*/
}

