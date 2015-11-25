/*
File: hyper-ui.js
Description: HyperReload UI functionality.
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

// Code below is split into two parts, one for the UI
// and one for ther server. This is to prepare for an
// eventual headless version of HyperReload. Code currently
// contains serveral dependencies, however.

// Wrapping everything in a closure since this file is included
// with a script tag in hyper-ui.html and therefore man affect the
// global browser scope.
;(function()
{

/*** Imported modules ***/

var FS = require('fs')
var PATH = require('path')
var OS = require('os')
var GUI = require('nw.gui')
var PATH = require('path')
var FSEXTRA = require('fs-extra')
var FILEUTIL = require('../server/fileutil.js')
var SETTINGS = require('../settings/settings.js')
var LOGGER = require('../server/log.js')
var UUID = require('../server/uuid.js')
var EVENTS = require('../server/events')
var USER_HANDLER = require('../server/user-handler.js')
var APP_SETTINGS = require('../server/app-settings.js')


/*** Globals ***/

// Global object that holds globally available functions.
var hyper = {}

// Global Node.js reference to the main hyper object.
// Useful for e.g. access from the JavaScript interactive tools window.
global.hyper = hyper

window.hyper = hyper

// UI-related functions.
hyper.UI = {}

/*** Main setup function ***/

// This function is called at the end of this file.
hyper.main = function()
{
	hyper.UI.defineUIFunctions()
	hyper.defineServerFunctions()

	hyper.UI.setupUI()
	hyper.UI.setupUIEvents()
	hyper.UI.setStartScreenHelpVisibility()
	hyper.UI.showInitialScreen()

	hyper.setupServer()
	hyper.UI.connect()
}

/*** UI setup ***/

