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
const SHELL = require('electron').shell;
const ipcRenderer = require('electron').ipcRenderer
var MAIN = require('electron').remote.getGlobal('main');

var PATH = require('path')
var OS = require('os')
var PATH = require('path')
var FS = require('fs')
var FSEXTRA = require('fs-extra')
var FILEUTIL = require('../server/file-util.js')
var EVENTS = require('../server/system-events.js')
// Awful, but I am not sure how to get hold of the BrowserWindow.id otherwise
EVENTS.myID = MAIN.workbenchWindow.id
var APP_SETTINGS = require('../server/app-settings.js')
var SETTINGS = require('../settings/settings.js')
var LOGGER = require('../server/log.js')
var SERVER = require('../server/file-server.js')
var MONITOR = require('../server/file-monitor.js')
var UTIL = require('../util/util.js')
var TEMP = require('temp').track()
var BABEL = require('babel-core')
var GLOB = require('glob')
var CHEERIO = require('cheerio')
var SEMVER_REGEX = require('semver-regex')
var URL = require('url')
const CHILD_PROCESS = require('child_process')

// This is not a strict domain regex, but enough to make Cordova happy (and Cordova is not fully sane either)
const reverseDomainRE = /^(([a-zA-Z0-9]+)\.)*([a-zA-Z0-9]+)$/

// Counter for "popup" menus on an app entry in the My Apps list.
var mEntryMenuIdCounter = 0

/**
 * UI functions.
 */
