/*
File: main-window-func.js
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

var PATH = require('path')
var OS = require('os')
var PATH = require('path')
var FSEXTRA = require('fs-extra')
var FILEUTIL = require('../server/file-util.js')
var EVENTS = require('../server/system-events.js')
var APP_SETTINGS = require('../server/app-settings.js')
var SETTINGS = require('../settings/settings.js')
var LOGGER = require('../server/log.js')
var SERVER = require('../server/file-server.js')
var MONITOR = require('../server/file-monitor.js')
var BABEL = require('babel-core')
var GLOB = require('glob')

/**
 * UI functions.
 */
exports.defineUIFunctions = function(hyper)
{
	var mWorkbenchWindow = null
	var mConnectKeyTimer
	var mProjectList = []
	var mExampleList = []
	var mWorkbenchPath = process.cwd()

	hyper.UI.setupUI = function()
	{
		createSystemMenuForOSX()
		styleUI()
		setUIActions()
		setWindowActions()
		setUpFileDrop()
		restoreSavedUIState()
		initAppLists()
	}

	function initAppLists()
	{
		readExampleList()
		readProjectList()
		hyper.UI.displayAppLists()
		hyper.UI.setServerMessageFun()
	}

	// System menus must be explicitly created on OS X,
	// see node-webkit documentation:
	// https://github.com/rogerwang/node-webkit/wiki/Menu#menucreatemacbuiltinappname
	function createSystemMenuForOSX()
	{
		if ('darwin' == OS.platform())
		{
			try
			{
				var appName = getApplicationName()
				var win = hyper.UI.GUI.Window.get()
				var nativeMenuBar = new hyper.UI.GUI.Menu({ type: 'menubar' })
				nativeMenuBar.createMacBuiltin(appName)
				win.menu = nativeMenuBar;
			}
			catch (ex)
			{
				LOGGER.log('[main-window-func.js] Error creating OS X menubar: ' + ex.message);
			}
		}
	}

	// Helper function that returns the application name
	// specified in package.json.
	function getApplicationName()
	{
		var data = FILEUTIL.readFileSync('package.json')
		var applicationName = JSON.parse(data).name
		return applicationName
	}

	function styleUI()
	{
		// Put some content into connect key field to make field visible.
		// Skip for now. hyper.UI.displayConnectKey('Click "Get Key"')

		// Apply jQuery UI button style.
		//hyper.UI.$('button').button()

		// Set layout properties.
		/*
		hyper.UI.$('body').layout(
		{
			west: { size: 400 },
			center: { maskContents: true },
			fxName: 'none'
		})
		*/
	}

	function setUIActions()
	{
		// Enable reorder of project list by drag and drop.
		hyper.UI.$(function()
		{
			hyper.UI.$('#screen-projects').sortable(
			{
				stop: function()
				{
					updateProjectList()
				}
			})
			hyper.UI.$('#screen-projects').disableSelection()
		})

		// Message handler.
		window.addEventListener('message', receiveMessage, false)

		// Display of file monitor counter.
		setInterval(function() {
			hyper.UI.displayNumberOfMonitoredFiles() },
			1500)
	}

	function setWindowActions()
	{
		// Listen to main window's close event
		hyper.UI.GUI.Window.get().on('close', function()
		{
			try
			{
				saveUIState()

				if (mWorkbenchWindow && !mWorkbenchWindow.closed)
				{
					mWorkbenchWindow.window.saveUIState()
				}
			}
			catch(e)
			{
				// app is closing; no way to handle errors beyond logging them.
				LOGGER.log('[main-window-func.js] Error on window close: ' + e);
			}

			hyper.UI.GUI.App.quit()
		})
	}

	function saveUIState()
	{
		var win = hyper.UI.GUI.Window.get()

		// Do not save if window is minimized on Windows.
		// On Windows an icon has x,y coords -32000 when
		// window is minimized. On Linux and OS X the window
		// coordinates and size are intact when minimized.
		if (win.x < -1000)
		{
			return;
		}

		SETTINGS.setProjectWindowGeometry({
			x: win.x,
			y: win.y,
			width: win.width,
			height: win.height
			})
	}

	function restoreSavedUIState()
	{
		var geometry = SETTINGS.getProjectWindowGeometry()
		if (geometry)
		{
			var win = hyper.UI.GUI.Window.get()

			// Make sure top-left corner is visible.
			var offsetY = 0
			if ('darwin' == OS.platform())
			{
				offsetY = 22
			}
			geometry.x = Math.max(geometry.x, 1)
			geometry.y = Math.max(geometry.y, 1 + offsetY)
			geometry.x = Math.min(geometry.x, hyper.UI.DOM.screen.width - 100)
			geometry.y = Math.min(geometry.y, hyper.UI.DOM.screen.height - 200)

			// Set window size.
			win.x = geometry.x
			win.y = geometry.y
			win.width = geometry.width
			win.height = geometry.height
		}
		// Restore remember me state for logout action
		var checked = SETTINGS.getRememberMe()
		hyper.UI.$('#remember-checkbox').attr('checked', checked)
	}

	function receiveMessage(event)
	{
		//LOGGER.log('[main-window-func.js] Main got : ' + event.data.message)
		if ('eval' == event.data.message)
		{
			hyper.SERVER.evalJS(event.data.code)
		}
		else if ('setSession' == event.data.message)
		{
			LOGGER.log('[main-window-func.js] ==== session set to '+event.data.sid)
		}
	}

	function setUpFileDrop()
	{
		var originalDropTaget = null

		// Block change page on drop.
		window.ondragover = function(e) { e.preventDefault(); return false }
		window.ondragend = function(e) { e.preventDefault(); return false }
		window.ondrop = function(e) { e.preventDefault(); return false }

		// Set up drop handling using a drop target overlay area.
		var dropTarget = hyper.UI.$('#panel-page')
		var enterTarget;
		dropTarget.on('dragenter', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			hyper.UI.showTab('projects')
			hyper.UI.$('#drag-overlay').show()
			enterTarget = e.target
		})
		dropTarget.on('dragleave', function(e)
		{
			if (enterTarget == e.target) {
				e.stopPropagation()
				e.preventDefault()
				hyper.UI.$('#drag-overlay').hide()
			}
		})
		dropTarget.on('drop', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			hyper.UI.$('#drag-overlay').hide()
			handleFileDrop(e.originalEvent.dataTransfer.files)
		})
	}

	function handleFileDrop(files)
	{
		// Debug print.

		console.log('@@@@@@@ handleFileDrop');

		for (var i = 0; i < files.length; ++i)
		{
			console.log(files[i].path);
		}


		for (var i = 0; i < files.length; ++i)
		{
			var path = files[i].path
			if (pathIsValidAppPath(path))
			{
				console.log('@@@@@@@ hyper.UI.addProject: ' + path);

				hyper.UI.addProject(path)
			}
			else
			{
				alert('Only evothings.json or HTML files (extension .html or .htm) can be used')
				break;
			}
		}

		hyper.UI.displayProjectList()
	}

    function pathIsValidAppPath(path)
    {
        return FILEUTIL.fileIsHTML(path) ||
            FILEUTIL.fileIsEvothingsSettings(path) ||
            FILEUTIL.fileIsDirectory(path)
    }

	/**
	 * Possible options include:
	 *	 options.screen
	 *	 options.copyButton
	 *	 options.openButton
	 *	 options.deleteButton
	 */
	function createProjectEntry(path, options)
	{
		console.log('@@@@ CREATE PROJ ENTRY: ' + path)

		options = options || {}

		// Create div tag for app items.
		var html = '<div class="project-entry ui-state-default ui-corner-all"'

		// Set background color of active app entry.
		if (path == hyper.UI.activeAppPath)
		{
			html += ' style="background-color:#EAFFEA;"'
		}

		// Close opening div tag.
		html += '>'

		// Show app image icon
		var appPath = hyper.UI.getAppFullPath(path)
		var imagePath = APP_SETTINGS.getAppImage(appPath)

		console.log('@@@@ APP PATH: ' + appPath)

		if (imagePath)
		{
			var fullImagePath = PATH.join(appPath, imagePath)
			fullImagePath = fullImagePath.replace(/\\/g, '/')
			html += '<div class="app-icon" style="background-image: url(\'file://' +
				fullImagePath + '\');"></div>'
		}
		else
		{
			// Show a default icon if no image file is provided.
			html += '<div class="app-icon" style="background-image: url(\'images/app-icon.png\');"></div>'
		}

		if (options.copyButton)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="button-open btn et-btn-indigo" '
				+	'onclick="window.hyper.UI.openCopyAppDialog(\'__PATH1__\')">'
				+	'Copy'
				+ '</button>'
		}

		if (options.openButton)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="button-open btn et-btn-blue" '
				+	'onclick="window.hyper.UI.openFileFolder(\'__PATH2__\')">'
				+	'Code'
				+ '</button>'
		}

		// Run button.
		html +=
			'<button '
			+	'type="button" '
			+	'class="button-run btn et-btn-green" '
			+	'onclick="window.hyper.UI.runApp(\'__PATH3__\')">'
			+	'Run'
			+ '</button>'
			+ '<h4>__NAME__</h4>'
			+ '<p>__PATH4__</p>'

		if (options.deleteButton)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="close button-delete" '
				+	'onclick="window.hyper.UI.deleteEntry(this)">'
				+	'&times;'
				+ '</button>'
		}

		html +=
			'<div class="project-list-entry-path" style="display:none;">__PATH5__</div>'
			+ '</div>'

		// Get name of project, use title tag as first choise.
		var name = hyper.UI.getProjectNameFromFile(appPath)
		if (!name)
		{
			LOGGER.log('[main-window-func.js] getProjectNameFromFile failed: ' + appPath)

			// Could not open the app main file, skip this app.
			return
		}

		// Escape any backslashes in the path (needed on Windows).
		var escapedPath = path.replace(/[\\]/g,'\\\\')

		// Replace fields in template.
		html = html.replace('__PATH1__', escapedPath)
		html = html.replace('__PATH2__', escapedPath)
		html = html.replace('__PATH3__', escapedPath)
		html = html.replace('__PATH4__', getShortPathFromPath(path))
		html = html.replace('__PATH5__', path)
		html = html.replace('__NAME__', name)

		// Create element.
		var element = hyper.UI.$(html)
		//LOGGER.log(html)

		// Insert element first in list.
		options.screen && hyper.UI.$(options.screen).append(element)
	}

	function getTagContent(data, tag)
	{
		var tagStart = '<' + tag + '>'
		var tagEnd = '</' + tag + '>'
		var pos1 = data.indexOf(tagStart)
		if (-1 === pos1) { return null }
		var pos2 = data.indexOf(tagEnd)
		if (-1 === pos2) { return null }
		return data.substring(pos1 + tagStart.length, pos2)
	}

	// Use last part of path as name.
	// E.g. '/home/apps/HelloWorld/index.html' -> 'HelloWorld/index.html'
	// Use full path as fallback.
	function getNameFromPath(path)
	{
		path = path.replace(new RegExp('\\' + PATH.sep, 'g'), '/')
		var pos = path.lastIndexOf('/')
		if (-1 === pos) { return path }
		pos = path.lastIndexOf('/', pos - 1)
		if (-1 === pos) { return path }
		return path.substring(pos + 1)
	}

	// Get last part of path. Purpose is to make path fit
	// inside a project list item.
	function getShortPathFromPath(path)
	{
		var limit = 58
		if (path.length < limit)
		{
			return path
		}
		else
		{
			var shortPath = path.substring(path.length - limit, path.length)
			var index1 = shortPath.indexOf('/') // OS X, Linux
			var index2 = shortPath.indexOf('\\') // Windows
			if (index1 > -1)
			{
				return shortPath.substring(index1 + 1)
			}
			else if (index2 > -1)
			{
				return shortPath.substring(index2 + 1)
			}
			else
			{
				// Fallback
				return '...' + shortPath.substring(3, shortPath.length)
			}
		}
	}

	// Project list has been reordered/changed, save new list.
	// Reads data from the DOM tree.
	function updateProjectList()
	{
		var projects = []
		var elements = hyper.UI.$('#screen-projects .project-list-entry-path')
		elements.each(function(index, element)
		{
			var path = hyper.UI.$(element).text()
			if (path != '')
			{
				projects.push(path)
			}
		})
		hyper.UI.setProjectList(projects)
	}

	hyper.UI.getProjectNameFromFile = function(path)
	{
	    //console.log('@@@ getProjectNameFromFile: '  + path)

	    // Is it an HTML file?
	    if (FILEUTIL.fileIsHTML(path))
	    {
	        var indexPath = path
	    }
	    // Is it a directory?
	    else if (FILEUTIL.fileIsDirectory(path))
	    {
	        // Read index file from evothings.json
	        var indexPath = APP_SETTINGS.getIndexFileFullPath(path)
	    }
	    // Is it unknown?
	    else
	    {
			// Return null on unknown file type.
	        return null
	    }

		// Read app main file.
		var data = FILEUTIL.readFileSync(indexPath)
		if (!data)
		{
			//console.log('@@@ readFileSync retruned null for: ' + indexPath)
			// Return null on error.
			return null
		}

		var name = getTagContent(data, 'title')
		if (!name)
		{
			// If title tag is missing, use short form of path as app name.
			name = getNameFromPath(indexPath)
		}

		return name
	}

	function parseProjectList(json)
	{
		// Replace slashes with backslashes on Windows.
		if (process.platform === 'win32')
		{
			json = json.replace(/[\/]/g,'\\\\')
		}

		return JSON.parse(json)
	}

	function readExampleList()
	{
		var list = SETTINGS.getExampleList()
		if (list)
		{
			mExampleList = list
		}
	}

	function readProjectList()
	{
		var list = SETTINGS.getProjectList()
		if (list)
		{
			mProjectList = list
		}
	}

	function saveProjectList()
	{
	    SETTINGS.setProjectList(mProjectList)
	}

	// TODO: Simplify, use updateProjectList instead.
	hyper.UI.addProject = function(path)
	{
	console.log('@@@@@@ Inside hyper.UI.addProject')

	    if (FILEUTIL.fileIsHTML(path))
	    {
	console.log('@@@@@@ HTML')
	        // Add the path, including HTML file, to the project list.
		    mProjectList.unshift(path)
		    saveProjectList()
	    }
	    else if (FILEUTIL.fileIsEvothingsSettings(path))
	    {
	console.log('@@@@@@ EVO.JSON')
	        // Add the folder path to the project list.
		    mProjectList.unshift(PATH.dirname(path))
		    saveProjectList()
	    }
	    else if (FILEUTIL.fileIsDirectory(path))
	    {
	console.log('@@@@@@ DIRECTORY')
	        // Add the path to the project list.
		    mProjectList.unshift(path)
		    saveProjectList()
	    }
	}

	hyper.UI.setProjectList = function(list)
	{
		mProjectList = list
		saveProjectList()
	}

	hyper.UI.getProjectList = function()
	{
		return mProjectList
	}

	hyper.UI.getExampleList = function()
	{
		return mExampleList
	}
	/**
	 * If path is not a full path, make it so. This is
	 * used to make relative example paths full paths.
	 */
	hyper.UI.getAppFullPath = function(path)
	{
		if (!FILEUTIL.isPathAbsolute(path))
		{
			return PATH.join(hyper.UI.getWorkbenchPath(), path)
		}
		else
		{
			return path
		}
	}

	/**
	 * Get path to the Workbench application directory.
	 */
	hyper.UI.getWorkbenchPath = function(path)
	{
		return mWorkbenchPath
	}

	hyper.UI.openFolder = function(path)
	{
		// Convert path separators on Windows.
		if (process.platform === 'win32')
		{
			path = path.replace(/[\/]/g,'\\')
		}

		// Debug logging.
		LOGGER.log('[main-window-func.js] Open folder: ' + path)

		hyper.UI.GUI.Shell.showItemInFolder(path)
	}

	hyper.UI.setRemoteServerURL = function(url)
	{
		SERVER.setRemoteServerURL(url)
	}

	hyper.UI.openToolsWorkbenchWindow = function()
	{
		if (mWorkbenchWindow && !mWorkbenchWindow.closed)
		{
			// Bring existing window to front.
			mWorkbenchWindow.focus()
		}
		else
		{
			// Create new window.
			/* This does not work:
			mWorkbenchWindow = hyper.UI.GUI.Window.open('tools-window.html', {
				//position: 'mouse',
				width: 901,
				height: 600,
				focus: true
			})*/
			mWorkbenchWindow = window.open(
				'tools-window.html',
				'workbench',
				'resizable=1,width=800,height=600')
			mWorkbenchWindow.moveTo(50, 50)
			mWorkbenchWindow.focus()
			// Establish contact. Not really needed.
			mWorkbenchWindow.postMessage({ message: 'hyper.hello' }, '*')
		}
	}

	hyper.UI.displayConnectStatus = function(status)
	{
		hyper.UI.DOM.document.querySelector('#connect-address').innerHTML = status
	}

	hyper.UI.setConnectedCounter = function(value)
	{
		hyper.UI.DOM.document.querySelector('#connect-counter').innerHTML = value
	}

	hyper.UI.displayNumberOfMonitoredFiles = function()
	{
		hyper.UI.DOM.document.querySelector('#files-counter').innerHTML =
			hyper.MONITOR.getNumberOfMonitoredFiles()
	}

	hyper.UI.displayAppLists = function()
	{
		hyper.UI.displayExampleList()
		hyper.UI.displayProjectList()
	}

	hyper.UI.displayProjectList = function()
	{
		// Clear current list.
		hyper.UI.$('#screen-projects').empty()

		// Get list of projects and check if we have any items to show.
		var projectList = hyper.UI.getProjectList()
		if (projectList.length > 0)
		{
			// Show items.
			for (var i = 0; i < projectList.length; ++i)
			{
				var path = projectList[i]
				createProjectEntry(
					path,
					{
						screen: '#screen-projects',
						openButton: true,
						deleteButton: true
					})
			}
		}
		else
		{
			// No items in list, show help text.
			var html =
				'<div class="style-big-para" style="padding: 0px 10px 10px 10px;">' +
				'<h2>How to create a new app</h2>' +
				'<p>Create a new app by copying one of the example apps (click "Copy") or by clicking the "New" button.</p>' +
				'<p>You can also drag and drop an .html file (typically index.html) or an evothings.json file to this window.</p>' +
				'<p>Arrange apps in the list using drag and drop. Click the close icon (x) to delete an app entry. This will NOT delete the application files.</p>' +
				'</div>'

			hyper.UI.$('#screen-projects').append(html)
		}
	}

	hyper.UI.displayExampleList = function()
	{
		// Clear current list.
		hyper.UI.$('#screen-examples').empty()

		// Create new list.
		var list = hyper.UI.getExampleList()
		for (var i = 0; i < list.length; ++i)
		{
			var entry = list[i]
			createProjectEntry(
				entry.path,
				{
					screen: '#screen-examples',
					copyButton: true,
					imagePath: entry.image
				})
		}
	}

	hyper.UI.setServerMessageFun = function()
	{
		// Set server message callback to forward message to the Workbench.
		hyper.SERVER.setMessageCallbackFun(function(msg)
		{
			// TODO: Send string do JSON.stringify on msg.
			if (mWorkbenchWindow)
			{
				mWorkbenchWindow.postMessage(msg, '*')
			}
		})
	}

	hyper.UI.deleteEntry = function(obj)
	{
		//LOGGER.log(hyper.UI.$(obj).parent())
		hyper.UI.openRemoveAppDialog(obj)
	}

	hyper.UI.openSettingsDialog = function()
	{
		// Populate input fields.
		hyper.UI.$('#input-setting-javascript-workbench-font-size').val(
			SETTINGS.getWorkbenchFontSize())
		hyper.UI.$('#input-setting-number-of-directory-levels').val(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		hyper.UI.$('#input-setting-my-apps-path').val(
			SETTINGS.getMyAppsPath())
		hyper.UI.$('#input-setting-reload-server-address').val(
			SETTINGS.getReloadServerAddress())

		// Show settings dialog.
		hyper.UI.$('#dialog-settings').modal('show')
	}

	hyper.UI.saveSettings = function()
	{
		// Hide settings dialog.
		hyper.UI.$('#dialog-settings').modal('hide')

		// TODO: Make this take effect instantly.
		SETTINGS.setWorkbenchFontSize(
			hyper.UI.$('#input-setting-javascript-workbench-font-size').val())

		// TODO: Make this take effect instantly.
		SETTINGS.setNumberOfDirecoryLevelsToTraverse(
			parseInt(hyper.UI.$('#input-setting-number-of-directory-levels').val()))

		SETTINGS.setMyAppsPath(
			hyper.UI.$('#input-setting-my-apps-path').val())

		// Check if server address has been changed.
		var updatedServerAddress = hyper.UI.$('#input-setting-reload-server-address').val()
		if (updatedServerAddress != SETTINGS.getReloadServerAddress())
		{
			// Save address.
			SETTINGS.setReloadServerAddress(updatedServerAddress)

			// Restart server.
			hyper.UI.connect()

			// Show connect screen.
			hyper.UI.showTab('connect')

			// Display message.
			hyper.UI.displayConnectKey(
				'Server address has been changed. Click GET KEY to get a new connect key.')
		}
	}

	hyper.UI.disconnectAllViewers = function()
	{
		// Send message to server.
		hyper.SERVER.sendDisconnectAllViewersToServer()

		// Show dialog.
		if (!hyper.UI.$('#dialog-disconnect-all-viewers').is(':visible'))
		{
			hyper.UI.$('#dialog-disconnect-all-viewers').modal('show')
		}
	}

	hyper.UI.openFileFolder = function(path)
	{
		// Prepend application path if this is not an absolute path.
		path = hyper.UI.getAppFullPath(path)

		// Show the file in the folder.
		hyper.UI.openFolder(path)
	}

	hyper.UI.openCopyAppDialog = function(path)
	{
		// Prepend application path if this is not an absolute path.
		path = hyper.UI.getAppFullPath(path)

		// Set source and folder name of app to copy.
		var sourceDir = PATH.dirname(path)
		var appFolderName = PATH.basename(sourceDir)
		var myAppsDir = SETTINGS.getMyAppsPath()

		// Set dialog box fields.
		hyper.UI.$('#input-copy-app-source-path').val(path) // Hidden field.
		hyper.UI.$('#input-copy-app-target-folder').val(appFolderName)
		hyper.UI.$('#input-copy-app-target-parent-folder').val(myAppsDir)

		// Show dialog.
		hyper.UI.$('#dialog-copy-app').modal('show')
	}

	hyper.UI.saveCopyApp = function()
	{
		// Set up source and target paths.
		var sourcePath = hyper.UI.$('#input-copy-app-source-path').val()
		var targetAppFolder = hyper.UI.$('#input-copy-app-target-folder').val()
		var targetParentDir = hyper.UI.$('#input-copy-app-target-parent-folder').val()
		var targetDir = PATH.join(targetParentDir, targetAppFolder)

		// If target folder exists, display an alert dialog and abort.
		var exists = FILEUTIL.statSync(targetDir)
		if (exists)
		{
			window.alert('An app with this folder name already exists, please type a new folder name.')
			return // Abort (dialog is still visible)
		}

		// Copy the app.
		copyApp(sourcePath, targetDir)

		// Hide dialog.
		hyper.UI.$('#dialog-copy-app').modal('hide')

		// Show the "My Apps" screen.
		showMyApps()
	}

	// sourcePath points to a directory.
	function copyApp(sourceDir, targetDir)
	{
		try
		{
			var appFolderName = PATH.basename(sourceDir)

			// Copy files.
			FSEXTRA.copySync(sourceDir, targetDir)

			// Remove any app-uuid entry from evothings.json in the copied app.
			// This is done to prevent duplicated app uuids.
			APP_SETTINGS.generateNewAppUUID(sourceDir)

			// Add path to "My Apps".
			hyper.UI.addProject(sourceDir)
		}
		catch (error)
		{
			window.alert('Something went wrong, could not save app.')
			LOGGER.log('[main-window-func.js] Error in copyApp: ' + error)
		}
	}

	function showMyApps()
	{
		hyper.UI.showTab('projects')
		hyper.UI.displayProjectList()
	}

	hyper.UI.openNewAppDialog = function()
	{
		// Populate input fields.
		var path = PATH.join(SETTINGS.getMyAppsPath())
		hyper.UI.$('#input-new-app-parent-folder').val(path)

		// Show dialog.
		hyper.UI.$('#dialog-new-app').modal('show')
	}

	hyper.UI.saveNewApp = function()
	{
		var sourcePath = hyper.UI.getAppFullPath('examples/template-basic-app')
		var parentFolder = hyper.UI.$('#input-new-app-parent-folder').val()
		var appFolder = hyper.UI.$('#input-new-app-folder').val()
		var targetDir = PATH.join(parentFolder, appFolder)

		// If target folder exists, display an alert dialog and abort.
		var exists = FILEUTIL.statSync(targetDir)
		if (exists)
		{
			window.alert('An app with this folder name already exists, please type a new folder name.')
			return // Abort (dialog is still visible)
		}

		// Copy files.
		copyApp(sourcePath, targetDir)

		// Hide dialog.
		hyper.UI.$('#dialog-new-app').modal('hide')

		showMyApps()
	}

	hyper.UI.openRemoveAppDialog = function(obj)
	{
		// Show dialog.
		hyper.UI.$('#dialog-remove-app').modal('show')

		// Replace click handler.
		hyper.UI.$('#button-remove-app').off('click')
		hyper.UI.$('#button-remove-app').on('click', function()
		{
			hyper.UI.removeApp(obj)
		})
	}

	hyper.UI.removeApp = function(obj)
	{
		// Remote the list item.
		hyper.UI.$(obj).parent().remove()

		// Display updated list.
		updateProjectList()
		hyper.UI.displayProjectList()

		// Hide dialog.
		hyper.UI.$('#dialog-remove-app').modal('hide')
	}

	/*
	// Unused - documentation is online-only.
	hyper.UI.openDocumentation = function()
	{
		var url = 'file://' + PATH.resolve('./documentation/index.html')
		hyper.UI.openInBrowser(url)
	}

	// Unused - documentation is online-only.
	hyper.UI.openReleaseNotes = function()
	{
		var url = 'file://' + PATH.resolve('./documentation/studio/release-notes.html')
		hyper.UI.openInBrowser(url)
	}
	*/

	hyper.UI.openInBrowser = function(url)
	{
		hyper.UI.GUI.Shell.openExternal(url)
	}

	hyper.UI.showInitialScreen = function()
	{
		//hyper.UI.showTab('getting-started')
		hyper.UI.showTab('connect')
	}

	hyper.UI.setStartScreenHelpVisibility = function()
	{
		var show = SETTINGS.getShowStartScreenHelp()
		if (show)
		{
			hyper.UI.showStartScreenHelp()
		}
		else
		{
			hyper.UI.hideStartScreenHelp()
		}
	}

	hyper.UI.toogleStartScreenHelp = function()
	{
		var visible = SETTINGS.getShowStartScreenHelp()
		if (visible)
		{
			hyper.UI.hideStartScreenHelp()
		}
		else
		{
			hyper.UI.showStartScreenHelp()
		}
	}

	hyper.UI.showStartScreenHelp = function()
	{
		SETTINGS.setShowStartScreenHelp(true)
		hyper.UI.$('#button-toogle-help').html('Hide Help')
		hyper.UI.$('.screen-start-help').show()
	}

	hyper.UI.hideStartScreenHelp = function()
	{
		SETTINGS.setShowStartScreenHelp(false)
		var show = SETTINGS.getShowStartScreenHelp()
		hyper.UI.$('#button-toogle-help').html('Show Help')
		hyper.UI.$('.screen-start-help').hide()
	}

	hyper.UI.connect = function()
	{
		var serverURL = SETTINGS.getReloadServerAddress()
		hyper.UI.stopServer()
		hyper.UI.setRemoteServerURL(serverURL)
		hyper.UI.startServer()
	}

	// Called when the Connect button in the Connect dialog is clicked.
	hyper.UI.getConnectKeyFromServer = function()
	{
		// Show spinner.
		hyper.UI.$('#connect-spinner').addClass('icon-spin-animate')

		if (!hyper.SERVER.isConnected())
		{
			// We are not connected, start the server connection.
			// This will result in a key being sent to us.
			hyper.UI.connect()
		}
		else
		{
			// Already connected, request a new key.
			hyper.SERVER.requestConnectKey()
		}
	}

	hyper.UI.setConnectKeyTimeout = function(timeout)
	{
		if (mConnectKeyTimer)
		{
			clearTimeout(mConnectKeyTimer)
		}

		// Set timeout for connect key display.
		mConnectKeyTimer = setTimeout(
			function()
			{
				hyper.UI.displayConnectKey('Key expired')
			},
			timeout)
	}

	// Variable key is a string, it is either a connect key or a
	// message from the server.
	hyper.UI.displayConnectKey = function(key)
	{
		// Show connect key field text.
		hyper.UI.$('#connect-key').text(key)

		// Stop button spinner.
		hyper.UI.$('#connect-spinner').removeClass('icon-spin-animate')
	}

	hyper.UI.displaySystemMessage = function(message)
	{
		if (!hyper.UI.$('#dialog-system-message').is(':visible'))
		{
			hyper.UI.$('#dialog-system-message').modal('show')
		}
		hyper.UI.$('#system-message').text(message)
	}

	hyper.UI.openBuildMessageDialog = function(message)
	{
		if (!hyper.UI.$('#dialog-build-message').is(':visible'))
		{
			hyper.UI.$('#dialog-build-message').modal('show')
		}
	}

	hyper.UI.closeBuildMessageDialog = function()
	{
		hyper.UI.$('#dialog-build-message').modal('hide')
	}

	hyper.UI.displayBuildMessage = function(message)
	{
		hyper.UI.$('#build-message').text(message)
	}

	hyper.UI.displayFloatingAlert = function(message)
	{
		hyper.UI.$('.floating-alert-box').show()
		hyper.UI.$('.floating-alert-box-message').text(message)
	}

	hyper.UI.closeFloatingAlert = function()
	{
		hyper.UI.$('.floating-alert-box').hide()
	}

	hyper.UI.testSystemMessage = function(message)
	{
		EVENTS.publish(EVENTS.USERMESSAGE, 'This is a test.')
	}
}
