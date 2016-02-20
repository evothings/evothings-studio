$(function()
{
	var OS = require('os')
	var FS = require('fs')
	var SETTINGS = require('../settings/settings.js')
	var LOGGER = require('../server/log.js')
	var GUI = require('nw.gui')
	var EVENTS = require('../server/events.js')
	var SERVER = require('../server/hyper-server.js')

	// Main application window
	var mMainWindow = window.opener

	var mCurrentClients = []
	var mCurrentClientServices = []
	var mCurrentServiceData = []
	var mCurrentClientList = undefined
	var mInstrumentationReceivedFrom = []

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

	function renderViewersFromList(list)
	{
		mCurrentClientList = list
		console.log('renderViewersFromList showing '+list.length+' clients')
		console.dir(list)
		if(list && list.length)
		{
			domlist = document.getElementById('viewer-list')
			domlist.innerHTML = ""
			console.dir(list)
			list.forEach(function(viewer)
			{
				var rowdiv = document.createElement('div')
				rowdiv.style.display = 'flex';
				rowdiv.style.flexDirection = 'row'
				//
				var div = document.createElement('div')
				div.style.display = 'flex';
				div.style.flexDirection = 'column'
				div.style.justifyContent = 'space-around'
				div.style.width = '200px'
				var span = document.createElement('span')
				span.innerHTML = viewer.name + ' ('+viewer.info.model+')'
				var img = document.createElement('img')
				img.style.width='30px'
				//
				// TODO: switch to other icons depending on viewer hardware
				//
				img.src = 'images/PNG/Nexus7.png'
				//
				rowdiv.appendChild(div)
				div.appendChild(img)
				div.appendChild(span)
				div.addEventListener('mouseup', function(e)
				{
					onClientSelected(viewer)
				})
				//
				var sdiv = document.createElement('div')
				sdiv.style.display = 'flex';
				sdiv.style.flexDirection = 'column'
				sdiv.innerHTML = ""
				rowdiv.appendChild(sdiv)
				renderServicesForClient(viewer, sdiv)
				//

				domlist.appendChild(rowdiv)
				console.log('adding client')
				console.dir(viewer)
			})
		}
	}

	function renderServicesForClient(viewer, div)
	{
		console.log('renderServicesForClient for '+viewer.clientID)
		var allservices = mCurrentClientServices[viewer.clientID] || []
		console.log('allservices for viewer are')
		console.dir(allservices)
		providers = []
		allservices.forEach(function(service)
		{
			providerName = service.providerName
			var services = providers[providerName] || []
			services.push(service)
			providers[providerName] = services
		})
		for(var pname in providers)
		{
			var img = getImageForProvider(pname)
			var pnamediv = document.createElement('div')
			pnamediv.innerHTML = '<b>'+pname+'</b>>'
			pnamediv.appendChild(img)
			div.appendChild(pnamediv)
			//
			var sdiv = document.createElement('div')
			sdiv.innerHTML = ""
			div.appendChild(sdiv)
			console.log('adding provider '+pname)
			pnamediv.addEventListener('mouseup', function(e)
			{
				var pservices = providers[pname]
				console.log('pservices are')
				console.dir(pservices)
				pservices.forEach(function(service)
				{
					var ssdiv = document.createElement('div')
					ssdiv.innerHTML = service.name
					console.log('adding service '+service.name)
					div.appendChild(ssdiv)
					ssdiv.addEventListener('mouseup', function(e)
					{
						console.log('service '+service.name+' selected on provider '+pname)

					})
				})
			})
		}
	}

	function getImageForProvider(pname)
	{
		var img = document.createElement('img')
		img.style.width='30px'
		switch(pname)
		{
			case 'cordova':
				img.src = 'images/cordova_256.png'
		}

		return img
	}

	function onClientSelected(viewer)
	{
		console.log('user selected client '+viewer.name)
		if(!mInstrumentationReceivedFrom[viewer.clientID])
		{
			injectInstrumentationToClient(viewer)
		}
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
			renderViewersFromList(list)
		}
	}

	function injectInstrumentationToClient(client)
	{
		var wd = global.require.main.filename+'../'
		wd = wd.replace('hyper-ui.html','')
		console.log('injecting instrumentation into client '+client.name+' from directory '+wd+', to client '+client.UUID)
		FS.readFile( wd+'../injectables/cordova-instrumentation.js', "utf-8", function (err, f1) {
			if (err) {
				throw err;
			}
			FS.readFile( wd+'../injectables/instrumentation-manager.js', "utf-8", function (err, f2) {
				if (err) {
					throw err;
				}
				FS.readFile( wd+'../injectables/instrumentation-starter.js', "utf-8", function (err, f3) {
					if (err) {
						throw err;
					}
					console.log('loaded all three injectables')
					mMainWindow.postMessage({ message: 'eval', code: f1+'; '+f2+'; '+f3, clientUUID: client.UUID }, '*')
					console.log('all three injectables injected into client. Evaluating listServices()')
					mMainWindow.postMessage({ message: 'eval', code: 'window.evo.instrumentation.listServices()', clientUUID: client.UUID }, '*')
				});
			});
		});
	}

	function onViewersInstrumentation(message)
	{
		console.log('------------------ instrumentation received!!')
		console.dir(message)
		mInstrumentationReceivedFrom[message.clientID] = true
		if(message.services)
		{
			addServiceProvidersToViewer(message.clientID, message.services)
		}
		else if (message.serviceData)
		{
			addServiceDataToViewer(message.clientID, message.serviceDatas)
		}
	}

	function addServiceProvidersToViewer(clientID, services)
	{
		 mCurrentClientServices[clientID] = services
		console.log('setting client services for clientID '+clientID+' to ')
		console.dir(services)
		console.log('list of viewers is now')
		console.dir(mCurrentClientList)
		renderViewersFromList(mCurrentClientList)
	}

	function addServiceDataToViewer(clientID, servicedata)
	{

	}

	function setupEventListeners()
	{
		EVENTS.subscribe(EVENTS.VIEWERSUPDATED, onViewersUpdated.bind(this))
		EVENTS.subscribe(EVENTS.VIEWERSINSTRUMENTATION, onViewersInstrumentation.bind(this))
		console.log('getting initial list of clients from server '+SERVER)
		var info = SERVER.getClientInfo()
		if(info && info.clients)
		renderViewersFromList(info.clients)
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