exports.defineUIFunctions = function(hyper)
{
	var mConnectKeyTimer
	// The merged final array of metadata on Examples, Libraries and Projects
	hyper.UI.mNewsList = []
	hyper.UI.mExampleList = []
	hyper.UI.mLibraryList = []
	hyper.UI.mBuildConfigList = []
	hyper.UI.mBuildList = []
	hyper.UI.mPluginList = []
	
	// Ugly flag introduced because we can get a flurry of EVENTS.LOGIN
	mUpdatingLists = false

	var mProjectList = []
	var mWorkbenchPath = MAIN.getRootDir()

	hyper.UI.setupUI = function()
	{
		ensureCloudApiTokenExists()
		styleUI()
		setUIActions()
		setWindowActions()
		setUpFileDrop()
		restoreSavedUIState()
		MAIN.showWorkbenchWindow()
		initAppLists()
	}

  function updateLists(silent) {
    if (!mUpdatingLists) {
      mUpdatingLists = true
      setTimeout(function() {mUpdatingLists = false}, 5000)
			hyper.UI.updateNewsList(silent)
      hyper.UI.updateExampleList(silent)
      hyper.UI.updateLibraryList(silent)
			hyper.UI.updateBuildConfigList(silent)
			hyper.UI.updatePluginList(silent)
	  	UTIL.updateTranslations(SETTINGS.getTranslationsURL())
    } else {
      console.log("Already updating lists, ignoring")
    }
  }
  
	function initAppLists()
	{
		readProjectList()
		hyper.UI.displayProjectList()

    // If we have verified basic internet access - we load the lists but not silently.
    UTIL.checkInternet().then(hasInternet => {
      if (hasInternet) {
        updateLists(false)
	    }
    })

		// Register a timer so that we update the lists every 30 min, but silently.
	  setInterval(function() {
      updateLists(true)
	  }, 30 * 60 * 1000);
	  
	  // When user logs in we update silently
	  EVENTS.subscribe(EVENTS.LOGIN, function() {updateLists(true)})
	  
		hyper.UI.setServerMessageFun()
	}

	function ensureCloudApiTokenExists()
	{
		var token = SETTINGS.getEvoCloudToken()
		var dialog = hyper.UI.$('#dialog-cloud-token-alert')[0]
		if(!token)
		{
			console.dir(dialog)
			//dialog.showModal()
		}
		else
		{
			console.log('existing cloud api token found: '+token)
			hyper.UI.showToken(token)
		}
		console.log('------------------ setting up open token dialog listener...')
		EVENTS.subscribe(EVENTS.OPENTOKENDIALOG, function(message)
		{
			console.log('------------------ token dialog event. message = '+message)
			if(message)
			{
				console.log('open cloud token dialog')
				MAIN.openDialog('Cloud Token Message', message, 'info')
			}

			/*
			if(message)
			{
				hyper.UI.$('#tokentext')[0].innerHTML = message
			}
			hyper.UI.$('#connect-spinner').removeClass('icon-spin-animate')
			dialog.showModal()
			*/
			hyper.UI.hideToken()
		})
	}

	hyper.UI.showToken = function(token)
	{
		var panelHaveToken = hyper.UI.$('#panel-have-token')[0]
		var panelHaveNoToken = hyper.UI.$('#panel-have-no-token')[0]
		var tokenInputField = hyper.UI.$('.token-input-field')[0]
		panelHaveToken.style.display = 'block'
		panelHaveNoToken.style.display = 'none'
		tokenInputField.value = ''
		hyper.UI.$('.token-key').html(token)
	}

	hyper.UI.hideToken = function()
	{
		var panelHaveToken = hyper.UI.$('#panel-have-token')[0]
		var panelHaveNoToken = hyper.UI.$('#panel-have-no-token')[0]
		panelHaveToken.style.display = 'none'
		panelHaveNoToken.style.display = 'block'
		hyper.UI.$('.token-key').html('')
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

		// Display of file monitor counter.
		setInterval(function() {
			hyper.UI.displayNumberOfMonitoredFiles() },
			1500)
	}

	function setWindowActions()
	{
		// Listen to main window's close event
		var win = MAIN.workbenchWindow
    win.on('close', function() {
      saveUIState()
      this.close(true)
    })
	}

	function saveUIState()
	{
		var geometry = MAIN.workbenchWindow.getBounds()
		// Do not save if window is minimized on Windows.
		// On Windows an icon has x,y coords -32000 when
		// window is minimized. On Linux and OS X the window
		// coordinates and size are intact when minimized.
		if (geometry.x < -1000)
		{
			return;
		}
		SETTINGS.setProjectWindowGeometry(geometry)
	}

	function restoreSavedUIState()
	{
		var geometry = SETTINGS.getProjectWindowGeometry()
		if (geometry)
		{
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
			MAIN.workbenchWindow.setBounds(geometry)
		}
		// Restore remember me state for logout action
		var checked = SETTINGS.getRememberMe()
		hyper.UI.$('#remember-checkbox').attr('checked', checked)
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
/*
		// Debug print.
		console.log('@@@ handleFileDrop');
		for (var i = 0; i < files.length; ++i)
		{
			console.log(files[i].path);
		}
*/

		for (var i = 0; i < files.length; ++i)
		{
			var path = files[i].path
			if (pathIsValidAppPath(path))
			{
				hyper.UI.addProject(path)
			}
			else
			{
				window.alert('Not a valid evothings.json file or HTML file (extension .html or .htm)')
				break;
			}
		}

		hyper.UI.displayProjectList()
	}

    function pathIsValidAppPath(path)
    {
      // Is it an existing HTML file?
		  if (FILEUTIL.fileIsHTML(path) && FILEUTIL.pathExists(path))
		  {
			  return true
		  }

		  // Directory containing evothings.json file.
		  var dirPath = null

		  // If path points to evothings.json file, get the directory
		  if (FILEUTIL.fileIsEvothingsSettings(path))
		  {
			  dirPath = PATH.dirname(path)
		  }
		  else if (FILEUTIL.fileIsDirectory(path))
		  {
			  // Dropped file is a directory.
			  dirPath = path
		  }

		  // Must have directory to continue.
		  if (!dirPath)
		  {
			  return false
		  }

      // Does the directory have an evothings.json file pointing to existing index file?
      var indexPath = APP_SETTINGS.getIndexFileFullPath(dirPath)
		  if (FILEUTIL.pathExists(indexPath))
		  {
			  return true
		  }

		  return false
    }

	/**
	 * Possible options include:
	 *   options.path
	 *   options.title
	 *   options.version
	 *   options.versions
	 *   options.description
	 *   options.tags { label, type }
	 *   options.libraries { name, version }
	 *   options.imagePath
	 *   options.docURL
	 *   options.active
	 *	 options.screen
	 *	 options.docButton
	 *	 options.copyButton
	 *	 options.openButton
	 *	 options.deleteButton
	 */
	function createProjectEntry(isLocal, isLibrary, options)
	{
		options = options || {}
    // Set base to where we loaded the metadata from
    var base = options.url || 'file://' 

		// Create div tag for app items.
		var html = '<div class="project-entry ui-state-default ui-corner-all"'

		// Set background color of active app entry.
		if (options.active)
		{
			html += ' style="background-color:#EAFFEA;"'
		}

		// Close opening div tag.
		html += '>'

		// Full URL to application, local or online
		var appURL = URL.resolve(base, options.path)
    var imagePath = options.imagePath
    var docURL = options.docURL
    var appTags = options.tags || []
    var appLibraries = options.libraries || []
		var appVersion = options.version || null
		var versions = options.versions || null
		var shortName = options.name
    var appTitle = options.title
    var appDescription = options.description
		var dirOrFile = options.dirOrFile || options.path  // Ugh..

		// Escape any backslashes in the path (needed on Windows).
		var escapedPath = dirOrFile.replace(/[\\]/g,'\\\\')
    
    if (isLocal) {
		  var imagePath = imagePath || APP_SETTINGS.getAppImage(options.path)
		  var docURL = docURL || APP_SETTINGS.getDocURL(options.path)
		  var appTags = APP_SETTINGS.getTags(options.path) || []
		  var appLibraries = APP_SETTINGS.getLibraries(options.path) || []
		  var appVersion = APP_SETTINGS.getVersion(options.path) || null
		  var shortName = APP_SETTINGS.getName(options.path)
		  var appDescription = APP_SETTINGS.getDescription(options.path) || '&lt;no description entered&gt;'
    }
    
    // Fallback on missing doc-url is locally inside the app/library
    if (!docURL) {
      docURL = URL.resolve(appURL, 'doc', 'index.html')
    }
    
		// Show app icon.
		if (imagePath) {
			var fullImageURL = URL.resolve(appURL + '/', imagePath)
			html += '<div class="app-icon" style="background-image: url(\'' +
				fullImageURL + '\');"></div>'
		} else {
			// Show a default icon if no image file is provided.
			html += '<div class="app-icon" style="background-image: url(\'images/app-icon.png\');"></div>'
		}

		// Get app name.
		var appHasValidHTMLFile = options.runButton
    if (isLocal) {
		  // Get title of app, either given in options above or extracted from project.
		  // Uses title tag as first choice.
      if (!appTitle) {
        // Returns null if HTML file not found.
		    appTitle = hyper.UI.getTitleFromFile(options.dirOrFile)
		    appHasValidHTMLFile = !!appTitle
		    if (!appHasValidHTMLFile) {
			    // If app name was not found, index.html does not exist.
			    appTitle = 'Warning: HTML file does not exist, no title found'
		    }
      }
    }
	
		// Run button for examples and apps.
		// Add Run button only if app has an HTML file.
		// We use different run functions depending on if it isLocal.
		if (!isLibrary && appHasValidHTMLFile)
		{
			html += '<button type="button" class="button-run btn et-btn-green entry-button" '
			if (isLocal)
				html += `onclick="window.hyper.UI.runApp('${escapedPath}')">`
			else 
				html += `onclick="window.hyper.UI.runExampleApp('${escapedPath}')">`
			html +=	'Run</button>'
		}

		// Edit button for apps.
		// Added if it is a locally stored app that can be edited.
		if (isLocal && !isLibrary)
		{
			html += 
				'<button type="button" '
				+ 'class="button-edit btn et-btn-blue entry-button" '
				+ `onclick="window.hyper.UI.editApp('${escapedPath}')">`
				+	'Edit</button>'
		}

		// Doc button for libs.
		if (isLibrary)
		{
			html +=
				'<button type="button" '
				+ 'class="button-doc-lib btn et-btn-yellow-dark entry-button" '
				+ `onclick="window.hyper.UI.openDocURL('${docURL}')">`
				+	'Doc</button>'
		}

		// Doc button for examples.
		if (!isLocal && !isLibrary)
		{
			html +=
				'<button type="button" '
				+ 'class="button-doc-example btn et-btn-yellow-dark entry-button" '
				+ `onclick="window.hyper.UI.openDocURL('${docURL}')">`
				+	'Doc</button>'
		}

		// Copy button for examples.
		if (options.copyButton)
		{
			html +=
				'<button type="button" '
				+	'class="button-copy-example btn et-btn-indigo entry-button" '
				+	`onclick="window.hyper.UI.openCopyAppDialog('${escapedPath}', '${shortName}')">`
				+	'Copy'
				+ '</button>'
		}

		// Menu button for apps that shows more buttons.
		if (isLocal && !isLibrary)
		{
			// Increment button menu counter.
			++mEntryMenuIdCounter

			// Id for dynamic button menu.
			var entryMenuId = `entry-menu-id-${mEntryMenuIdCounter}`

			html += 
				'<button type="button" '
				+ 'class="button-more btn et-btn-indigo entry-button" '
				+ `onclick="window.hyper.UI.toggleEntryMenu('${entryMenuId}')">`
				+	'More</button>'

			// Build popup menu for app entry, shown on menu button.
			++mEntryMenuIdCounter
			html += `<div class="entry-menu" id="${entryMenuId}">`

			// Open files button.
			html +=
				'<button type="button" '
				+	'class="btn btn-default entry-menu-button" '
				+	`onclick="window.hyper.UI.openFolder('${escapedPath}')">`
				+	'Files</button>'

			// Config button.
			html +=
				'<button type="button" '
				+	'class="btn btn-default entry-menu-button" '
				+	`onclick="window.hyper.UI.openConfigAppDialog('${escapedPath}')">`
				+	'Config</button>'

			// Build button.
		  html +=
				'<button type="button" '
				+	'class="btn btn-default entry-menu-button" '
				+	`onclick="window.hyper.UI.openBuildAppDialog('${escapedPath}')">`
				+	'Build</button>'

			// Doc button.
		  html +=
				'<button type="button" '
				+	'class="btn btn-default entry-menu-button" '
				+	`onclick="window.hyper.UI.openDocURL('${docURL}')">`
				+	'Doc</button>'

			// End of entry menu.
			html += '</div>'
		}

		// Delete icon.
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

    // Tags HTML
    var tagsHTML = ''
    appTags.forEach(tag => {
      tagsHTML += ` <span class="label label-${tag.type}">${tag.label}</span>`
    })
    
    // Meta data
    var metaHTML = ''
    if (shortName) {
      metaHTML += '<strong>Name:</strong>&nbsp;' + shortName
    }
    if (appVersion) {
      metaHTML += ' <strong>Version:</strong>&nbsp;' + appVersion
    }
		if (versions) {
			metaHTML += ' <strong>Versions:</strong>&nbsp;' + versions
		}
    if (appLibraries.length > 0) {
      metaHTML += ' <strong>Libraries:</strong>'
      var first = true
      appLibraries.forEach(lib => {
        if (first) {
          metaHTML += '&nbsp;'
          first = false
        } else {
          metaHTML += ',&nbsp;'
        }
        metaHTML += lib.name + ' (' + lib.version + ')'
      })
    }
    if (isLocal && options.path) {
      metaHTML += ' <strong>Path:</strong>&nbsp;' + options.path
    }
    
		// Different CSS classes for entry content
		var entryContentClass = 'entry-content'
		if (isLibrary) {
		  entryContentClass += '-libraries'
		} else if (!isLocal) {
		  entryContentClass += '-examples'
		}
		
		html += `<div class="${entryContentClass}"><h4>${appTitle}</h4>`
		html += `<p>${appDescription}</p>`
		html += '<p>'
		if (metaHTML.length > 0) {
		  html += metaHTML.trim()
		}
    html += `<span style="float:right">${tagsHTML}</span></p>`
    html += '<div class="project-list-entry-path" style="display:none;">' + options.path + '</div>'
		html += '</div>'
		// Create element.
		var element = hyper.UI.$(html)

		// Insert element first in list.
		options.screen && hyper.UI.$(options.screen).append(element)
	}

	// Get last part of path. Purpose is to make path fit
	// inside a project list item.
	// TODO: We don't use this anymore, but keeping it for later
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

	hyper.UI.getTitleFromFile = function(path)
	{
			return APP_SETTINGS.getTitle(path)
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

	hyper.UI.addProject = function(path) {
		var dir
		if (FILEUTIL.fileIsHTML(path) || FILEUTIL.fileIsEvothingsSettings(path)) {
			var dir = PATH.dirname(path)
		} else if (FILEUTIL.fileIsDirectory(path)) {
			dir = path
		}
		// If duplicate, then warn and offer to fix - otherwise bail out
		if (hyper.UI.duplicateUUID(dir)) {
			var doit = "Yes, please fix it"
			var answer = MAIN.openWorkbenchDialog('Duplicate UUID',
				'Generate a new UUID?',
				`The evothings.json file for this new project has a duplicate UUID. This can happen if you copied the whole app directory using tools outside Evothings. The easy fix is to just generate a new unique UUID.\n\nShould we generate a new UUID?`, 'question', [doit, "Cancel"])
			if (answer = doit) {
				APP_SETTINGS.generateNewAppUUID(dir)
			} else {
				return // Do NOT add project
			}
		}
		// Add the path to the project list.
		if (FILEUTIL.fileIsHTML(path)) {
			// Add the path, including HTML file, to the project list.
			mProjectList.unshift(path)
		} else {
			mProjectList.unshift(dir)
		}
		saveProjectList()
	}

	hyper.UI.duplicateUUID = function(path) {
		var newUUID = APP_SETTINGS.getAppID(path)
		for (let p of mProjectList) {
			// p can actually be == path, since the Studio may have an old entry
			// pointing to this new path (if you copy stuff around too much!)
			if (p != path && APP_SETTINGS.getAppID(p) == newUUID) {
				return true
			}
		}
		return false
	}

	hyper.UI.setProjectList = function(list) {
		mProjectList = list
		saveProjectList()
	}

	hyper.UI.getProjectList = function() {
		return mProjectList
	}

	/**
	 * Get path to the Workbench application directory.
	 */
	hyper.UI.getWorkbenchPath = function(path)
	{
		return mWorkbenchPath
	}

	/**
	 * Edit app in VS Code, either a file path or dir path.
	 */
	hyper.UI.editApp = function(path) {
		var error = null
		cmd = SETTINGS.getEditorCommand()
		const edit = CHILD_PROCESS.spawn(cmd, [path], {
  		cwd: PATH.dirname(path),
  		env: process.env
		})
		edit.on('error', (err) => {
			error = err
			console.log(`Spawn of editor exited with error: ${err}`);
		})
		edit.on('close', (code) => {
			console.log(`Spawn of editor exited with code ${code}`);
			// If we fail then... let's check
			if (code != 0) {
				hyper.UI.checkVSCode(code, error)
			}
		})
	}

	/**
	 * Check for VS Code and offer download
	 */
	hyper.UI.checkVSCode = function(code, error) {
		var haveVSCode = UTIL.haveVSCode()
		var cmd = SETTINGS.getEditorCommand()
		if (cmd == 'code') {
			var doit = "Ok, open download page(s)"
			// Verify we have it
			if (!haveVSCode) {
				var osx = ''
				if (process.platform == 'darwin') {
					osx = "You also need to open Command Palette (under View) and type in 'shell command' and pick 'Shell Command: Install code command in PATH'" 
				}
				var res = MAIN.openWorkbenchDialog('Tools',
					'Install Visual Studio Code?',
					`Visual Studio Code works great together with Evothings and we recommend it as a good lightweight open source cross platform IDE.\n\nInstallation is easy, just download and run appropriate installer.${osx}\n\nThen try edit again!\n\nFor other editors, change Editor Command under settings.`, 'question', [doit, "Cancel"])
				if (res == doit) {
					hyper.UI.openInBrowser('https://code.visualstudio.com/Download')
				} else {
					return // Cancel button
				}
			} else {
				MAIN.openWorkbenchDialog('Tools',
					'Visual Studio Code failed',
					`Visual Studio Code failed with exit code ${code} and error: ${error}.`, 'warning', ["Ok"])
			}
		} else {
			MAIN.openWorkbenchDialog('Tools',
					'Opening Editor failed',
					`Your editor command '${cmd}̈́ failed with exit code ${code} and error: ${error}.`, 'warning', ["Ok"])
		}
	}

	hyper.UI.toggleEntryMenu = function(menuId)
	{
		$('#' + menuId).toggle()
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

		// We want to show the folder but need an item in it to show,
		// we use either evothings.json or index.html
		if (FILEUTIL.pathExists(PATH.join(path, 'evothings.json'))) {
			SHELL.showItemInFolder(PATH.join(path, 'evothings.json'))
	  } else if (FILEUTIL.pathExists(PATH.join(path, 'index.html'))) {
	    SHELL.showItemInFolder(PATH.join(path, 'index.html'))
	  } else {
	    // This will show the parent folder, but so be it!
	    SHELL.showItemInFolder(path)
	  }
	}

	hyper.UI.setRemoteServerURL = function(url)
	{
		SERVER.setRemoteServerURL(url)
	}

	hyper.UI.openConsoleWindow = function()
	{
		MAIN.openConsoleWindow()
	}

	hyper.UI.openViewersWindow = function()
	{
		MAIN.openViewersWindow()
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
				  true,
				  false,
//					'file://',
					{
						dirOrFile: path,
					  path: FILEUTIL.getAppDirectory(path),
					  active: (path == hyper.UI.activeAppPath),
						screen: '#screen-projects',
						openButton: true,
						docButton: true,
						deleteButton: true,
						runButton: true
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

  hyper.UI.updateNewsList = function(silent)
  {
    // Clear out
    hyper.UI.mNewsList = []

    // Get an array of promises for fetching the lists
   	var urls = SETTINGS.getNewsLists()
   	
   	for (url of urls) {
   	  UTIL.getJSON(url).then(listAndUrl => {
        var list = listAndUrl[0]
        var url = listAndUrl[1]
        // Embed the URL we got them from
        for (entry of list) {
          entry.url = url
        }
        
        // Concatenate with full list
  	    hyper.UI.mNewsList = hyper.UI.mNewsList.concat(list)

        // And finally show them too
        hyper.UI.displayNewsList()
   	  }, statusAndUrl => {
    	  LOGGER.log('[main-window-func.js] Error in updateNewsList: ' + statusAndUrl[0] + ' downloading: ' + statusAndUrl[1])
        if (!silent) {
          UTIL.alertDownloadError('Something went wrong downloading news list.', statusAndUrl[1], statusAndUrl[0])
    	  }
      })
   	}
  }

	hyper.UI.displayNewsList = function() {
		// Repopulate screen
		var screen = hyper.UI.$('#screen-news')
		var entries = []

		// Fetch content for each, put each in sorted list and display
	  for (let entry of hyper.UI.mNewsList) {
			UTIL.getJSON(entry.contentUrl, 'html').then(function(contentAndUrl) {
				entry.content = contentAndUrl[0]

    	  // Push and sort them on stamp (UTC seconds)
				entries.push(entry)
        entries.sort(function(a, b) { return a.stamp - b.stamp })

				// And redisplay them all, yes we will do this a bunch of redundant times...
				screen.empty()
				for (let en of entries) {
					screen.append(createNewsEntry(en))
				}
			}, function(err) {
				console.log('unable to download news item content')
			})
	  }
	}

function createNewsEntry(item) {
		// Create div tag for news items.
		var now = new Date(item.stamp)
		var html = '<div class="project-entry ui-state-default ui-corner-all">'
		html += `<div class="app-icon" style="background-image: url(\'${item.iconUrl}\');"></div>`
		html += `<div class="entry-content-examples"><h4>${item.title}</h4><h5>${now.toLocaleString()}</h5>`
		html += `<p>${item.content}</p>`
		if (item.newsUrl) {
			html +=
					'<button type="button" '
					+ 'class="button-doc-lib btn et-btn-yellow-dark entry-button" '
					+ `onclick="window.hyper.UI.openDocURL('${item.newsUrl}')">`
					+	'More</button>'
		}
		html += '</div>'

		// Create element.
		return hyper.UI.$(html)
	}

  hyper.UI.updatePluginList = function(silent) {
    // Clear out
    hyper.UI.mPluginList = []

    // Get an array of promises for fetching the lists
   	var urls = SETTINGS.getPluginLists()
   	
   	for (url of urls) {
   	  UTIL.getJSON(url).then(listAndUrl => {
        var list = listAndUrl[0]
        var url = listAndUrl[1]
        // Embed the URL we got them from
        for (entry of list) {
          entry.url = url
        }
        
        // Concatenate with full list
  	    hyper.UI.mPluginList = hyper.UI.mPluginList.concat(list)
  	    
    	  // Then we can sort them
        hyper.UI.mPluginList.sort(function(a, b) { return a.name.localeCompare(b.name); })
   	  }, statusAndUrl => {
    	  LOGGER.log('[main-window-func.js] Error in updatePluginList: ' + statusAndUrl[0] + ' downloading: ' + statusAndUrl[1])
        if (!silent) {
          UTIL.alertDownloadError('Something went wrong downloading plugin list.', statusAndUrl[1], statusAndUrl[0])
    	  }
      })
   	}
  }

  hyper.UI.updateBuildConfigList = function(silent) {
    // Clear out
    hyper.UI.mBuildConfigList = []

    // Get an array of promises for fetching the lists
   	var urls = SETTINGS.getBuildConfigLists()
   	
   	for (url of urls) {
   	  UTIL.getJSON(url).then(listAndUrl => {
        var list = listAndUrl[0]
        var url = listAndUrl[1]
        // Embed the URL we got them from
        for (entry of list) {
          entry.url = url
        }
        
        // Concatenate with full list
  	    hyper.UI.mBuildConfigList = hyper.UI.mBuildConfigList.concat(list)
  	    
    	  // Then we can sort them
        hyper.UI.mBuildConfigList.sort(function(a, b) { return a.name.localeCompare(b.name); })
   	  }, statusAndUrl => {
    	  LOGGER.log('[main-window-func.js] Error in updateBuildConfigList: ' + statusAndUrl[0] + ' downloading: ' + statusAndUrl[1])
        if (!silent) {
          UTIL.alertDownloadError('Something went wrong downloading build config list.', statusAndUrl[1], statusAndUrl[0])
    	  }
      })
   	}
  }

  hyper.UI.updateExampleList = function(silent)
  {
    // Clear out
    hyper.UI.mExampleList = []

    // Get an array of promises for fetching the lists
   	var urls = SETTINGS.getExampleLists()
   	
   	for (url of urls) {
   	  UTIL.getJSON(url).then(listAndUrl => {
        var list = listAndUrl[0]
        var url = listAndUrl[1]
        // Embed the URL we got them from
        for (entry of list) {
          entry.url = url
        }
        
        // Concatenate with full list
  	    hyper.UI.mExampleList = hyper.UI.mExampleList.concat(list)
  	    
    	  // Then we can sort them but place all "Hello*" apps first
        hyper.UI.mExampleList.sort(function(a, b) {
          if (a.title.substring(0, 5) == "Hello") {
            return -1
          }
          if (b.title.substring(0, 5) == "Hello") {
            return 1
          }        
          return a.title.localeCompare(b.title);
        })
        // And finally show them too
        hyper.UI.displayExampleList()
   	  }, statusAndUrl => {
    	  LOGGER.log('[main-window-func.js] Error in updateExampleList: ' + statusAndUrl[0] + ' downloading: ' + statusAndUrl[1])
        if (!silent) {
          UTIL.alertDownloadError('Something went wrong downloading example list.', statusAndUrl[1], statusAndUrl[0])
    	  }
      })
   	}
  }

	hyper.UI.displayExampleList = function()
	{
		// Clear current list.
		hyper.UI.$('#screen-examples').empty()

    // Fallback base if example doesn't have doc-url
    // We do not use this now, it needs to be in evothings.json
	  //var baseDoc = MAIN.DOC + "/examples/"
	  for (let entry of hyper.UI.mExampleList) {
		  createProjectEntry(
		    false,
		    false,
			  {
			    name: entry.name,
			    path: entry.name, // Note that we only have name here
			    url: entry.url,   // This is the base URL where we loaded it from
			    title: entry.title,
			    version: entry.version,
			    description: entry.description,
			    tags: entry.tags,
			    libraries: entry.libraries,
			    docURL: entry['doc-url'], // || baseDoc + entry.name + '.html',
			    imagePath: entry.icon,
			    active: false,
				  screen: '#screen-examples',
				  docButton: true,
				  copyButton: true,
				  runButton: true
			  }
			)
	  }
	}
	
	hyper.UI.updateLibraryList = function(silent)
  {
    // Clear out
    hyper.UI.mLibraryList = []

    // Get an array of promises for fetching the lists
   	var urls = SETTINGS.getLibraryLists()
   	var lastUrl = urls[urls.length - 1]
   	for (url of urls) {
   	  UTIL.getJSON(url).then(listAndUrl => {
        var list = listAndUrl[0]
        var url = listAndUrl[1]
        // Embed the URL we got them from
        for (entry of list) {
          entry.url = url
        }
        
        // Concatenate with full list
  	    hyper.UI.mLibraryList = hyper.UI.mLibraryList.concat(list)
  	    
    	  // Then we can sort them
        hyper.UI.mLibraryList.sort(function(a, b) {
          return a.title.localeCompare(b.title);
        })
        // And finally show them too
        hyper.UI.displayLibraryList()
        
        // Silly but it works, if this was the last url we clear the flag
        if (url == lastUrl) {
          mUpdatingLists = false
        }
   	  }, statusAndUrl => {
    	  LOGGER.log('[main-window-func.js] Error in updateLibraryList: ' + statusAndUrl[0] + ' downloading: ' + statusAndUrl[1])
        if (!silent) {
          UTIL.alertDownloadError('Something went wrong downloading library list', statusAndUrl[1], statusAndUrl[0])
    	  }
      })
   	}
  }

	hyper.UI.displayLibraryList = function()
	{
		// Clear current list.
		hyper.UI.$('#screen-libraries').empty()

    // Fallback base if library doesn't have doc-url
    // We do not use this now, it needs to be in evothings.json
	  //var baseDoc = MAIN.DOC + "/libraries/"
    for (let entry of hyper.UI.mLibraryList) {
		  createProjectEntry(
		    false,
		    true,
			  {
			    name: entry.name,
			    path: entry.name,  // Note that we only have name here
			    url: entry.url,   // This is the base URL where we loaded it from
			    title: entry.title,
			    versions: entry.versions,
			    description: entry.description,
			    tags: entry.tags,
			    docURL: entry['doc-url'], //|| baseDoc + entry.name + '.html',
			    imagePath: entry.icon,
			    active: false,
				  screen: '#screen-libraries',
				  docButton: true,
				  copyButton: false,
				  runButton: false
			  }
			)
	  }
	}

	hyper.UI.setServerMessageFun = function()
	{
		// Set server message callback to forward message to the Workbench.
		hyper.SERVER.setMessageCallbackFun(function(msg) {
		  ipcRenderer.send('console-window', msg);
		  // TODO: Send string do JSON.stringify on msg.
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
		hyper.UI.$('#input-setting-author-name').val(SETTINGS.getAuthorName())
		hyper.UI.$('#input-setting-author-email').val(SETTINGS.getAuthorEmail())
		hyper.UI.$('#input-setting-author-url').val(SETTINGS.getAuthorURL())
		hyper.UI.$('#input-setting-cordova-prefix').val(SETTINGS.getCordovaPrefix())
		hyper.UI.$('#input-setting-editor-command').val(SETTINGS.getEditorCommand())

		hyper.UI.$('#input-setting-keystore-filename').val(SETTINGS.getKeystoreFilename())
		hyper.UI.$('#input-setting-keystore-create-command').val(SETTINGS.getKeystoreCreateCommand())
		hyper.UI.$('#input-setting-keypassword').val(SETTINGS.getKeyPassword())
		hyper.UI.$('#input-setting-storepassword').val(SETTINGS.getStorePassword())
		hyper.UI.$('#input-setting-keystore-distinguished-name').val(SETTINGS.getDistinguishedName())
		hyper.UI.$('#input-setting-keystore-jarsigner-sign-command').val(SETTINGS.getJarSignCommand())
		hyper.UI.$('#input-setting-keystore-jarsigner-verify-command').val(SETTINGS.getJarVerifyCommand())

		hyper.UI.$('#input-setting-javascript-workbench-font-size').val(SETTINGS.getWorkbenchFontSize())
		hyper.UI.$('#input-setting-number-of-directory-levels').val(SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		hyper.UI.$('#input-setting-my-apps-path').val(SETTINGS.getMyAppsPath())
		hyper.UI.$('#input-setting-reload-server-address').val(SETTINGS.getReloadServerAddress())
		hyper.UI.$('#input-setting-repository-urls').val(SETTINGS.getRepositoryURLs())
		var $radios = $('input:radio[name=protocol]')
		var checked = SETTINGS.getRunProtocol()
		console.log('-- protocol setting is')
		console.log(JSON.stringify(checked))
		$radios.filter('[value='+checked+']').prop('checked', true)

		// Show settings dialog.
		hyper.UI.$('#dialog-settings').modal('show')
	}

	hyper.UI.saveSettings = function()
	{
		var keyPassword = hyper.UI.$('#input-setting-keypassword').val()
		var storePassword = hyper.UI.$('#input-setting-storepassword').val()
		if (keyPassword.length > 0) {
			if (keyPassword.length < 6) {
				window.alert('The key password needs to be at least 6 characters long.')
				return
			}
		}
		if (storePassword.length > 0) {
			if (storePassword.length < 6) {
 	    	window.alert('The key store password needs to be at least 6 characters long.')
				return
			}
		}
		var cordovaPrefix = hyper.UI.$('#input-setting-cordova-prefix').val()

		if (!reverseDomainRE.test(cordovaPrefix)) {
 	    window.alert('The Cordova prefix should be in reverse domain style like "com.acme.dev" with no ending period. Letters and digits are allowed.')
			return
		}
		// Hide settings dialog.
		hyper.UI.$('#dialog-settings').modal('hide')

		SETTINGS.setAuthorName(hyper.UI.$('#input-setting-author-name').val())
		SETTINGS.setAuthorEmail(hyper.UI.$('#input-setting-author-email').val())
		SETTINGS.setAuthorURL(hyper.UI.$('#input-setting-author-url').val())
		SETTINGS.setCordovaPrefix(cordovaPrefix)
		SETTINGS.setEditorCommand(hyper.UI.$('#input-setting-editor-command').val())
		SETTINGS.setKeystoreFilename(hyper.UI.$('#input-setting-keystore-filename').val())
		SETTINGS.setKeystoreCreateCommand(hyper.UI.$('#input-setting-keystore-create-command').val())
		SETTINGS.setKeyPassword(keyPassword)
		SETTINGS.setStorePassword(storePassword)
		SETTINGS.setDistinguishedName(hyper.UI.$('#input-setting-keystore-distinguished-name').val())
		SETTINGS.setJarSignCommand(hyper.UI.$('#input-setting-keystore-jarsigner-sign-command').val())
		SETTINGS.setJarVerifyCommand(hyper.UI.$('#input-setting-keystore-jarsigner-verify-command').val())

		// TODO: Make this take effect instantly.
		SETTINGS.setWorkbenchFontSize(hyper.UI.$('#input-setting-javascript-workbench-font-size').val())

		// TODO: Make this take effect instantly.
		SETTINGS.setNumberOfDirecoryLevelsToTraverse(parseInt(hyper.UI.$('#input-setting-number-of-directory-levels').val()))

		SETTINGS.setMyAppsPath(hyper.UI.$('#input-setting-my-apps-path').val())
		
		var newUrls = hyper.UI.$('#input-setting-repository-urls').val()
		var oldUrls = SETTINGS.getRepositoryURLs()
		if (newUrls != oldUrls) {
  		SETTINGS.setRepositoryURLs(newUrls)
  		updateLists(false)
	  }

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
		SETTINGS.setRunProtocol($('input[name=protocol]:checked').val())
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

	hyper.UI.openDocURL = function(url)
	{
		hyper.UI.openInBrowser(url)
	}

	hyper.UI.openCopyAppDialog = function(path, shortName)
	{
		// Set sourcePath and folder name of app to copy.
		var sourcePath = path
		var appFolderName = PATH.basename(sourcePath)
		var myAppsDir = SETTINGS.getMyAppsPath()

		// Set dialog box fields.
		hyper.UI.$('#input-copy-app-source-path').val(path) // Hidden field.
		hyper.UI.$('#input-copy-app-name').val(shortName)
		hyper.UI.$('#input-copy-app-target-folder').val(appFolderName)
		hyper.UI.$('#input-copy-app-target-parent-folder').val(myAppsDir)

		// Show dialog.
		hyper.UI.$('#dialog-copy-app').modal('show')
	}

  hyper.UI.changeCopyApp = function()
	{
		var defaultDir = hyper.UI.$('#input-copy-app-target-parent-folder').val()
    var dir = MAIN.selectOrCreateFolder('Please select or create a folder', defaultDir)
    if (dir) {
      hyper.UI.$('#input-copy-app-target-parent-folder').val(dir)
    }
    return
  }
	
	hyper.UI.saveCopyApp = function()
	{
		// Set up source and target paths.
		var sourcePath = hyper.UI.$('#input-copy-app-source-path').val()
		var targetShortName = hyper.UI.$('#input-copy-app-name').val()
		var targetAppFolder = hyper.UI.$('#input-copy-app-target-folder').val()
		var targetParentDir = hyper.UI.$('#input-copy-app-target-parent-folder').val()
		var targetDir = PATH.join(targetParentDir, targetAppFolder)

    // Name is empty
    if (!targetShortName) {
      window.alert('You need to enter a short name for the app.')
			return // Abort (dialog is still visible)
    }

    // App folder is empty
    if (!targetAppFolder) {
      window.alert('You need to enter a name for the destination folder.')
			return // Abort (dialog is still visible)
    }
    
    // Parent folder is empty
    if (!targetParentDir) {
      window.alert('You need to enter or select a parent folder.')
			return // Abort (dialog is still visible)
    }

		// If target parent folder does not exist, display an alert dialog and abort.
		if (!FILEUTIL.pathExists(targetParentDir))
		{
			window.alert('The parent folder does not exist, please change folder.')
			return // Abort (dialog is still visible)
		}

		// If target folder exists, display an alert dialog and abort.
		if (FILEUTIL.pathExists(targetDir))
		{
			window.alert('An app with this folder name already exists, please type a new folder name.')
			return // Abort (dialog is still visible)
		}

		// Copy the app, if sourcePath is relative it will copy from Evothings website
		copyApp(sourcePath, targetDir, function() {
			// Set new name
			APP_SETTINGS.setName(targetDir, targetShortName)

		  // Hide dialog.
		  hyper.UI.$('#dialog-copy-app').modal('hide')

		  // Show the "My Apps" screen.
		  showMyApps()
		})
	}

	// SourcePath is either an absolut path to a directory or a relative path
	// to an example app hosted at evothings.com.
	function copyApp(sourcePath, targetDir, cb)
	{
	  // If it's not absolute we copy from Evothings.com
	  if (!FILEUTIL.isPathAbsolute(sourcePath)) {
			copyAppFromURL(MAIN.BASE + '/examples/' + sourcePath, targetDir, function() {
        // Make a new uuid in evothings.json in the copied app.
        // This is done to prevent duplicated app uuids.
        APP_SETTINGS.generateNewAppUUID(targetDir)
        // Add path to "My Apps".
        hyper.UI.addProject(targetDir)
        // Callback
		    cb()
      })
		} else {
		  try {
			  var appFolderName = PATH.basename(sourcePath)
			  // Copy files.
			  FSEXTRA.copySync(sourcePath, targetDir)
			  // Make a new uuid in evothings.json in the copied app.
			  // This is done to prevent duplicated app uuids.
			  APP_SETTINGS.generateNewAppUUID(targetDir)
			  // Add path to "My Apps".
			  hyper.UI.addProject(targetDir)
			  // Callback
			  cb()
		  } catch (error) {
			  window.alert('Something went wrong, could not save app.')
			  LOGGER.log('[main-window-func.js] Error in copyApp: ' + error)
		  }
		}
	}

	hyper.UI.runExampleApp = function (path) {
	  TEMP.mkdir('evorunexample', function(err, dirPath) {
      var tempDir = PATH.join(dirPath, PATH.basename(path))
      copyAppFromURL(MAIN.BASE + '/examples/' + path, tempDir, function() {
        hyper.UI.runApp(tempDir)
      })
    })
  }
      

	function copyAppFromURL(sourceURL, targetDir, cb) {
	  try {
		  // Download zip to temp
		  sourceURL = sourceURL + '.zip'
		  UTIL.download(sourceURL, (zipFile, err) => {
		    if (err) {
    		  UTIL.alertDownloadError('Something went wrong, could not download app.', sourceURL, err)
    		  LOGGER.log('[main-window-func.js] Error in copyAppFromURL: ' + err)
    		} else {		    
    		  // Extract into targetDir
    		  FS.mkdirSync(targetDir)
	    	  UTIL.unzip(zipFile, targetDir, function(err) {
	  		    if (err) {
	  		      // TODO: This doesn't seem to work
	  		      FSEXTRA.removeSync(targetDir)
        		  window.alert('Something went wrong when unzipping app.')
        		  LOGGER.log('[main-window-func.js] Error in copyAppFromURL: ' + err)
        		} else {       
		          //Callback
		          cb()
		        }
		      })
		    }
	  	})
	  } catch (error) {
		  window.alert('Something went wrong, could not download and unzip app.')
		  LOGGER.log('[main-window-func.js] Error in copyAppFromURL: ' + error)
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
		var path = SETTINGS.getMyAppsPath()
		hyper.UI.$('#input-new-app-name').val(null)
		hyper.UI.$('#input-new-app-folder').val(null)
		hyper.UI.$('#input-new-app-parent-folder').val(path)

		// Copy over from name field if folder name field is empty				
    hyper.UI.$('#input-new-app-name').on('change', function() {
			if (!hyper.UI.$('#input-new-app-folder').val()) {
				hyper.UI.$('#input-new-app-folder').val(hyper.UI.$('#input-new-app-name').val())
			}
		})

		// Show dialog.
		hyper.UI.$('#dialog-new-app').modal('show')
	}
	
  hyper.UI.changeNewApp = function()
	{
		var defaultDir = hyper.UI.$('#input-new-app-parent-folder').val()
    var dir = MAIN.selectOrCreateFolder('Please select or create a folder', defaultDir)
    if (dir) {
      hyper.UI.$('#input-new-app-parent-folder').val(dir)
    }
    return
  }

	hyper.UI.saveNewApp = function()
	{
		var sourcePath = 'template-basic-app'
		var shortName = hyper.UI.$('#input-new-app-name').val()
		var appFolder = hyper.UI.$('#input-new-app-folder').val()
		var parentFolder = hyper.UI.$('#input-new-app-parent-folder').val()

		var targetDir = PATH.join(parentFolder, appFolder)

    // App name is empty
    if (!shortName) {
      window.alert('You need to enter a short name for the app.')
			return // Abort (dialog is still visible)
    }

    // App folder is empty
    if (!appFolder) {
      window.alert('You need to enter a name for the app folder.')
			return // Abort (dialog is still visible)
    }
    
    // Parent folder is empty
    if (!parentFolder) {
      window.alert('You need to enter or select a parent folder.')
			return // Abort (dialog is still visible)
    }

		// If target parent folder does not exist, display an alert dialog and abort.
		if (!FILEUTIL.pathExists(parentFolder))
		{
			window.alert('The parent folder does not exist, please change folder.')
			return // Abort (dialog is still visible)
		}

		// If target folder exists, display an alert dialog and abort.
		if (FILEUTIL.pathExists(targetDir))
		{
			window.alert('An app with this folder name already exists, please type a new folder name.')
			return // Abort (dialog is still visible)
		}

		// Copy files.
		copyApp(sourcePath, targetDir, function() {
			// Set new name
			APP_SETTINGS.setName(targetDir, shortName)

		  // Hide dialog.
		  hyper.UI.$('#dialog-new-app').modal('hide')

		  // Show the "My Apps" screen.
		  showMyApps()
		})
	}

	// Try to produce a proper Cordova Widget id (reverse domain style) from str
	hyper.UI.sanitizeForCordovaID = function(str) {
		// Replace non conforming characters with "."
		var result = str.replace(/[^a-zA-Z0-9\.]/g, '.')
		// Not needed, Cordova id can handle case: result = result.toLowerCase()
		// Collapse multiple ".." to a single "."
		result = result.replace(/\.+/g, '.')
		// Remove leading and trailing "."
		return result.replace(/(^\.|\.$)/g, '')
	}

  hyper.UI.openConfigAppDialog = function(dirOrFile) {
		var path = FILEUTIL.getAppDirectory(dirOrFile)
		// Trying to be clever with coming up with a name if missing
		var name = APP_SETTINGS.getName(path) || PATH.basename(dirOrFile)
		if (name.startsWith('index.htm')) {
			name = PATH.basename(path)
		}
		// Populate input fields.
		hyper.UI.$('#input-config-app-path').val(path) // Hidden field.
    hyper.UI.$('#input-config-app-name').val(name)
		hyper.UI.$('#input-config-app-title').val(APP_SETTINGS.getTitle(dirOrFile))
		hyper.UI.$('#input-config-app-cordova-id').val(
			APP_SETTINGS.getCordovaID(path) ||
			SETTINGS.getCordovaPrefix() + "." + hyper.UI.sanitizeForCordovaID(name))

    hyper.UI.$('#input-config-app-description').val(APP_SETTINGS.getDescription(path) || 'App oneline description.')
    hyper.UI.$('#input-config-app-long-description').val(APP_SETTINGS.getLongDescription(path) || 'App long description.')
		hyper.UI.$('#input-config-app-version').val(APP_SETTINGS.getVersion(path))

    hyper.UI.$('#input-config-app-author-name').val(APP_SETTINGS.getAuthorName(path) || SETTINGS.getAuthorName())
    hyper.UI.$('#input-config-app-author-email').val(APP_SETTINGS.getAuthorEmail(path) || SETTINGS.getAuthorEmail())
		hyper.UI.$('#input-config-app-author-url').val(APP_SETTINGS.getAuthorURL(path) || SETTINGS.getAuthorURL())
		
    // Use jQuery to create plugins checkboxes
    hyper.UI.$('#input-config-app-plugins').empty()
    var plugins = APP_SETTINGS.getPlugins(path)
    var html = ''
    var count = 0
    for (plugin of hyper.UI.mPluginList) {
      var checked = ''
      var usedVersion = plugin.version
      if (plugins) {
        // Ok, the app has a list of plugins we can check against
        var usedPlugin = plugins.find(each => each.name == plugin.name)
      }
			// If more versions are available, we list each separately
			if (plugin.versions) {
				for (ver of plugin.versions) {
					if (usedPlugin && usedPlugin.version == ver) {
						checked = `checked="checked"`
					} else {
						checked = ''
					}
					count++
		      html += `<div class="checkbox">
  <input type="checkbox" ${checked} id="input-config-app-plugin-${count}" data-plugin="${plugin.name}" data-version="${ver}">
	<label for="input-config-app-plugin-${count}">${plugin.name} (${ver}) - ${plugin.description}</label></div>`
				}
			} else {
				// Otherwise we just make one listing without version
				if (usedPlugin) {
						checked = `checked="checked"`
				}
				count++
	      html += `<div class="checkbox">
  <input type="checkbox" ${checked} id="input-config-app-plugin-${count}" data-plugin="${plugin.name}">
	<label for="input-config-app-plugin-${count}">${plugin.name} - ${plugin.description}</label></div>`
			}
    }
    // Create and insert HTML
		var element = hyper.UI.$(html)
		hyper.UI.$('#input-config-app-plugins').append(element)

    // Use jQuery to create library checkboxes
    hyper.UI.$('#input-config-app-libraries').empty()
    var libs = APP_SETTINGS.getLibraries(path) || []
    var html = ''
    var count = 0
    for (lib of hyper.UI.mLibraryList) {
      var checked = ''
      // Ok, the app has a list of libraries we can check against
      var usedLib = libs.find(each => each.name == lib.name)
			// If more versions are available, we list each separately
			for (ver of lib.versions) {
				if (usedLib && usedLib.version == ver) {
					checked = `checked="checked"`
				} else {
					checked = ''
				}
				count++
				html += `<div class="checkbox">
		<input type="checkbox" ${checked} id="input-config-app-library-${count}" data-lib="${lib.name}" data-version="${ver}"> 
			<label for="input-config-app-library-${count}">
				${lib.title} (${ver}) - ${lib.description}
			</label>
	</div>`
			}
    }
    // Create and insert HTML
		var element = hyper.UI.$(html)
		hyper.UI.$('#input-config-app-libraries').append(element)
		
		// Show dialog.
		hyper.UI.$('#dialog-config-app').modal('show')
	}

	hyper.UI.saveConfigApp = function() {
		var path = hyper.UI.$('#input-config-app-path').val()
		var name = hyper.UI.$('#input-config-app-name').val()
		var title = hyper.UI.$('#input-config-app-title').val()
		var description = hyper.UI.$('#input-config-app-description').val()
		var longDescription = hyper.UI.$('#input-config-app-long-description').val()
		var version = hyper.UI.$('#input-config-app-version').val()
		var authorName = hyper.UI.$('#input-config-app-author-name').val()
		var authorEmail = hyper.UI.$('#input-config-app-author-email').val()
		var authorURL = hyper.UI.$('#input-config-app-author-url').val()
		var cordovaID = hyper.UI.$('#input-config-app-cordova-id').val()

		if (!reverseDomainRE.test(cordovaID)) {
 	    window.alert('The Cordova ID should be in reverse domain style like "com.acme.dev" with no ending period. Letters and digits are allowed.')
			return
		}

		if (title.length < 3 || title.length > 30) {
			window.alert(`The app title is ${title.length} characters but should be 3-30 characters long.`)
			return
		}

		if (description.length < 10 || description.length > 80) {
			window.alert(`The one line description is ${description.length} characters but should be 10-80 characters long.`)
			return
		}

		if (longDescription.length < 10 || longDescription.length > 4000) {
			window.alert(`The long description is ${longDescription.length} characters should be 10-4000 characters long.`)
			return
		}

    if (/[^a-z0-9\_\-]/.test(name)) {
      window.alert('The app short name should only consist of lower case letters, digits, underscores and dashes.')
      // This is just to try to make it match the regexp test
      var newName = name.replace(/\s/g, '-')
      newName = newName.toLowerCase()
      hyper.UI.$('#input-config-app-name').val(newName)
	  	return // Abort (dialog is still visible)
    }

    if (version.length > 0 && !SEMVER_REGEX().test(version)) {
      window.alert('The version should follow semantic versioning style in the form of MAJOR.MINOR.PATCH, see semver.org for details.')
      // This is just to try to make it match the regexp test
      var newVersion = version.replace(/\s/g, '-')
      hyper.UI.$('#input-config-app-version').val(newVersion)
	  	return // Abort (dialog is still visible)
    }

    // Collect checked plugins
    var checkboxes = hyper.UI.$('#input-config-app-plugins').find('input')
    var plugins = []
    checkboxes.each(function () {
      var pluginName = this.getAttribute('data-plugin')
      var pluginVersion = this.getAttribute('data-version')
      var pluginLocation = this.getAttribute('data-location')
      if (this.checked) {
				var p = {"name": pluginName}
				if (pluginVersion) {
					p["version"] = pluginVersion
				}
				if (pluginLocation) {
					p["location"] = pluginLocation
				}
        plugins.push(p)
      }
    })

		// We can today select multiple versions - prevent that
		var names = new Set()
		for (let p of plugins) {
			if (names.has(p.name)) {
				window.alert(`You can only have one version of ${p.name}.`)
				return
			}
			names.add(p.name)
		}

    // Collect checked libs
    var checkboxes = hyper.UI.$('#input-config-app-libraries').find('input')
    var libs = []
    checkboxes.each(function () {
      var libname = this.getAttribute('data-lib')
      var libversion = this.getAttribute('data-version')
      if (this.checked) {
        libs.push({ "name": libname, "version": libversion })
      }
    })

		// We can today select multiple versions - prevent that
		var names = new Set()
		for (let l of libs) {
			if (names.has(l.name)) {
				window.alert(`You can only have one version of ${l.name}.`)
				return
			}
			names.add(l.name)
		}

  	// Hide dialog.
		hyper.UI.$('#dialog-config-app').modal('hide')

    // Apply new plugins to app
    if (hyper.UI.applyPlugins(path, APP_SETTINGS.getPlugins(path) || [], plugins)) {
      // Only store metadata changes to plugins if we could apply them
      APP_SETTINGS.setPlugins(path, plugins)
    }

    // Apply new libraries to app
    if (hyper.UI.applyLibraries(path, APP_SETTINGS.getLibraries(path) || [], libs)) {
      // Only store metadata changes to libraries if we could apply them
      APP_SETTINGS.setLibraries(path, libs)
    }

    // Store all meta data
		APP_SETTINGS.getOrCreateAppID(path) // Make sure we have evothings.json
    APP_SETTINGS.setName(path, name)
		APP_SETTINGS.setTitle(path, title)
    APP_SETTINGS.setDescription(path, description)
    APP_SETTINGS.setLongDescription(path, longDescription)
    APP_SETTINGS.setVersion(path, version)
    APP_SETTINGS.setAuthorName(path, authorName)
    APP_SETTINGS.setAuthorEmail(path, authorEmail)
    APP_SETTINGS.setAuthorURL(path, authorURL)
    APP_SETTINGS.setCordovaID(path, cordovaID)

    hyper.UI.displayProjectList()
	}

	hyper.UI.openBuildAppDialog = function(dirOrFile) {
		var path = FILEUTIL.getAppDirectory(dirOrFile)
		if (process.platform == 'win32') {
			MAIN.openWorkbenchDialog('Tools',
				'Build function not yet supported on Windows',
				`Evothings can build the Android apk file for your application, but currently only on OSX and Linux. We will soon release this support also for Windows. Also note that we are working on supporting the iOS build also.`, 'info', ["Ok"])
			return
		}
		if (!APP_SETTINGS.getCordovaID(path)) {
			var doit = "Ok, open config dialog"
			var res = MAIN.openWorkbenchDialog('App configuration needed',
				'Open app configuration dialog?',
				`Evothings can build the Android apk file for your application, but you first need to configure the app, then you can try building again.\n\nOpen the configuration dialog?`, 'question', [doit, "Cancel"])
			if (res == doit) {
				hyper.UI.openConfigAppDialog(dirOrFile)
			}
			return
		}
		// Before we open the dialog, we need to make sure the app itself is built (ES6)
		hyper.UI.buildAppIfNeeded(dirOrFile, null, false, function(error) {
			if (!error) {
				hyper.UI.showTab('build')
				// Verify we have virtualbox, vagrant and evobox ready to run.
				hyper.UI.verifyBuildEnvironment(path, function() {
					// Evobox is up and running, now we can ask user for build details
					// First we find any previous build to copy values from
					var shortName = APP_SETTINGS.getName(path)
					old = hyper.UI.findPreviousBuild(path) || {debug: true, filename: shortName}
					hyper.UI.$('#input-build-app-path').val(path) // Hidden field.
					hyper.UI.$('#input-build-app-name').val(shortName) // Hidden field
					hyper.UI.$('#input-build-app-debug').prop('checked', old.debug)
					hyper.UI.$('#input-build-app-filename').val(old.filename)
					// This one will just have previous value
					//hyper.UI.$('#input-build-app-session').prop('checked', ...)
					hyper.UI.$('#input-build-app-save').prop('checked', false)

					// If we should not remember these fields during the session, we clear them first
					var sessionPasswords = hyper.UI.$('#input-build-app-session').prop('checked')
					if (!sessionPasswords) {
						hyper.UI.$('#input-build-app-storepassword').val('')
						hyper.UI.$('#input-build-app-keypassword').val('')
					}

					// And if we have stored passwords we use them
					var storePassword = SETTINGS.getStorePassword()
					var keyPassword = SETTINGS.getKeyPassword()
					if (storePassword) {
						hyper.UI.$('#input-build-app-storepassword').val(storePassword)
		//				hyper.UI.$('#input-build-app-storepassword-div').hide()
					}
					if (keyPassword) {
						hyper.UI.$('#input-build-app-keypassword').val(keyPassword)
		//				hyper.UI.$('#input-build-app-keypassword-div').hide()
					}

					hyper.UI.$('#dialog-build-app').modal('show')
				})
			}
		})
	}

	hyper.UI.findPreviousBuild = function(path) {
		var reversed = hyper.UI.mBuildList.slice().reverse()
		return reversed.find(each => each.path == path)
	}

	hyper.UI.verifyBuildEnvironment = function(path, cb) {
		var haveVirtualbox = UTIL.haveVirtualbox()
		var haveVagrant = UTIL.haveVagrant()
		var have = ""
		var doit = "Ok, open download page(s)"
		// Verify we have virtualbox and Vagrant
		needVirtualboxOrVagrant = !haveVirtualbox || !haveVagrant
		if (needVirtualboxOrVagrant) {
			var title = 'Install VirtualBox and Vagrant?'
			if (haveVirtualbox) {
				have = '\n\nYou already have Virtualbox, but not Vagrant.'
				title = 'Install Vagrant?'
			}
			if (haveVagrant) {
				have = '\n\nYou already have Vagrant, but not Virtualbox.'
				title = 'Install Virtualbox?'
			}
			var res = MAIN.openWorkbenchDialog('Build Tools',
				title,
				`Evothings can build your app for you but this requires Virtualbox and Vagrant.${have} \n\nInstallation is easy, just download and run appropriate installer.\n\nThen try building again!`, 'question', [doit, "Cancel"])
			if (res == doit) {
				if (!haveVirtualbox) {
					hyper.UI.openInBrowser('https://www.virtualbox.org/wiki/Downloads')
				}
				if (!haveVagrant) {
					hyper.UI.openInBrowser('https://www.vagrantup.com/downloads.html')
				}
				return
			} else {
				return // Cancel button
			}
		}
		// Proceed with box
		hyper.UI.startEvobox(path, cb)
	}

	hyper.UI.startEvobox = function(path, cb) {
		var config = hyper.UI.mBuildConfigList[0]

		// Runs callback after Evobox is up, otherwise alerts
		var myAppsDir = SETTINGS.getMyAppsPath()
		var buildDir = PATH.join(myAppsDir, 'build')
		var evoboxDir = PATH.join(buildDir, config.name)
		var resultDir = PATH.join(evoboxDir, 'result')
		// Make directories if missing
		if (!FS.existsSync(evoboxDir)) {
			try {
				FS.mkdirSync(buildDir)
				FS.mkdirSync(evoboxDir)
				FS.mkdirSync(resultDir)
			} catch (error) {
				window.alert('Something went wrong creating directories for Evobox.')
				LOGGER.log('[main-window-func.js] Error in startEvobox: ' + error)
				return
			}
		}

		var vagrantFile = PATH.join(evoboxDir, 'Vagrantfile')
		if (!FS.existsSync(vagrantFile)) {
			// Explain that this will take some time...
		  var doit = "Ok, go for it"
			var res = MAIN.openWorkbenchDialog('Build Tools', 'Install Evobox?',
				'Evothings runs the build in an isolated Virtualbox VM called Evobox. The download is large but you can track progress in the Build tab. Proceed to download and then run the build in Evobox?', 'question', [doit, "Cancel"])
			if (res == doit) {
				// Run vagrant init to produce Vagrantfile
				try {
					CHILD_PROCESS.execFileSync('vagrant', ['init', 'evobox', config.boxUrl],  {cwd: evoboxDir})
				} catch (er) {
					window.alert('Something went wrong setting up Evobox Vagrant machine:' + er.stdout) 
					return
				}
			} else {
				return
			}
		}

		var buildScript = PATH.join(evoboxDir, 'build.rb')
		// Always download for now
		//if (!FS.existsSync(buildScript)) {
			// Download script
			try {
				UTIL.getJSON(config.scriptUrl, 'application/x-ruby').then(function(contentAndUrl) {
					FS.writeFileSync(buildScript, contentAndUrl[0])
				})
			} catch (er) {
				window.alert('Something went wrong downloading build script:' + er.stdout) 
				return
			}
		//}

		if (!UTIL.isVagrantUp(evoboxDir)) {
			hyper.UI.buildStartTask("Starting Evobox in Vagrant")
			var reUI = /\d+,default,ui,.*,.*default: (.*)/
			var reUPSTART = /\d+,default,action,up,start/
			var reUPEND = /\d+,default,action,up,end/
			// Vagrant up will perform download of Evobox if not done already
			const build = CHILD_PROCESS.spawn('vagrant', ['up', '--machine-readable'], {cwd: evoboxDir})
			build.stdout.on('data', (data) => {
				var s = data.toString()
				var match = s.match(reUI)
				if (match) {
					hyper.UI.buildLog(match[1] + "\n")
				}
				if (s.match(reUPSTART)) {
					hyper.UI.buildStatus("Evobox being started ...")
				}
				if (s.match(reUPEND)) {
					hyper.UI.buildStatus("Evobox started.")
				}
			});
			build.stderr.on('data', (data) => {
				var s = data.toString()
				hyper.UI.buildLog('stderr: ' + s + '\n')
			});
			build.on('close', (code) => {
				if (code != 0) {
					console.log(`child process exited with code ${code}`);
					window.alert('Something went wrong starting Evobox Vagrant machine')
					LOGGER.log('[main-window-func.js] Error in startEvobox')
					return
				} else {
					cb(path, evoboxDir)
				}
			});
		} else {
			cb(path, evoboxDir)
		}
	}

	hyper.UI.currentBuild = function() {
		// Return the currently building build - or null if we aren't busy building
		return hyper.UI.mBuildList.slice().reverse().find(b => {
			return !b.hasOwnProperty('exitCode')
		})
	}

	hyper.UI.saveBuildApp = function() {
		var path = hyper.UI.$('#input-build-app-path').val()
		var name = hyper.UI.$('#input-build-app-name').val()
		var filename = hyper.UI.$('#input-build-app-filename').val()
		var debug = hyper.UI.$('#input-build-app-debug').prop('checked')
		var sessionPasswords = hyper.UI.$('#input-build-app-session').prop('checked')
		var savePasswords = hyper.UI.$('#input-build-app-save').prop('checked')
		var storePassword = hyper.UI.$('#input-build-app-storepassword').val()
		var keyPassword = hyper.UI.$('#input-build-app-keypassword').val()

		if (filename.length = 0) {
			window.alert('The target filename can not be empty.')
			return
		}

		// Check if we are already building
		var currentBuild = hyper.UI.currentBuild()
		if (currentBuild) {
			window.alert(`Evothings is currently limited to building one application at a time and we are already building "${currentBuild.title}". Try again later.`)
			return
		}

		if (!debug) {
			if (keyPassword.length < 6) {
				window.alert('The key password is needed for a release build and it needs to be at least 6 characters long.')
				return
			}
			if (storePassword.length < 6) {
				window.alert('The key store password is needed for a release build and it needs to be at least 6 characters long.')
				return
			}
		}
		// User wants to save them in settings so we do
		if (savePasswords) {
			SETTINGS.setKeyPassword(keyPassword)
			SETTINGS.setStorePassword(storePassword)
		}

		// We clear the fields unless the user wants to keep them for the session
		if (!sessionPasswords) {
			hyper.UI.$('#input-build-app-storepassword').val('')
			hyper.UI.$('#input-build-app-keypassword').val('')
		}

  	// Hide dialog.
		hyper.UI.$('#dialog-build-app').modal('hide')

		// Fire away build of the app in background
		hyper.UI.buildApp(path, name, filename, debug, keyPassword, storePassword)
	}

	hyper.UI.buildStartTask = function(task) {
		var div = hyper.UI.$('#build-screen-content')
		div.empty()
		div.append(hyper.UI.$(`<h2>${task}</h2><p id="build-result"></p>`))
		div.append(hyper.UI.$(`<h3>Status</h3><p id="build-status"></p>`))
		div.append(hyper.UI.$(`<h3>Log</h3><pre id="build-log"></pre>`))
	}

	hyper.UI.buildStatus = function(status) {
		hyper.UI.$('#build-status').html(status)
	}

	hyper.UI.buildResult = function(pathAPK) {
		var file = PATH.basename(pathAPK)
		hyper.UI.$('#build-result').html(hyper.UI.$(`<a href="file://${pathAPK}">${file}</a>`))
	}

	hyper.UI.copyAppForBuild = function(fullPath, destination) {
		// Make sure www directory in copied app has all that needs to go into Cordova www
		// First we copy the whole app, and remove any existing first
		FSEXTRA.removeSync(destination)
		FSEXTRA.copySync(fullPath, destination)
		// Then we figure out what to copy into www, if anything
		var www = PATH.join(destination, 'www')
		if (FILEUTIL.fileIsDirectory(fullPath)) {
			// Get index file to run from evothings.json.
			//var indexFile = APP_SETTINGS.getIndexFile(fullPath)
			//if (!indexFile)
			//{
				// Error. Must have index file.
			//	buildCallback(
			//		'evothings.json is missing or index-file entry is missing: '
			//		+ fullPath)
			//	return
			//}

			// If we have www dir we just use it as is
			var wwwDir = APP_SETTINGS.getWwwDir(fullPath)
			if (wwwDir) {
				return
			}

			// Otherwise we use the app dir
			var appDir = APP_SETTINGS.getAppDir(fullPath)
			if (appDir) {
				FSEXTRA.copySync(PATH.join(destination, appDir), www)
				return
			}
		}
		// Otherwise we copy everything except res & evothings.json & icon
		FSEXTRA.copySync(fullPath, www)
		FSEXTRA.removeSync(PATH.join(www, 'res'))
		FSEXTRA.removeSync(PATH.join(www, 'evothings.json'))
		var image = APP_SETTINGS.getAppImage(fullPath)
		if (image) {
			FSEXTRA.removeSync(PATH.join(www, image))
		}
	}

	hyper.UI.buildApp = function(path, name, filename, debug, keyPassword, storePassword) {
		// Clear build log
		hyper.UI.buildStartTask("Building " + name)

		// Start build log
		hyper.UI.buildStatus("Starting Evobox for build ...")

		hyper.UI.startEvobox(path, function(path, evoboxDir) {
			// Copy app into build box directory and make sure source is in www
			hyper.UI.buildStatus("Copying app source to build directory ...")
			hyper.UI.copyAppForBuild(path, PATH.join(evoboxDir, name))

			// Create a Build object
			var build = {
				start: Date.now(),
				stop: null,
				name: name,
				filename: filename,
				appID: APP_SETTINGS.getCordovaID(path),
				title: APP_SETTINGS.getTitle(path),
				shortDescription: APP_SETTINGS.getDescription(path),
				longDescription: APP_SETTINGS.getLongDescription(path),
				authorName: APP_SETTINGS.getAuthorName(path),
				authorEmail: APP_SETTINGS.getAuthorEmail(path),
				authorURL: APP_SETTINGS.getAuthorURL(path),
				path: path,
				source: '/www/',
				plugins: JSON.parse(JSON.stringify(APP_SETTINGS.getPlugins(path))),
				debug: debug,
				log: []
			}
			hyper.UI.mBuildList.push(build)


			// Purge any existing previous build
			var resultDir = PATH.join(evoboxDir, 'result', name)
			FSEXTRA.removeSync(resultDir)

			// Create <name>.rb
			hyper.UI.buildStatus("Creating build configuration ...")
			var ok = hyper.UI.createBuildConfig(evoboxDir, build, storePassword, keyPassword)

			if (ok) {
				// Spawn the build, progress shown in Build tab
				var hasPassRE = /-(key|store)pass/
				var escapedStorePassword = storePassword.replace('"', '\\"')
				var escapedKeyPassword = keyPassword.replace('"', '\\"')
				hyper.UI.buildStatus("Running build script ...")
				var error = null
				const proc = CHILD_PROCESS.spawn('vagrant', ['ssh', '-c', `'cd\ /vagrant\ &&\ ruby\ build.rb\ ${name}.rb'`], {cwd: evoboxDir, shell: true})
				proc.stdout.on('data', (data) => {
					var s = data.toString()
					if (hasPassRE.test(s)) {
						s = s.replace(escapedStorePassword, '*****')
						s = s.replace(escapedKeyPassword, '*****')
					}
					build.log.push(s)
					hyper.UI.buildLog(s)
				})
				proc.stderr.on('data', (data) => {
					var s = data.toString()
					build.log.push('stderr:' + s)
					hyper.UI.buildLog('stderr: ' + s)
				})
				proc.on('error', (err) => {
					console.log(`Build process exited with error: ${err}`);
					error = err
				})
				proc.on('close', (code) => {
					build.exitCode = code
					console.log(`Build process exited with code ${code}`);
					console.dir(build)
					build.stop = Date.now()
					if (error) {
						hyper.UI.buildStatus("Build failed due to unexpected error.")
						MAIN.openWorkbenchDialog('Build Failed Unexpectedly', `Build of ${build.name} failed!`, `The build of ${build.name} failed unexpectedly with error ${error} and exit code ${code}.\n\nSee log in Build tab for details.`, 'error', ["Ok"])
					} else {
						// Present result to user
						if (code == 0) {
							hyper.UI.buildStatus("Build succeeded.")
							var resultAPK = PATH.join(resultDir, name + '.apk')
							hyper.UI.buildResult(resultAPK)
							MAIN.openWorkbenchDialog('Build Ready', `Build of ${build.name} succeeded!`, `The build of ${build.name} succeeded and the resulting apk can be found at:\n\n${resultAPK}\n\nAlso see link at top of Build tab.`, 'info', ["Ok"])
						} else {
							hyper.UI.buildStatus("Build failed.")
							MAIN.openWorkbenchDialog('Build Failed', `Build of ${build.name} failed!`, `The build of ${build.name} failed with exit code ${code}.\n\nSee log in Build tab for details.`, 'error', ["Ok"])
						}
					}
				})
			}
		})
	}

	hyper.UI.buildLog = function(s) {
		hyper.UI.$('#build-log')[0].innerHTML += s
		//hyper.UI.$('#build-log').append(hyper.UI.$("<p>" + s + "</p>"))
	}

	hyper.UI.createBuildConfig = function(evoboxDir, build, storePassword, keyPassword) {
		var debugMode = build.debug ? "debug" : "release"
		var keyStore = SETTINGS.getKeystoreFilename()
		var keyCommand = SETTINGS.getKeystoreCreateCommand()
		var signCommand = SETTINGS.getJarSignCommand()
		var verifyCommand = SETTINGS.getJarVerifyCommand()
		var distinguishedName = SETTINGS.getDistinguishedName()
		// Looks insane but it gets unescaped twice...
		var escapedStorePassword = storePassword.replace('"', '\\\\\\"')
		var escapedKeyPassword = keyPassword.replace('"', '\\\\\\"')
		// Compose a reasonable Ruby array
		pluginArray = []
		for (p of build.plugins) {
			var fullPlugin = hyper.UI.mPluginList.find(each => each.name == p.name)
			if (!fullPlugin) {
				hyper.UI.buildLog("Unknown plugin in evothings.json: " + p.name)
				hyper.UI.buildStatus("Build failed.")
				MAIN.openWorkbenchDialog('Build Failed', `Build of ${build.name} failed!`, `The build of ${build.name} failed. Unknown plugin in evothings.json: ` + p.name, 'error', ["Ok"])
				return false
			}
			var s = fullPlugin.name
			if (fullPlugin.location) {
				s = fullPlugin.location
				if (p.version) {
					s += "#" + p.version
				}
			}
			pluginArray.push('"'+s+'"')
		}
		// Ruby config template
		config = `Title = "${build.title}"
ShortDesc = "${build.shortDescription}"
LongDesc = "${build.longDescription}"
AuthorEmail = "${build.authorEmail}"
AuthorHref = "${build.authorURL}"
AuthorName = "${build.authorName}"
SourceDirectory = "${build.name}"
AppSource = "${build.source}"
TargetFileName = '${build.filename}'
AppId = '${build.appID}'
Plugins = [${pluginArray.toString()}]
Screenshots = [
	SourceDirectory+'/res/screenshot1.png',
	SourceDirectory+'/res/screenshot2.png',
]
HiResIcon = SourceDirectory + '/res/icon-512x512.png'
FeatureGraphic = SourceDirectory + '/res/feature-graphic-1024x500.png'
PromoGraphic = SourceDirectory + '/res/promo-graphic-180x120.png'
Keystore = '${keyStore}'
ReleaseOrDebug = "${debugMode}"
StorePassword = "${escapedStorePassword}"
KeyPassword = "${escapedKeyPassword}"
DistinguishedName = "${distinguishedName}"
KeytoolGenKey = "${keyCommand}"
KeytoolList = "keytool -list -keystore #{Keystore} -storepass \\"#{StorePassword}\\" -v"
Jarsigner = "${signCommand}"
JarVerify = "${verifyCommand}"
`
		var file = PATH.join(evoboxDir, build.name + ".rb")
		FS.writeFileSync(file, config)
		return true
	}

  hyper.UI.applyPlugins = function(path, oldPlugins, newPlugins) {
    // Apply changes to libraries and return true if all went well, otherwise false.
    
	  // Find toRemove and toAdd
	  var oldp = new Set(oldPlugins.map(p => p.name))
	  var newp = new Set(newPlugins.map(p => p.name))
	  // Remove old ones not in newPlugins
	  var toRemove = [...oldp].filter(x => !newp.has(x))
	  // Add new ones not in oldPlugins
	  var toAdd = [...newp].filter(x => !oldp.has(x))
	 
	 	// Make adjustments to plugins
	 	if (toRemove.length > 0 || toAdd.length > 0) {
	   	// We do not do anything yet depending on adding/removing a plugin
			/*var libsPath = APP_SETTINGS.getLibDirFullPath(path)
	    if (!FS.existsSync(libsPath)) {
	      window.alert(`The library directory "${libsPath}" does not exist, perhaps you need to add "app-dir": "app", or similar to evothings.json?`)
	      LOGGER.log("Directory does not exist: " + libsPath)
	      return false
	    }
			for (lib of toRemove) {
				hyper.UI.removeLibraryFromApp(path, lib)
			}
			for (lib of toAdd) {
				hyper.UI.addLibraryToApp(path, lib)
			}*/
    }
    return true
	}

  hyper.UI.applyLibraries = function(path, oldLibs, newLibs) {
    // Apply changes to libraries and return true if all went well, otherwise false.
    
	  // Find toRemove and toAdd
	  var oldl = new Set(oldLibs.map(l => l.name))
	  var newl = new Set(newLibs.map(l => l.name))
	  // Remove old ones not in newLibs
	  var toRemove = [...oldl].filter(x => !newl.has(x))
	  // Add new ones not in oldLibs
	  var toAdd = [...newl].filter(x => !oldl.has(x))
	 
	 	// Make adjustments to libraries
	 	if (toRemove.length > 0 || toAdd.length > 0) {
	   	var libsPath = APP_SETTINGS.getLibDirFullPath(path)
	    if (!FS.existsSync(libsPath)) {
	      window.alert(`The library directory "${libsPath}" does not exist, perhaps you need to add "app-dir": "app", or similar to evothings.json?`)
	      LOGGER.log("Directory does not exist: " + libsPath)
	      return false
	    }
			for (lib of toRemove) {
				hyper.UI.removeLibraryFromApp(path, lib)
			}
			for (lib of toAdd) {
				hyper.UI.addLibraryToApp(path, lib)
			}
    }
    return true
	}
	
	hyper.UI.removeLibraryFromApp = function(path, lib) {
		var libsPath = APP_SETTINGS.getLibDirFullPath(path)
		var libPath = PATH.join(libsPath, lib)
		var uninstallScript = PATH.join(libPath, 'uninstall.js')
		if (!FS.existsSync(uninstallScript)) {
			// Uninstall library in application.
			// see main-window-func.js, removeLibraryFromApp

			// 1. Remove all references in index.html looking like:
			// <script src="libs/<lib>/<lib>.js"></script>
			var indexPath = APP_SETTINGS.getIndexFileFullPath(path)
			var html = FILEUTIL.readFileSync(indexPath)
			var scriptPath = `libs/${lib}/${lib}.js`

			var cher = CHEERIO.load(html, { xmlMode: false })
			var element = cher('script').filter(function(i, el) {
				return cher(this).attr('src') === scriptPath
			})
			if (element.length > 0) {
				element.remove()
				FILEUTIL.writeFileSync(indexPath, cher.html())
				LOGGER.log("Removed " + lib + " from " + path)
			}

			// 2. Remove directory libs/libname
			var libPath = PATH.join(APP_SETTINGS.getLibDirFullPath(path), lib)
			FSEXTRA.removeSync(libPath)
		} else {
			eval(FILEUTIL.readFileSync(uninstallScript))
		}
	}

	hyper.UI.addLibraryToApp = function(path, lib) {
	  var libsPath = APP_SETTINGS.getLibDirFullPath(path)
	  var libPath = PATH.join(libsPath, lib)
	  copyLibraryFromURL(lib, libPath, function() {
      var installScript = PATH.join(libPath, 'install.js')
			if (!FS.existsSync(installScript)) {
				// 0. Read the index file to manipulate it
				var indexPath = APP_SETTINGS.getIndexFileFullPath(path)
				var html = FILEUTIL.readFileSync(indexPath)
				var scriptPath = `libs/${lib}/${lib}.js`

				// 1. Remove any existing reference in index.html
				cher = CHEERIO.load(html, { xmlMode: false })
				var element = cher('script').filter(function(i, el) {
							return cher(this).attr('src') === scriptPath
				})
				if (element.length > 0) {
					element.remove()
				}

				// 2. Add a reference in index.html right before </body>
				// Note that we can't use <script blabla /> - it will fail
				cher('body').append(`
				<script src="${scriptPath}"></script>
			`)

				// 3. Write index.html file back to disk
				FILEUTIL.writeFileSync(indexPath, cher.html())
				LOGGER.log("Added " + lib + " to " + path)
			} else {
				eval(FILEUTIL.readFileSync(installScript))
			}
    })
	}

	function copyLibraryFromURL(libname, targetDir, cb) {
		library = hyper.UI.mLibraryList.find(each => each.name == lib)
		// Either we use download-url property, or we go to MAIN.BASE
		sourceURL = library["download-url"] || MAIN.BASE + '/libraries/' + lib
	  try {
		  // Download zip to temp
		  sourceURL = sourceURL + '.zip'
		  UTIL.download(sourceURL, (zipFile, err) => {
		    if (err) {
  		    UTIL.alertDownloadError('Something went wrong, could not download library.', sourceURL, err)
    		  LOGGER.log('[main-window-func.js] Error in copyLibraryFromURL: ' + err)
    		} else {		    
    		  // Extract into targetDir
    		  FS.mkdirSync(targetDir)
	    	  UTIL.unzip(zipFile, targetDir, function(err) {
	  		    if (err) {
	  		      // TODO: This doesn't seem to work
	  		      FSEXTRA.removeSync(targetDir)
        		  window.alert('Something went wrong when downloading/unzipping library.')
        		  LOGGER.log('[main-window-func.js] Error in copyLibraryFromURL: ' + err)
        		} else {       
		          //Callback
		          cb()
		        }
		      })
		    }
	  	})
	  } catch (error) {
		  window.alert('Something went wrong, could not download and unzip library.')
		  LOGGER.log('[main-window-func.js] Error in copyLibraryFromURL: ' + error)
	  }
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

	hyper.UI.openInBrowser = function(url)
	{
		SHELL.openExternal(url);
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
		MAIN.openDialog('System Message', message, 'info')
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

EVENTS.subscribe(EVENTS.EXECUTEFILEDATA, executeFileData.bind(this))
EVENTS.subscribe(EVENTS.INJECTFILEDATA,  injectFileData.bind(this))

function injectFileData (arg)
{
	console.log('========================= inectFile data args..===============')
	console.dir(arg)
	var file = arg.file
	var viewer = arg.viewer
	var fdata = '(function(){var file={data:"'+file.data+'", name: "'+file.name+'", size: "'+file.size+'"}; '
	fdata += 'file.data = window.atob(decodeURIComponent(unescape(file.data)));'
	fdata += 'if(!window._evofiles){ window._evofiles = [] }; window._evofiles.push(file); '
	fdata += 'if(window.evo && window.evo.fileCallbacks){ window.evo.fileCallbacks.forEach(function(cb){ cb(file) }) };return "_DONOT_";})()'
	console.log('sending file ')
	console.log(fdata)
	SERVER.evalJS(fdata, viewer)
}

function executeFileData(arg)
{
	var filedata = arg.file
	var viewer = arg.viewer
	console.log('executeFileData called')
	SERVER.evalJS('(function(){'+filedata+' ;return "_DONOT_"; })()', viewer)
}
