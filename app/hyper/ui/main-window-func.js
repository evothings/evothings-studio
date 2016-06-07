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

/**
 * UI functions.
 */
exports.defineUIFunctions = function(hyper)
{
	var mConnectKeyTimer
	// The merged final array of metadata on Examples, Libraries and Projects
	hyper.UI.mExampleList = []
	hyper.UI.mLibraryList = []

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

	function initAppLists()
	{
		readProjectList()
		hyper.UI.displayProjectList()

    UTIL.checkInternet()
		hyper.UI.updateExampleList(true)
	  hyper.UI.updateLibraryList(true) // We do this one silent, complaining once is enough

		// Register a timer so that we update the lists every 30 min
	  setInterval(function() {
	    hyper.UI.updateExampleList(true) // Silent
	    hyper.UI.updateLibraryList(true) // Silent
	  }, 30 * 60 * 1000);
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
			console.log('open cloud token dialog')
			if(message)
			{
				hyper.UI.$('#tokentext')[0].innerHTML = message
			}
			hyper.UI.$('#connect-spinner').removeClass('icon-spin-animate')
			dialog.showModal()
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
		  if (FILEUTIL.fileIsHTML(path) && FILEUTIL.statSync(path))
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
		  if (FILEUTIL.statSync(indexPath))
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
    var base = 'file://'
    // Set base to where we loaded the metadata from
		if (options.url) {
  		base = PATH.dirname(options.url)
    }
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
		var appURL = PATH.join(base, options.path)
    var imagePath = options.imagePath
    var docURL = options.docURL
    var appTags = options.tags || []
    var appLibraries = options.libraries || []
		var appVersion = options.version || null
		var shortName = options.name
    var appName = options.title
    var appDescription = options.description

		// Escape any backslashes in the path (needed on Windows).
		var escapedPath = options.path.replace(/[\\]/g,'\\\\')
    
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
      docURL = PATH.join(appURL, 'doc', 'index.html')
    }
    
		if (imagePath) {
			var fullImageURL = appURL + '/' + imagePath
			html += '<div class="app-icon" style="background-image: url(\'' +
				fullImageURL + '\');"></div>'
		} else {
			// Show a default icon if no image file is provided.
			html += '<div class="app-icon" style="background-image: url(\'images/app-icon.png\');"></div>'
		}

    
		var appHasValidHTMLFile = options.runButton
    if (isLocal) {
		  // Get name of app, either given in options above or extracted from project.
		  // Uses title tag as first choice.
      if (!appName) {
        // Returns null if HTML file not found.
		    appName = hyper.UI.getProjectNameFromFile(options.path)
		    appHasValidHTMLFile = !!appName
		    if (!appHasValidHTMLFile) {
			    // If app name was not found, index.html does not exist.
			    appName = 'Warning: HTML file does not exist'
		    }
      }
    }
    
    	
		if (isLocal && !isLibrary)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="button-edit btn et-btn-red" '
				+	`onclick="window.hyper.UI.openEditAppDialog('${escapedPath}')">`
				+	'Edit'
				+ '</button>'
		}
    
		if (docURL && options.docButton)
		{
			html += '<button type="button" '
			if (isLibrary) {
				html +=	'class="button-run'
		  } else {
		    html +=	'class="button-doc'
		  }
		  html += ' btn et-btn-yellow-dark" '
				+	`onclick="window.hyper.UI.openDocURL('${docURL}')">`
				+	'Doc'
				+ '</button>'
		}

		if (options.copyButton)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="button-open btn et-btn-indigo" '
				+	`onclick="window.hyper.UI.openCopyAppDialog('${escapedPath}')">`
				+	'Copy'
				+ '</button>'
		}

		if (options.openButton)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="button-open btn et-btn-blue" '
				+	`onclick="window.hyper.UI.openFolder('${escapedPath}')">`
				+	'Code'
				+ '</button>'
		}


		// Add Run button only if app has an HTML file.
		// We use different run functions depending on if it isLocal
		if (!isLibrary && appHasValidHTMLFile)
		{
			html += '<button type="button" class="button-run btn et-btn-green" '
      if (isLocal)
        html += `onclick="window.hyper.UI.runApp('${escapedPath}')">`
      else 
        html += `onclick="window.hyper.UI.runExampleApp('${escapedPath}')">`
      html +=	'Run</button>'
		}

		/* We add a Config button to Apps instead
		if (isLibrary)
		{
			html +=
				'<button '
				+	'type="button" '
				+	'class="button-run btn et-btn-green" '
				+	'onclick="window.hyper.UI.copytoApp(\'${escapedPath}\')">'
				+	'Use'
				+ '</button>'
		}*/

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
		
		html += `<div class="${entryContentClass}"><h4>${appName}</h4>`
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

	hyper.UI.getProjectNameFromFile = function(path)
	{
	    // Is it an HTML file?
	    if (FILEUTIL.fileIsHTML(path))
	    {
	        var indexPath = path
	    }
	    // Is it a directory with evothings.json in it?
	    else if (FILEUTIL.directoryHasEvothingsJson(path))
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
			// Return null on error (file does not exist).
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
	    if (FILEUTIL.fileIsHTML(path))
	    {
	        // Add the path, including HTML file, to the project list.
		    mProjectList.unshift(path)
		    saveProjectList()
	    }
	    else if (FILEUTIL.fileIsEvothingsSettings(path))
	    {
	        // Add the folder path to the project list.
		    mProjectList.unshift(PATH.dirname(path))
		    saveProjectList()
	    }
	    else if (FILEUTIL.fileIsDirectory(path))
	    {
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

		// We want to show the folder but need an item in it to show,
		// we use either evothings.json or index.html
		if (FILEUTIL.statSync(PATH.join(path, 'evothings.json'))) {
			SHELL.showItemInFolder(PATH.join(path, 'evothings.json'))
	  } else if (FILEUTIL.statSync(PATH.join(path, 'index.html'))) {
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
					  path: path,
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
        hyper.UI.mExampleList = hyper.UI.mExampleList.sort(function(a, b) {
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
    	    window.alert('Something went wrong downloading example list:\n\n' + statusAndUrl[1] + '\n\n"' + statusAndUrl[0] + '"\n\nDo you have internet access?');
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
        hyper.UI.mLibraryList = hyper.UI.mLibraryList.sort(function(a, b) {
          return a.title.localeCompare(b.title);
        })
        // And finally show them too
        hyper.UI.displayLibraryList()
   	  }, statusAndUrl => {
    	  LOGGER.log('[main-window-func.js] Error in updateLibraryList: ' + statusAndUrl[0] + ' downloading: ' + statusAndUrl[1])
        if (!silent) {
    	    window.alert('Something went wrong downloading library list:\n\n' + statusAndUrl[1] + '\n\n"' + statusAndUrl[0] + '"\n\nDo you have internet access?');
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
			    version: entry.version,
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
		hyper.UI.$('#input-setting-javascript-workbench-font-size').val(
			SETTINGS.getWorkbenchFontSize())
		hyper.UI.$('#input-setting-number-of-directory-levels').val(
			SETTINGS.getNumberOfDirecoryLevelsToTraverse())
		hyper.UI.$('#input-setting-my-apps-path').val(
			SETTINGS.getMyAppsPath())
		hyper.UI.$('#input-setting-reload-server-address').val(
			SETTINGS.getReloadServerAddress())
		hyper.UI.$('#input-setting-repository-urls').val(
			SETTINGS.getRepositoryURLs())

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
		
		SETTINGS.setRepositoryURLs(
			hyper.UI.$('#input-setting-repository-urls').val())

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

	hyper.UI.openDocURL = function(url)
	{
		hyper.UI.openInBrowser(url)
	}

	hyper.UI.openCopyAppDialog = function(path)
	{
		// Set sourcePath and folder name of app to copy.
		var sourcePath = path
		var appFolderName = PATH.basename(sourcePath)
		var myAppsDir = SETTINGS.getMyAppsPath()

		// Set dialog box fields.
		hyper.UI.$('#input-copy-app-source-path').val(path) // Hidden field.
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
		var targetAppFolder = hyper.UI.$('#input-copy-app-target-folder').val()
		var targetParentDir = hyper.UI.$('#input-copy-app-target-parent-folder').val()
		var targetDir = PATH.join(targetParentDir, targetAppFolder)

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
		var exists = FILEUTIL.statSync(targetParentDir)
		if (!exists)
		{
			window.alert('The parent folder does not exist, please change folder.')
			return // Abort (dialog is still visible)
		}

		// If target folder exists, display an alert dialog and abort.
		var exists = FILEUTIL.statSync(targetDir)
		if (exists)
		{
			window.alert('An app with this folder name already exists, please type a new folder name.')
			return // Abort (dialog is still visible)
		}

		// Copy the app, if sourcePath is relative it will copy from Evothings website
		copyApp(sourcePath, targetDir, function() {
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
    		  window.alert('Something went wrong, could not download app. Do you have internet access?')
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
		hyper.UI.$('#input-new-app-parent-folder').val(path)
    hyper.UI.$('#input-new-app-folder').val('')

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
		var parentFolder = hyper.UI.$('#input-new-app-parent-folder').val()
		var appFolder = hyper.UI.$('#input-new-app-folder').val()
		var targetDir = PATH.join(parentFolder, appFolder)

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
		var exists = FILEUTIL.statSync(parentFolder)
		if (!exists)
		{
			window.alert('The parent folder does not exist, please change folder.')
			return // Abort (dialog is still visible)
		}

		// If target folder exists, display an alert dialog and abort.
		var exists = FILEUTIL.statSync(targetDir)
		if (exists)
		{
			window.alert('An app with this folder name already exists, please type a new folder name.')
			return // Abort (dialog is still visible)
		}

		// Copy files.
		copyApp(sourcePath, targetDir, function() {
		  // Hide dialog.
		  hyper.UI.$('#dialog-new-app').modal('hide')

		  // Show the "My Apps" screen.
		  showMyApps()
		})
	}

  hyper.UI.openEditAppDialog = function(path)
	{
		// Populate input fields.
		hyper.UI.$('#input-edit-app-path').val(path) // Hidden field.
    hyper.UI.$('#input-edit-app-name').val(APP_SETTINGS.getName(path))
    hyper.UI.$('#input-edit-app-description').val(APP_SETTINGS.getDescription(path))
    hyper.UI.$('#input-edit-app-version').val(APP_SETTINGS.getVersion(path))

    // Use jQuery to create library checkboxes
    hyper.UI.$('#input-edit-app-libraries').empty()
    var libs = APP_SETTINGS.getLibraries(path)
    var html = ''
    var count = 0
    for (lib of hyper.UI.mLibraryList) {
      count++
      var checked = ''
      var usedVersion = lib.version
      if (libs) {
        // Ok, the app has a list of libraries we can check against
        var usedLib = libs.find(each => each.name == lib.name)
        if (usedLib) {
          checked = `checked="checked"`
          usedVersion = usedLib.version
        }
      }
      html += `<div class="checkbox">
  <input type="checkbox" ${checked} id="input-edit-app-library-${count}" data-lib="${lib.name}" data-version="${usedVersion}"> 
    <label for="input-edit-app-library-${count}">
      ${lib.title} (${usedVersion}) - ${lib.description}
    </label>
</div>`
    }
    // Create and insert HTML
		var element = hyper.UI.$(html)
		hyper.UI.$('#input-edit-app-libraries').append(element)
		
		// Show dialog.
		hyper.UI.$('#dialog-edit-app').modal('show')
	}
	
	hyper.UI.saveEditApp = function()
	{
		var path = hyper.UI.$('#input-edit-app-path').val()
		var name = hyper.UI.$('#input-edit-app-name').val()
		var description = hyper.UI.$('#input-edit-app-description').val()
		var version = hyper.UI.$('#input-edit-app-version').val()
    
    if (/[^a-z0-9\_\-]/.test(name)) {
      window.alert('The app short name should only consist of lower case letters, digits, underscores and dashes.')
      // This is just to try to make it match the regexp test
      var newName = name.replace(/\s/g, '-')
      newName = newName.toLowerCase()
      hyper.UI.$('#input-edit-app-name').val(newName)
			return // Abort (dialog is still visible)
    }
    
    if (/[^a-z0-9\.\-]/.test(version)) {
      window.alert('The version should only consist of lower case letters, digits, dots and dashes.')
      // This is just to try to make it match the regexp test
      var newVersion = version.replace(/\s/g, '-')
      newVersion = newVersion.toLowerCase()
      hyper.UI.$('#input-edit-app-version').val(newVersion)
			return // Abort (dialog is still visible)
    }

    // Collect checked libs
    var checkboxes = hyper.UI.$('#input-edit-app-libraries').find('input')
    var libs = []
    checkboxes.each(function () {
      var libname = this.getAttribute('data-lib')
      var libversion = this.getAttribute('data-version')
      if (this.checked) {
        libs.push({ "name": libname, "version": libversion })
      }
    })

  	// Hide dialog.
		hyper.UI.$('#dialog-edit-app').modal('hide')

    // Apply new libraries to app
    if (hyper.UI.applyLibraries(path, APP_SETTINGS.getLibraries(path) || [], libs)) {
      // Only store metadata changes to libraries if we could apply them
      APP_SETTINGS.setLibraries(path, libs)
    }

    // Store all meta data
    APP_SETTINGS.setName(path, name)
    APP_SETTINGS.setDescription(path, description)
    APP_SETTINGS.setVersion(path, version)

    hyper.UI.displayProjectList()
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
	    //try {
	      for (lib of toRemove) {
	        hyper.UI.removeLibraryFromApp(path, lib)
	      }
	      for (lib of toAdd) {
	        hyper.UI.addLibraryToApp(path, lib)
	      }
	    //} catch(error) {
	    //  LOGGER.log('[main-window-func.js] Error in applyLibraries: ' + error)
	    //  return false
	    //}
    }
    return true
	}
	
	hyper.UI.removeLibraryFromApp = function(path, lib) {
	  // 1. Remove all references in index.html looking like:
	  // <script src="libs/<lib>/<lib>.js"></script>
	  var indexPath = APP_SETTINGS.getIndexFileFullPath(path)
	  var html = FILEUTIL.readFileSync(indexPath)
	  var scriptPath = `libs/${lib}/${lib}.js`
	  $ = CHEERIO.load(html, { xmlMode: false })
	  var element = $('script').filter(function(i, el) {
      return $(this).attr('src') === scriptPath
    })
    if (element.length > 0) {
      element.remove()
      FILEUTIL.writeFileSync(indexPath, $.html())
      LOGGER.log("Removed " + lib + " from " + path)
    }
	  // 2. Remove directory libs/libname
	  var libPath = PATH.join(APP_SETTINGS.getLibDirFullPath(path), lib)
    FSEXTRA.removeSync(libPath)
	}

	hyper.UI.addLibraryToApp = function(path, lib) {
	  // 0. Download and unzip into libs/libname
	  var libsPath = APP_SETTINGS.getLibDirFullPath(path)
	  var libPath = PATH.join(libsPath, lib)
	  copyLibraryFromURL(MAIN.BASE + '/libraries/' + lib, libPath, function() {
      // 1. Remove any existing reference in index.html
	    var indexPath = APP_SETTINGS.getIndexFileFullPath(path)
	    var html = FILEUTIL.readFileSync(indexPath)
	    var scriptPath = `libs/${lib}/${lib}.js`
	    $ = CHEERIO.load(html, { xmlMode: false })
	    var element = $('script').filter(function(i, el) {
        return $(this).attr('src') === scriptPath
      })
      if (element.length > 0) {
        element.remove()
      }
	    // 2. Add a reference in index.html right before </body>
	    // Note that we can't use <script blabla /> - it will fail
      $('body').append(`
  <script src="${scriptPath}"></script>
`)
      FILEUTIL.writeFileSync(indexPath, $.html())
	    LOGGER.log("Added " + lib + " to " + path)
    })
	}

	function copyLibraryFromURL(sourceURL, targetDir, cb) {
	  try {
		  // Download zip to temp
		  sourceURL = sourceURL + '.zip'
		  UTIL.download(sourceURL, (zipFile, err) => {
		    if (err) {
    		  window.alert('Something went wrong, could not download library. Do you have internet access?')
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
