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
	// Protect the run button from rapid clicking
	// and guard against concurrent builds.
	var mRunAppGuard = false

	// Full path to current app.
	var mAppFullPath = null

	/**
	 * The Run button in the UI has been clicked.
	 */
	hyper.UI.runApp = function(path)
	{
		if (mRunAppGuard) { return }
		mRunAppGuard = true

		LOGGER.log('[main-window-build.js] runApp: ' + path)

		// Stop monitoring files while building.
		MONITOR.stopFileSystemMonitor()

		// Prepend application path if this is not an absolute path.
		mAppFullPath = hyper.UI.getAppFullPath(path)

		console.log('@@@ runApp')

		// Build the app.
		buildAppIfNeeded(mAppFullPath, null, buildCallback)

		function buildCallback(error)
		{
			if (!error)
			{
				runTheApp()
			}

			// Start monitoring so that live reload will work.
			MONITOR.startFileSystemMonitor()

			// Clear guard flag.
			setTimeout(
				function() {
					mRunAppGuard = false
				},
				200)
		}

		function runTheApp()
		{
			if (hyper.UI.mNumberOfConnectedClients <= 0)
			{
				// This function is defined in hyper-ui.html.
				hyper.UI.noClientConnectedHander()
			}
			else
			{
				// Set active app path (note that this is path, not mFullPath).
				hyper.UI.activeAppPath = path

				// Refresh list of my apps.
				hyper.UI.displayProjectList()

				// Otherwise, load the requested file on connected clients.
				SERVER.runApp()
			}
		}
	}

	/**
	 * Files on the file system has been changed.
	 * Live reload the app.
	 */
	hyper.UI.reloadApp = function(changedFiles)
	{
		console.log('@@@reloadApp: ' + changedFiles[0])
		LOGGER.log('[main-window-build.js] reloadApp')

		if (mRunAppGuard) { return }
		mRunAppGuard = true

		// Stop monitoring files while building.
		MONITOR.stopFileSystemMonitor()

		// Build the app.
		buildAppIfNeeded(mAppFullPath, changedFiles, buildCallback)

		function buildCallback(error)
		{
			if (!error)
			{
				reloadTheApp()
			}

			// Start monitoring so that live reload will work.
			MONITOR.startFileSystemMonitor()

			// Clear guard flag.
			mRunAppGuard = false
		}

		function reloadTheApp()
		{
			// Refresh list of my apps.
			hyper.UI.displayProjectList()

			// Reload app.
			SERVER.reloadApp()
		}
	}

	function displayBuildMessage(message)
	{
		hyper.UI.openBuildMessageDialog()
		hyper.UI.displayBuildMessage(message)
	}

	function closeBuildMessageDialog()
	{
		hyper.UI.closeBuildMessageDialog()
	}

	function displayFloatingAlert(message)
	{
		hyper.UI.displayFloatingAlert(message)

		// Show message also in build dialog in case it is visible.
		hyper.UI.displayBuildMessage(message)
	}

	function closeFloatingAlert()
	{
		hyper.UI.closeFloatingAlert()
	}

	function makeProjectCurrentWithoutBuildingIt(fullPath)
	{
		// Set server paths using the location of the HTML file.
		var appBasePath = PATH.dirname(fullPath)
		var indexFile = PATH.basename(fullPath)
		SERVER.setAppPath(appBasePath)
		SERVER.setAppFileName(indexFile)
		// Set app id, will create evothings.json with new id if not existing.
		SERVER.setAppID(APP_SETTINGS.getAppID(appBasePath))
		MONITOR.setBasePath(appBasePath)
	}

	/**
	 * @param fullPath - the project folder root.
	 */
	function buildAppIfNeeded(fullPath, changedFiles, buildCallback)
	{
		console.log('@@@ buildAppIfNeeded fullPath: ' + fullPath)

		// Standard HTML file project.
		if (FILEUTIL.fileIsHTML(fullPath))
		{
			// No build performed when running an HTML file project.
			makeProjectCurrentWithoutBuildingIt(fullPath)
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
				// Error. Must have index file.
				buildCallback(
					'evothings.json is missing or index-file entry is missing: '
					+ fullPath)
				return
			}

			// Get app source dir from evothings.json.
			var appDir = APP_SETTINGS.getAppDir(fullPath)
			if (!appDir)
			{
				// app dir is missing, run the HTML index file without building.
				var indexFileFullPath = PATH.join(fullPath, indexFile)
				makeProjectCurrentWithoutBuildingIt(indexFileFullPath)
				buildCallback(null)
				return
			}

			// Get www dir.
			var wwwDir = APP_SETTINGS.getWwwDir(fullPath)
			if (!wwwDir)
			{
				// www dir is missing, run the HTML index file without building.
				var indexFileFullPath = PATH.join(fullPath, appDir, indexFile)
				makeProjectCurrentWithoutBuildingIt(indexFileFullPath)
				buildCallback(null)
				return
			}

			// Get list of directories that should not be processed by the build.
			var dontBuildDirs = APP_SETTINGS.getAppDontBuildDirs(fullPath)

			// Set server www path. Build continues below.
			SERVER.setAppPath(PATH.join(fullPath, wwwDir))
			SERVER.setAppFileName(indexFile)
			SERVER.setAppID(APP_SETTINGS.getAppID(fullPath))
			MONITOR.setBasePath(PATH.join(fullPath, appDir))
		}
		else
		{
			// Error.
			buildCallback(
				'Invalid project path: '
				+ fullPath)
			return
		}

		displayFloatingAlert('Building app...')

		// Use timer to allow alert to display.
		setTimeout(function()
		{
			// Path to source files.
			var sourcePath = PATH.join(fullPath, appDir)

			// Path where files are served.
			var destPath = PATH.join(fullPath, wwwDir)

			// Build project.
			var sourceFiles = changedFiles || getAllAppFiles(sourcePath)
			buildAppFiles(sourcePath, sourceFiles, destPath, dontBuildDirs, buildDone)
		}, 10)

		function buildDone(error)
		{
			console.log('Build done')

			if (error)
			{
				closeFloatingAlert()

				// Display the build error.
				displayBuildMessage(error)

				buildCallback(error)
			}
			else
			{
				closeFloatingAlert()

				closeBuildMessageDialog()

				buildCallback()
			}
		}

		function getAllAppFiles(sourcePath)
		{
			console.log('getAllAppFiles: ' + sourcePath)

			var options =
			{
				follow: false,
				nomount: true,
				nodir: true,
				root: sourcePath
			}
			var sourceFiles = GLOB.sync('/**/*', options)

			console.log('@@@ globbed files: ' + sourceFiles.length)

			var normalizedSourceFiles = []

			for (var i = 0; i < sourceFiles.length; ++i)
			{
				// For some weird reason globbed paths begin with two separators.
				// Remove them.
				var path = sourceFiles[i]
				if (0 == path.indexOf(PATH.sep)) { path = path.substr(1) }
				if (0 == path.indexOf(PATH.sep)) { path = path.substr(1) }
				normalizedSourceFiles.push(path)

				console.log('  ' + path)
			}

			return normalizedSourceFiles
		}
	}

	function buildAppFiles(sourcePath, sourceFiles, destPath, dontBuildDirs, doneCallback)
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
			var fullDestFolderPath = PATH.dirname(fullDestPath)

			console.log('buildNextFile: ' + fullSourcePath)

			if (shouldBuildFile(filePath))
			{
				buildAppFile(
					fullSourcePath,
					fullDestFolderPath,
					buildFileComplete)
			}
			else
			{
				copyFile(fullSourcePath, fullDestFolderPath)
				buildNextFile()
			}
		}

		function shouldBuildFile(filePath)
		{
			console.log('@@@ shouldBuildFile filePath: ' + filePath)
			for (var i = 0; i < dontBuildDirs.length; ++i)
			{
				// Does the file path begin with the path in dontBuild?
				if (0 == filePath.indexOf(dontBuildDirs[i]))
				{
					// Don't build this file.
					return false
				}
			}
			// Build the file.
			return true
		}

		function buildFileComplete(error)
		{
			if (error)
			{
				console.log('### Build error: ' + error)

				// Build terminates here.
				doneCallback(error)
			}
			else
			{
				// Build next file.
				buildNextFile()
			}
		}

		// Start building files.
		buildNextFile()
	}

	function buildAppFile(fullSourcePath, fullDestFolderPath, resultCallback)
	{
		console.log('buildAppFile: ' + fullSourcePath)

		try
		{
			var ext = PATH.extname(fullSourcePath).substr(1)
			var pluginPath = '../plugins/build-plugin-' + ext + '.js'
			var plugin = require(pluginPath)
			plugin.build(hyper, fullSourcePath, fullDestFolderPath, resultCallback)
		}
		catch (error)
		{
			if ('MODULE_NOT_FOUND' == error.code)
			{
				console.log('No plugin found - default build')

				// No plugin found, just copy the file to dest.
				copyFile(fullSourcePath, fullDestFolderPath)

				resultCallback()
			}
			else
			{
				console.log('buildAppFile error: ' +  error)
				console.log(error)

				// TODO: Call without error? Remove?
				resultCallback(error)
			}
		}
	}

	/**
	 * Default is to copy the file untouched.
	 */
	function copyFile(fullSourcePath, fullDestFolderPath)
	{
		var data = FS.readFileSync(fullSourcePath, { encoding: null })
		var fullDestPath = PATH.join(fullDestFolderPath, PATH.basename(fullSourcePath))
		FSEXTRA.outputFileSync(fullDestPath, data, { encoding: null })
	}
}