hyper.UI.defineUIFunctions = function()
{
	var mWorkbenchWindow = null
	var mConnectKeyTimer

	hyper.UI.setupUI = function()
	{
		createSystemMenuForOSX()
		styleUI()
		setUIActions()
		setWindowActions()
		setUpFileDrop()
		restoreSavedUIState()
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
				var win = GUI.Window.get()
				var nativeMenuBar = new GUI.Menu({ type: 'menubar' })
				nativeMenuBar.createMacBuiltin(appName)
				win.menu = nativeMenuBar;
			}
			catch (ex)
			{
				LOGGER.log('Error creating OS X menubar: ' + ex.message);
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
		//$('button').button()

		// Set layout properties.
		/*
		$('body').layout(
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
		$(function()
		{
			$('#screen-projects').sortable(
			{
				stop: function()
				{
					updateProjectList()
				}
			})
			$('#screen-projects').disableSelection()
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
		GUI.Window.get().on('close', function()
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
				LOGGER.log('Error on window close: ' + e);
			}

			GUI.App.quit()
		})
	}

	function saveUIState()
	{
		var win = GUI.Window.get()

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
			var win = GUI.Window.get()

			// Make sure top-left corner is visible.
			var offsetY = 0
			if ('darwin' == OS.platform())
			{
				offsetY = 22
			}
			geometry.x = Math.max(geometry.x, 1)
			geometry.y = Math.max(geometry.y, 1 + offsetY)
			geometry.x = Math.min(geometry.x, screen.width - 100)
			geometry.y = Math.min(geometry.y, screen.height - 200)

			// Set window size.
			win.x = geometry.x
			win.y = geometry.y
			win.width = geometry.width
			win.height = geometry.height
		}
	}

	function receiveMessage(event)
	{
		//LOGGER.log('Main got : ' + event.data.message)
		if ('eval' == event.data.message)
		{
			hyper.SERVER.evalJS(event.data.code)
		}
        else if ('setSession' == event.data.message)
        {
            console.log('==== session set to '+event.data.sid)
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
		var dropTarget = $('#panel-page')
		var enterTarget;
		dropTarget.on('dragenter', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			hyper.UI.showTab('projects')
			$('#drag-overlay').show()
			enterTarget = event.target
		})
		dropTarget.on('dragleave', function(e)
		{
			if (enterTarget == event.target) {
				e.stopPropagation()
				e.preventDefault()
				$('#drag-overlay').hide()
			}
		})
		dropTarget.on('drop', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			$('#drag-overlay').hide()
			handleFileDrop(e.originalEvent.dataTransfer.files)
		})
	}

	function handleFileDrop(files)
	{
		// Debug print.
		/*for (var i = 0; i < files.length; ++i)
		{
			LOGGER.log(files[i].path);
		}*/

		for (var i = 0; i < files.length; ++i)
		{
			var path = files[i].path
			if (FILEUTIL.fileIsHTML(path))
			{
				//hyper.SERVER.setAppPath(path)
				hyper.addProject(path)
			}
			else
			{
				alert('Only HTML files (extension .html or .htm) can be used')
				break;
			}
		}

		hyper.UI.displayProjectList()
	}

	/**
	 * Possible options include:
	 *   options.screen
	 *   options.copyButton
	 *   options.openButton
	 *   options.deleteButton
	 */
	function createProjectEntry(path, options)
	{
		options = options || {}

		// Create div tag for app items.
		var html = '<div class="project-entry ui-state-default ui-corner-all">'

		// Show app image icon
		var appPath = hyper.makeFullPath(PATH.dirname(path))
		var imagePath = APP_SETTINGS.getAppImage(appPath)

		if (imagePath)
		{
			var fullImagePath = PATH.join(appPath, imagePath)
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
			+	'onclick="window.hyper.runAppGuard(\'__PATH3__\')">'
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
		var data = FILEUTIL.readFileSync(path)
		if (!data)
		{
			// Return on error, skipping rest of the code.
			LOGGER.log('createProjectEntry failed: ' + path)
			return
		}

		var name = getTagContent(data, 'title')
		if (!name)
		{
			name = getNameFromPath(path)
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
		var element = $(html)
		//LOGGER.log(html)

		// Insert element first in list.
		options.screen && $(options.screen).append(element)
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
		path = path.replace(new RegExp("\\"+PATH.sep, 'g'), '/')
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
		var elements = $('#screen-projects .project-list-entry-path')
		elements.each(function(index, element)
		{
			var path = $(element).text()
			if (path != '')
			{
				projects.push(path)
			}
		})
		hyper.setProjectList(projects)
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
			mWorkbenchWindow = GUI.Window.open('hyper-workbench.html', {
				//position: 'mouse',
				width: 901,
				height: 600,
				focus: true
			})*/
			mWorkbenchWindow = window.open(
				'hyper-workbench.html',
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
		document.querySelector('#connect-address').innerHTML = status
	}

	hyper.UI.setConnectedCounter = function(value)
	{
		document.querySelector('#connect-counter').innerHTML = value
	}

	hyper.UI.displayNumberOfMonitoredFiles = function()
	{
		document.querySelector('#files-counter').innerHTML =
			hyper.MONITOR.getNumberOfMonitoredFiles()
	}

	hyper.UI.displayProjectList = function()
	{
		// Clear current list.
		$('#screen-projects').empty()

		// Get list of projects and check if we have any items to show.
		var projectList = hyper.getProjectList()
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
				'<p>You can also drag and drop an .html file (typically index.html) to this window.</p>' +
				'<p>Arrange apps in the list using drag and drop. Click the close icon (x) to delete an app entry. This will NOT delete the application files.</p>' +
				'</div>'

			$('#screen-projects').append(html)
		}
	}

	hyper.UI.displayExampleList = function()
	{
		// Clear current list.
		$('#screen-examples').empty()

		// Create new list.
		var list = hyper.getExampleList()
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
		//LOGGER.log($(obj).parent())
		hyper.UI.openRemoveAppDialog(obj)
	}

	hyper.UI.openSettingsDialog = function()
	{
		// Populate input fields.
		$('#input-setting-javascript-workbench-font-size').val(
			SETTINGS.getWorkbenchFontSize())
		$('#input-setting-number-of-directory-levels').val(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		$('#input-setting-my-apps-path').val(
			SETTINGS.getMyAppsPath())
		$('#input-setting-reload-server-address').val(
			SETTINGS.getReloadServerAddress())

		// Show settings dialog.
		$('#dialog-settings').modal('show')
	}

	hyper.UI.saveSettings = function()
	{
		// Hide settings dialog.
		$('#dialog-settings').modal('hide')

		// TODO: Make this take effect instantly.
		SETTINGS.setWorkbenchFontSize(
			$('#input-setting-javascript-workbench-font-size').val())

		// TODO: Make this take effect instantly.
		SETTINGS.setNumberOfDirecoryLevelsToTraverse(
			parseInt($('#input-setting-number-of-directory-levels').val()))

		SETTINGS.setMyAppsPath(
			$('#input-setting-my-apps-path').val())

		// Check if server address has been changed.
		var updatedServerAddress = $('#input-setting-reload-server-address').val()
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

	hyper.UI.openFileFolder = function(path)
	{
		// Prepend application path if this is not an absolute path.
		path = hyper.makeFullPath(path)

		// Show the file in the folder.
		hyper.openFolder(path)
	}

	hyper.UI.openCopyAppDialog = function(path)
	{
		// Prepend application path if this is not an absolute path.
		path = hyper.makeFullPath(path)

		// Set source and folder name of app to copy.
		var sourceDir = PATH.dirname(path)
		var appFolderName = PATH.basename(sourceDir)
		var myAppsDir = SETTINGS.getMyAppsPath()

		// Now, time to handle a special case. Some of the Evothings example
		// apps contain a folder named "app" where index.html is found.
		// If the appFolderName is "app", we go up one level.
		// It should be noted that this is not a very nice hack,
		// and there is a corresponding hack in function copyApp().
		if ('app' ==  appFolderName)
		{
			appFolderName = PATH.basename(PATH.dirname(sourceDir))
		}

		// Set dialog box fields.
		$('#input-copy-app-source-path').val(path) // Hidden field.
		$('#input-copy-app-target-folder').val(appFolderName)
		$('#input-copy-app-target-parent-folder').val(myAppsDir)

		// Show dialog.
		$('#dialog-copy-app').modal('show')
	}

	hyper.UI.saveCopyApp = function()
	{
		// Set up source and target paths.
		var sourcePath = $('#input-copy-app-source-path').val()
		var targetAppFolder = $('#input-copy-app-target-folder').val()
		var targetParentDir = $('#input-copy-app-target-parent-folder').val()
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
		$('#dialog-copy-app').modal('hide')

		// Show the "My Apps" screen.
		showMyApps()
	}

	function copyApp(sourcePath, targetDir)
	{
		try
		{
			var indexFile = PATH.basename(sourcePath)
			var sourceDir = PATH.dirname(sourcePath)
			var appFolderName = PATH.basename(sourceDir)
			var indexFileTargetPath = PATH.join(targetDir, indexFile)

			// Again, we need to handle the special case when index.html of the
			// example app is contained in a subfolder named "app".
			// If the appFolderName is "app", we go up one level.
			// There is a corresponding hack in function hyper.UI.openCopyAppDialog().
			if ('app' ==  appFolderName)
			{
				sourceDir = PATH.dirname(sourceDir)
				indexFileTargetPath = PATH.join(targetDir, appFolderName, indexFile)
			}

			//console.log('@@@ targetDir: ' + targetDir)
			//console.log('@@@ sourceDir: ' + sourceDir)
			//console.log('@@@ indexFileTargetPath: ' + indexFileTargetPath)

			// Copy files.
			FSEXTRA.copySync(sourceDir, targetDir)

			// Remove any app-uuid entry from evothings.json in the copied app.
			// This is done to prevent duplicated app uuids.
			APP_SETTINGS.generateNewAppUUID(PATH.dirname(indexFileTargetPath))

			// Add path of index.html to "My Apps".
			hyper.addProject(indexFileTargetPath)
		}
		catch (error)
		{
			window.alert('Something went wrong, could not save app.')
			console.log('Error in copyApp: ' + error)
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
		$('#input-new-app-parent-folder').val(path)

		// Show dialog.
		$('#dialog-new-app').modal('show')
	}

	hyper.UI.saveNewApp = function()
	{
		var sourcePath = hyper.makeFullPath('examples/template-basic-app/index.html')
		var parentFolder = $('#input-new-app-parent-folder').val()
		var appFolder = $('#input-new-app-folder').val()
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
		$('#dialog-new-app').modal('hide')

		showMyApps()
	}

	hyper.UI.openRemoveAppDialog = function(obj)
	{
		// Show dialog.
		$('#dialog-remove-app').modal('show')

		// Replace click handler.
		$('#button-remove-app').off('click')
		$('#button-remove-app').on('click', function()
		{
			hyper.UI.removeApp(obj)
		})
	}

	hyper.UI.removeApp = function(obj)
	{
		// Remote the list item.
		$(obj).parent().remove()

		// Display updated list.
		updateProjectList()
		hyper.UI.displayProjectList()

		// Hide dialog.
		$('#dialog-remove-app').modal('hide')
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
		GUI.Shell.openExternal(url)
	}

	hyper.UI.showInitialScreen = function()
	{
		hyper.UI.showTab('getting-started')
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
		$('#button-toogle-help').html('Hide Help')
		$('.screen-start-help').show()
	}

	hyper.UI.hideStartScreenHelp = function()
	{
		SETTINGS.setShowStartScreenHelp(false)
		var show = SETTINGS.getShowStartScreenHelp()
		$('#button-toogle-help').html('Show Help')
		$('.screen-start-help').hide()
	}

    hyper.UI.connect = function()
    {
        var serverURL = SETTINGS.getReloadServerAddress()
        hyper.stopServer()
        hyper.setRemoteServerURL(serverURL)
        hyper.startServer()
    }

	// Called when the Connect button in the Connect dialog is clicked.
	hyper.UI.getConnectKeyFromServer = function()
	{
		// Show spinner.
		$('#connect-spinner').addClass('icon-spin-animate')

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
		$('#connect-key').text(key)

		// Stop button spinner.
		$('#connect-spinner').removeClass('icon-spin-animate')
	}

	hyper.UI.displaySystemMessage = function(message)
	{
		if (!$('#dialog-system-message').is(':visible'))
		{
			$('#system-message').text(message)
			$('#dialog-system-message').modal('show')
		}
	}

	hyper.UI.testSystemMessage = function(message)
	{
		EVENTS.publish(EVENTS.USERMESSAGE, 'This is a test.')
	}
}

/*** Server/IO setup ***/

hyper.defineServerFunctions = function()
{
	var SERVER = require('../server/hyper-server.js')
	var MONITOR = require('../server/filemonitor.js')

	hyper.SERVER = SERVER
	hyper.MONITOR = MONITOR

	var mProjectList = []
	var mExampleListFile = './hyper/settings/example-list.json'
	var mExampleList = []
	var mApplicationBasePath = process.cwd()
	var mRunAppGuardFlag = false
	var mNumberOfConnectedClients = 0

	// Initialize the file server (the socket.io client
	// that handles file requests).
	hyper.setupServer = function()
	{
		// Populate the UI.
		// TODO: Consider moving these calls to a function in hyper.UI.
		mExampleList = parseProjectList(FILEUTIL.readFileSync(mExampleListFile))
		readProjectList()
		hyper.UI.displayProjectList()
		hyper.UI.displayExampleList()
		hyper.UI.setServerMessageFun()

		//displayServerIpAddress()
		//setInterval(checkServerIpAddressForRestart, 10000)

		SERVER.setClientInfoCallbackFun(clientInfoCallback)
        SERVER.setRequestConnectKeyCallbackFun(requestConnectKeyCallback)
		// TODO: Remove.
		// SERVER.setReloadCallbackFun(reloadCallback)

		MONITOR.setFileSystemChangedCallbackFun(function()
		{
			// Refresh list of my apps.
			hyper.UI.displayProjectList()

			// Reload app.
			SERVER.reloadApp()
		})
	}

	hyper.startServer = function()
	{
		// Start server tasks.
		SERVER.connectToRemoteServer()
		MONITOR.setTraverseNumDirectoryLevels(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		MONITOR.startFileSystemMonitor()
	}

	hyper.stopServer = function()
	{
		// Stop server tasks.
		SERVER.disconnectFromRemoteServer()
		MONITOR.stopFileSystemMonitor()
	}

/*
	// Check IP address and stop and start servers if it has changed.
	function checkServerIpAddressForRestart()
	{
		serverIpAddressDisplayString(function(addressString)
		{
			// If address string has changed, then display
			// the new address and restart servers.
			if (mIpAddressString != addressString)
			{
				mIpAddressString = addressString
				displayServerIpAddress()
				SERVER.restartServers()
			}
		})
	}

	function displayServerIpAddress()
	{
		serverIpAddressDisplayString(function(addressString)
		{
			// Save current address string.
			mIpAddressString = addressString
			hyper.UI.displayIpAddress(addressString)
		})
	}

	function serverIpAddressDisplayString(callback)
	{
		SERVER.getIpAddresses(function(addresses)
		{
			var connectAddress = ''
			var numAddresses = addresses.length
			if (numAddresses == 0)
			{
				connectAddress = '127.0.0.1:' + SETTINGS.getWebServerPort()
			}
			else
			{
				if (numAddresses > 1)
				{
					connectAddress = 'Try: '
				}
				for (var i = 0; i < numAddresses; ++i)
				{
					connectAddress += addresses[i] + ':' + SETTINGS.getWebServerPort()
					if (i + 1 < numAddresses)
					{
						connectAddress += ' or '
					}
				}
			}
			callback(connectAddress)
		})
	}
*/

	// The Run button in the UI has been clicked.
	// Clicking too fast can cause muliple windows
	// to open. Guard against this case.
	hyper.runAppGuard = function(path)
	{
		if (!mRunAppGuardFlag)
		{
			mRunAppGuardFlag = true
			hyper.runApp(path)
			setTimeout(function() { mRunAppGuardFlag = false }, 500)
		}
	}

	// The Run button in the UI has been clicked.
	hyper.runApp = function(path)
	{
		// Prepend application path if this is not an absolute path.
		path = hyper.makeFullPath(path)

		LOGGER.log('runApp: ' + path)

		SERVER.setAppPath(path)
		MONITOR.setBasePath(SERVER.getBasePath())

		if (mNumberOfConnectedClients <= 0)
		{
			// This function is defined in hyper-ui.html.
			hyper.noClientConnectedHander()
		}
		else
		{
			// Refresh list of my apps.
			hyper.UI.displayProjectList()

			// Otherwise, load the requested file on connected clients.
			SERVER.runApp()
		}

		//mNumberOfConnectedClients = 0

		//clearTimeout(mConnectedCounterTimer)
		//mConnectedCounterTimer = setTimeout(function() {
		//	hyper.UI.setConnectedCounter(mNumberOfConnectedClients) },
		//	5000)
	}

	function clientInfoCallback(message)
	{
		mNumberOfConnectedClients = parseInt(message.data.numberOfConnectedClients, 10)
		hyper.UI.setConnectedCounter(mNumberOfConnectedClients)
	}

	// Called when a connect key is sent from the server.
    function requestConnectKeyCallback(message)
    {
        //LOGGER.log('requestConnectKeyCallback called for message')
        //console.dir(message)
        hyper.UI.setConnectKeyTimeout(message.data.timeout)
        hyper.UI.displayConnectKey(message.data.connectKey)
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

	function readProjectList()
	{
		// Read project file.
		var json = localStorage.getItem('project-list')
		if (json)
		{
			mProjectList = parseProjectList(json)
		}
	}

	function saveProjectList()
	{
		localStorage.setItem('project-list', JSON.stringify(mProjectList))
	}

	// TODO: Simplify, use updateProjectList instead.
	hyper.addProject = function(path)
	{
		mProjectList.unshift(path)
		saveProjectList()
	}

	hyper.setProjectList = function(list)
	{
		mProjectList = list
		saveProjectList()
	}

	hyper.getProjectList = function()
	{
		return mProjectList
	}

	hyper.getExampleList = function()
	{
		return mExampleList
	}

	/**
	 * If path is not a full path, make it so. This is
	 * used to make relative example paths full paths.
	 */
	hyper.makeFullPath = function(path)
	{
		if (!FILEUTIL.isPathAbsolute(path))
		{
			return PATH.join(mApplicationBasePath, path)
		}
		else
		{
			return path
		}
	}

	hyper.openFolder = function(path)
	{
		// Convert path separators on Windows.
		if (process.platform === 'win32')
		{
			path = path.replace(/[\/]/g,'\\')
		}

		// Debug logging.
		LOGGER.log('Open folder: ' + path)

		GUI.Shell.showItemInFolder(path)
	}

	hyper.setRemoteServerURL = function(url)
	{
		SERVER.setRemoteServerURL(url)
	}
}

/*** Additional UI setup ***/

// TODO: Structure this in a better way that is easier to read.
// For instance compose into functions, integrate into code above etc.

// Setup UI button actions.
hyper.UI.setupUIEvents = function()
{
	var DISCONNECT_DELAY = 30000
	var mDisconnectTimer = 0

	// ************** Connect Key Button **************

	$('#button-get-connect-key').click(function()
	{
		hyper.UI.getConnectKeyFromServer()
	})

	// ************** Getting Started Screen Button **************

	$('#button-getting-started').click(function()
	{
		hyper.UI.showTab('getting-started')
	})

	// ************** Open Settings Button **************

	$('#button-open-settings-dialog').click(function()
	{
		hyper.UI.openSettingsDialog()
	})

	// ************** Settings Dialog Save Button **************

	$('#button-save-settings').click(function()
	{
		hyper.UI.saveSettings()
	})

	// ************** Documentation Button **************

	$('.button-documentation').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/doc/')
	})

	// ************** Release Notes Button **************

	$('#button-release-notes').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/doc/studio/release-notes.html')
	})

	// ************** Examples Documentation Button **************

	$('#button-examples-documentation').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/doc/examples/examples.html')
	})

	// ************** Connect Screen Button **************

	$('#button-connect, .button-open-connect-screen').click(function()
	{
		hyper.UI.showTab('connect')
	})

	// ************** Connect Screen Toggle Help Button **************

	$('#button-toogle-help').click(function()
	{
		hyper.UI.toogleStartScreenHelp()
	})

	// ************** Feedback Button **************

	$('#button-feedback').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/feedback/')
	})

	// ************** Forum Button **************

	$('#button-forum').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/forum/')
	})

	// ************** News Button **************

	$('#button-news').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/news/')
	})

	// ************** Tell-a-friend Button **************

	$('#button-tell-a-friend').click(function()
	{
		// hyper.UI.openInBrowser('https://evothings.com/tell-a-friend/')
		$('#dialog-tell-a-friend').modal('show')
	})

	$('#button-copy-tell-a-friend-1').click(function()
	{
		copyElementTextToClipboard('#tell-a-friend-1')
	})

	$('#button-copy-tell-a-friend-2').click(function()
	{
		copyElementTextToClipboard('#tell-a-friend-2')
	})

	$('#button-copy-tell-a-friend-3').click(function()
	{
		copyElementTextToClipboard('#tell-a-friend-3')
	})

	$('#button-copy-tell-a-friend-4').click(function()
	{
		copyElementTextToClipboard('#tell-a-friend-4')
	})

	function copyElementTextToClipboard(elementID)
	{
		copyToClipboard($(elementID).text())
	}

	function copyToClipboard(text)
	{
		var clipboard = GUI.Clipboard.get()
		clipboard.set(text, 'text')
	}

	// ************** Test-system-message Button **************

	$('#button-test-system-message').click(function()
	{
		hyper.UI.testSystemMessage()
	})

	// ************** Examples Tab Button **************

	$('#button-examples').click(function()
	{
		hyper.UI.showTab('examples')
	})

	// ************** My Apps Tab Button **************

	$('#button-projects').click(function()
	{
		hyper.UI.showTab('projects')
	})

	// ************** New App Button **************

	$('#button-new-app').click(function()
	{
		hyper.UI.openNewAppDialog()
	})

	// ************** New App Dialog Save Button **************

	$('#button-save-new-app').click(function()
	{
		hyper.UI.saveNewApp()
	})

	// ************** Copy App Dialog Save Button **************

	$('#button-save-copy-app').click(function()
	{
		hyper.UI.saveCopyApp()
	})

	// ************** Tools Button **************

	$('#button-tools').click(function()
	{
		hyper.UI.openToolsWorkbenchWindow()
	})

	// ************** Login Button **************

	// Set login button action handler. The button toggles login/logout.
	$('#button-login').click(function()
	{
		if (USER_HANDLER.getUser())
		{
			logoutUser()
		}
		else
		{
			loginUser()
		}
	})

	// ************** Login Close Button **************

	$('#connect-screen-login-close-button').click(function()
	{
		hideLoginScreen()
	})

	// ************** Login Events **************

	EVENTS.subscribe(EVENTS.CONNECT, function(obj)
	{
		enableLoginButton()
	})

	EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
	{
		displayLoginButton()
		disableLoginButton()
	})

	EVENTS.subscribe(EVENTS.LOGIN, function(user)
	{
		console.log('*** User has logged in: ' + user)
		console.dir(user)

		hideLoginScreen()
		showUserInfo(user)
	})

	EVENTS.subscribe(EVENTS.LOGOUT, function()
	{
		// TODO: Pass user id to the Run/Reload messaging code (hyper-server.js).
		LOGGER.log('*** User has logged out ***')

		displayLoginButton()
	})

	// ************** Connect Events **************

	EVENTS.subscribe(EVENTS.CONNECT, function(obj)
	{
		LOGGER.log('socket.io connect')
		if(mDisconnectTimer)
		{
			clearTimeout(mDisconnectTimer)
			mDisconnectTimer = undefined
		}
	})

	EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
	{
		LOGGER.log('socket.io disconnect')
		mDisconnectTimer = setTimeout(function()
		{
			logoutUser()
		}, DISCONNECT_DELAY)
	})

	function loginUser()
	{
		USER_HANDLER.createLoginClient()

		USER_HANDLER.startLoginSequence()
		var loginURL = USER_HANDLER.getLoginURL()
		console.log('loginURL : ' + loginURL)
		showLoginScreen(loginURL)
	}

	function logoutUser()
	{
		if (USER_HANDLER.getUser())
		{
			// Open logout url in hidden logout iframe.
			var logoutURL = USER_HANDLER.getLogoutURL()
			$('#connect-screen-logout-iframe').attr('src', logoutURL)

			// TODO: Find better solution for managing double logouts, when server can't find us and reply back
			setTimeout(function()
			{
				if (USER_HANDLER.getUser())
				{
					USER_HANDLER.clearUser()
					EVENTS.publish(EVENTS.LOGOUT, {event: 'logout'})
				}
			}, 1000)
		}
	}

	function disableLoginButton()
	{
		$('#button-login').attr('disabled','disabled')
	}

	function enableLoginButton()
	{
		$('#button-login').removeAttr('disabled')
	}

	function displayLoginButton()
	{
		$('#button-login').html('Login')
		$('#login-info').html('Not Logged In')
		$('#connect-screen-login').hide()
	}

	function showLoginScreen(loginURL)
	{
		$('#connect-screen-login').show()
		//$('#connect-screen-login-loading-message').show()
		$('#connect-screen-login-iframe').attr('src', loginURL)
	}

	function hideLoginScreen()
	{
		$('#connect-screen-login').hide()
	}

	function showUserInfo(user)
	{
		if (user && user.name && user.picture)
		{
			// Display user data.
			if(user.picture.indexOf('http') == -1)
			{
				user.picture = user.EVO_SERVER + '/' + user.picture
			}
			// Show user picture on login button and change text to "Logout".
			var imageHTML =
				'<img style="height:30px;with:auto;margin-right:5px;margin-top:-3px" '
				+	'class="pull-left" '
				+	'src="' + user.picture + '">'
			var infoText = 'Logged in as '+user.name
			var infoHTML = imageHTML + infoText
			$('#login-info').html(infoHTML)

			// Change login button text to logout.
			$('#button-login').html('Logout')
		}
		else
		{
			$('#login-info').html('Could not log in')
		}
	}

	// ************** Tab Button Handling **************

	hyper.UI.showTab = function(tabname)
	{
		// Hide all screens and set unselected colour for buttons.
		$('#screen-getting-started').hide()
		$('#screen-connect').hide()
		$('#screen-examples').hide()
		$('#screen-projects').hide()
		$('#button-connect, #button-examples, #button-projects')
			.removeClass('et-btn-et-btn-white-only')
			.addClass('et-btn-stone')

		// Show selected tab.
		var screenId = '#screen-' + tabname
		var buttonId = '#button-' + tabname
		$(screenId).show()
		$(buttonId).removeClass('et-btn-stone').addClass('et-btn-et-btn-white-only')
	}

	// ************** No Client Connected Event **************

	// Called when you press Run and no client is connected.
	hyper.noClientConnectedHander = function()
	{
		$('#ModalDialog-NoClientConnected').modal('show')
	}

	// Click handler for link in the ModalDialog-NoClientConnected dialog.
	$('#ModalDialog-NoClientConnected-HelpLink').click(function()
	{
		//var url = 'file://' + PATH.resolve('./documentation/studio/mobile-app.html')
		//hyper.UI.openInBrowser(url)

		// Hide modal dialog.
		$('#ModalDialog-NoClientConnected').modal('hide')

		// Show Getting Started screen.
		hyper.UI.showTab('getting-started')
	})

    // ************** Additional event handlers **************

    EVENTS.subscribe(EVENTS.CONNECT, function(obj)
    {
        hyper.UI.displayConnectStatus('Connected')
    })

    EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
    {
        hyper.UI.displayConnectStatus('Disconnected')
    })

    EVENTS.subscribe(EVENTS.USERMESSAGE, function(message)
    {
        // Display a message for the user.
        hyper.UI.displaySystemMessage(message)
    })
}

// Call main function to setup UI and server.
hyper.main()

})() // End of closure wrapper.

