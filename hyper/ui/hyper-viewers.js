$(function()
{
	var OS = require('os')
	var SETTINGS = require('../settings/settings.js')
	var LOGGER = require('../server/log.js')
	var GUI = require('nw.gui')
	var EVENTS = require('../server/events.js')
	var SERVER = require('../server/hyper-server.js')

	// Main application window
	var mMainWindow = window.opener

	var currentClients = []


	window.hyper = {}

	window.hyper.log = function(message)
	{
		showResult('NODE: ' + message)
	}

	window.hyper.inspect = function(obj)
	{
		window.hyper.log('Object inspect:\n' +
			window.hyper.objectToString(obj, [], '  '))
	}

	window.hyper.objectToString = function (obj, visited, level)
	{
		// Check for circular structures.
		for (var i = 0; i < visited.length; ++i)
		{
			if (visited[i] === obj) { return level + '<circular reference>\n' }
		}
		visited.push(obj)

		if (!level) { level = '' }

		var s = ''

		for (prop in obj)
		{
			if (obj.hasOwnProperty(prop))
			{
				var value = obj[prop]
				if (typeof value === 'object')
				{
					s += level + prop + ':\n' +
						window.hyper.objectToString(value, visited, level + '  ')
				}
				else
				{
					s += level + prop + ': ' + value + '\n'
				}
			}
		}

		return s
	}

	function receiveMessage(event)
	{
		//LOGGER.log('[user-workbench.js] Workbench got : ' + event.data.message)
		if ('hyper.hello' == event.data.message)
		{
			mMainWindow = event.source
		}
		else if ('hyper.log' == event.data.message)
		{
			showResult('LOG: ' + event.data.logMessage)
		}
		else if ('hyper.result' == event.data.message)
		{
			showResult('RES: ' + event.data.result)
		}
	}

	function saveUIState()
	{
		// Save editor and log content.

		var maxStorageSize = 100000

		// Save window layout.

		var win = GUI.Window.get()

		// Do not save if window is minimized on Windows.
		// On Windows an icon has x,y coords -32000 when
		// window is minimized. On Linux and OS X the window
		// coordinates and size are intact when minimized.
		if (win.x < -1000)
		{
			return;
		}

		SETTINGS.setWorkbenchWindowGeometry({
			x: win.x,
			y: win.y,
			width: win.width,
			height: win.height
		})

		var layout = $('body').layout()
		SETTINGS.setWorkbenchWindowDividerPosition(layout.state.south.size)
	}

	// Save global reference to function.
	window.saveUIState = saveUIState

	function restoreSavedUIState()
	{
		var geometry = SETTINGS.getWorkbenchWindowGeometry()
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

		var size = SETTINGS.getWorkbenchWindowDividerPosition()
		if (size)
		{
			var layout = $('body').layout()
			layout.sizePane('south', size)
		}
	}

	function setLayoutProperties()
	{
		$('body').layout(
			{
				south: { size: 300 },
				//center: { maskContents: true },
				fxName: 'none'
			})
	}

	function addViewersToList(list)
	{
		currentClients = list
		console.log('showing '+list.length+' clients')
		console.dir(list)
		if(list)
		{
			domlist = document.getElementById('viewer-list')
			list.forEach(function(viewer)
			{
				var div = document.createElement('div')
				div.style.display = 'flex';
				div.style.flexDirection = 'column'
				var span = document.createElement('span')
				span.innerHTML = viewer.name + ' ('+viewer.info.model+')'
				var img = document.createElement('img')
				img.src = 'images/PNG/Nexus7.png'
				domlist.appendChild(div)
				div.appendChild(img)
				div.appendChild(span)
				div.addEventListener('mouseup', function(e)
				{
					onClientSelected(viewer)
				})
				console.log('adding client')
				console.dir(viewer)
			})
		}
	}

	function onClientSelected(viewer)
	{
		console.log('user selected client '+viewer.name)
		injectInstrumentationToClient(viewer)
	}

	function onViewersUpdated(viewerlist)
	{
		LOGGER.log('[hyper-viewers.js] got viewers updated event');
		console.dir(viewerlist)
		domlist = document.getElementById('viewer-list')
		domlist.html = ""
		if(viewerlist.data && viewerlist.data.clients)
		{
			var list = viewerlist.data.clients
			addViewersToList(list)
		}
	}

	function injectInstrumentationToClient(client)
	{
		console.log('injectin instrumetnation into client '+client.name)

	}

	function onViewersInstrumentation(message)
	{
		console.log('------------------ instrumentation received!!')
		console.dir(message)

	}

	function setupEventListeners()
	{
		EVENTS.subscribe(EVENTS.VIEWERSUPDATED, onViewersUpdated)
		EVENTS.subscribe(EVENTS.VIEWERSINSTRUMENTATION, onViewersInstrumentation)

		console.log('getting initial list of clients...')
		var info = SERVER.getCLinetInfo()
		if(info && info.clients)
		addViewersToList(info.clients)
	}

	// Set up event listeners.
	window.addEventListener('message', receiveMessage, false)

	var win = GUI.Window.get()
	win.on('close', function()
	{
		saveUIState()
		this.close(true)
	})

	// Init layout.
	setLayoutProperties()

	// Set the save state since last session.
	//restoreSavedUIState()
	setupEventListeners()

})
