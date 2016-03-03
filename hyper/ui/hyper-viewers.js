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
	var mChartsVisible = []
	var mTimeSeriesForChart = []
	var mCurrentClientList = undefined
	var mInstrumentationReceivedFrom = []
	var mServiceSubscriptions = []
	var mTimeoutHandle = undefined

	var SUBSCRIPTION_INTERVAL = 250
	var NETWORK_TIMEOUT = 6000


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
		//LOGGER.log('[user-Viewers.js] Viewers got : ' + event.data.message)
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

		SETTINGS.setViewersWindowGeometry({
			x: win.x,
			y: win.y,
			width: win.width,
			height: win.height
		})

		var layout = $('body').layout()

	}

	// Save global reference to function.
	window.saveUIState = saveUIState

	function restoreSavedUIState()
	{
		var geometry = SETTINGS.getViewersWindowGeometry()
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
		//console.dir(list)
		if(list && list.length)
		{
			domlist = document.getElementById('viewer-list')
			domlist.innerHTML = ""
			//console.dir(list)
			list.forEach(function(viewer)
			{
				var exist = document.getElementById(viewer.clientID)
				if(!exist)
				{
					renderViewer(domlist, viewer)
				}
			})
		}
	}

	function renderViewer(domlist, viewer)
	{
		mCurrentClients[viewer.clientID] = viewer
		var rowdiv = document.createElement('div')
		rowdiv.id = viewer.clientID
		rowdiv.style.display = 'flex';
		rowdiv.style.flexDirection = 'row'
		//
		var div = document.createElement('div')
		div.style.display = 'flex';
		div.style.flexDirection = 'column'
		div.style.justifyContent = 'space-around'
		div.style.width = '200px'
		div.style.height = '120px'
		var span = document.createElement('span')
		span.innerHTML = viewer.name + ' ('+viewer.info.model+')'
		var img = document.createElement('img')
		img.style.width='30px'
		img.src = getImageForModel(viewer.info)
		//
		rowdiv.appendChild(div)
		div.appendChild(img)
		div.appendChild(span)
		//div.style.backgroundColor = "blue"
		div.addEventListener('mouseup', function(e)
		{
			onClientSelected(viewer)
		})
		var cdiv = document.createElement('ul')
		cdiv.className = "mdl-list"
		cdiv.style.paddingTop = "0"
		cdiv.style.paddingBottom = "0"
		cdiv.id = viewer.clientID + '.serviceroot'
		rowdiv.appendChild(cdiv)
		domlist.appendChild(rowdiv)
		console.log('adding client')
		console.dir(viewer)
	}

	function getImageForModel(info)
	{
		var rv = undefined
		var model = info.model.toLowerCase()
		if(info.platform == "Android")
		{
			rv = 'images/PNG/Nexus7.png'
			if(model.indexOf('galaxy') > -1)
			{
				rv = 'images/PNG/Galaxy3.png'
			}
		}
		else
		{
			rv = 'images/PNG/iPhone5.png'
			if(model.indexOf('ipad') > -1)
			{
				rv = 'images/PNG/iPad.png'
				if(model.indexOf('mini') > -1)
				{
					rv = 'images/PNG/iPadMini.png'
				}
			}
		}
		return rv
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
		else
		{
			var cdiv = document.getElementById(viewer.clientID + '.serviceroot')
			if(cdiv.childNodes.length == 0)
			{
				selectHierarchy(undefined, viewer)
			}
		}
	}

	function onViewersUpdated(viewerlist)
	{
		//LOGGER.log('[hyper-viewers.js] got viewers updated event');
		//console.dir(viewerlist)
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
		document.getElementById('p2').style.display="block"
		console.log('injecting instrumentation into client '+client.name+' from directory '+wd+', to client '+client.UUID)
		FS.readFile( wd+'../injectables/instrumentation-manager.js', "utf-8", function (err, f1) {
			if (err) {
				throw err;
			}
			FS.readFile( wd+'../injectables/bluetooth-instrumentation.js', "utf-8", function (err, f2) {
				if (err) {
					throw err;
				}
				FS.readFile(wd + '../injectables/cordova-instrumentation.js', "utf-8", function (err, f3) {
					if (err) {
						throw err;
					}
					FS.readFile(wd + '../injectables/instrumentation-starter.js', "utf-8", function (err, f4) {
						if (err) {
							throw err;
						}
						console.log('loaded all three injectables')
						mMainWindow.postMessage({
							message: 'eval',
							code: f1 + '; ' + f2 + '; ' + f3 + '; '+f4,
							clientUUID: client.UUID
						}, '*')
						console.log('all injectables injected into client. Evaluating listServices()')
						//mMainWindow.postMessage({ message: 'eval', code: 'window.evo.instrumentation.listServices()', clientUUID: client.UUID }, '*')
						selectHierarchy(undefined, client)
					});
				});
			});
		});
	}

	function onViewersInstrumentation(message)
	{
		console.log('------------------ instrumentation received!!')
		cancelNetworkTimeout()
		//console.dir(message)
		mInstrumentationReceivedFrom[message.clientID] = true
		if(message.hierarchySelection)
		{
			addHierarchySelection(message.clientID, message.hierarchySelection)
		}
		else if (message.serviceData)
		{
			addServiceDataToViewer(message.clientID, message.time, message.serviceData)
		}
		else if (message.serviceSubscription)
		{
			saveServiceSubscription(message.clientID, message.serviceSubscription)
		}
		else if (message.serviceUnsubscribe)
		{
			serviceUnsubscribe(message.clientID, message.serviceUnsubscribe)
		}
	}

	function saveServiceSubscription(clientID, serviceSubscription)
	{
		var subscriptions = mServiceSubscriptions[clientID] || []
		var sid = serviceSubscription.subscriptionID
		var path = serviceSubscription.path
		subscriptions[path] = sid
		console.log('saving service subscription for '+path+' -> '+sid+' under clientID '+clientID)
		mServiceSubscriptions[clientID] = subscriptions
	}

	function serviceUnsubscribe(clientID, serviceSubscription)
	{
		var subscriptions = mServiceSubscriptions[clientID] || []
		var path = serviceSubscription.path
		var sid = subscriptions[path]
		if(sid)
		{
			delete subscriptions[path]
			removeChartFor(clientID, path)
		}
	}

	function releaseSubscriptions()
	{
		console.log('releaseSubscriptions called (unimplemented')
	}

	function releaseEventHandlers()
	{
		console.log('releaseSUbscriptions called (unimplemented')
	}

	function isClientAlreadySubscribedToService(clientID, path)
	{
		var rv = false
		var subscriptions = mServiceSubscriptions[clientID] || []
		for(var key in subscriptions)
		{
			if(key.indexOf(path) > -1)
			{
				rv =true
			}
		}
		return rv
	}

	function addHierarchySelection(clientID, paths)
	{
		var client = mCurrentClients[clientID]
		paths.forEach(function(pathlevel)
		{
			console.log('addHierarchySelection called for '+pathlevel.name)
			var parentnode = document.getElementById(getIdForParentPath(clientID, pathlevel.name))
			if(parentnode)
			{
				var sdiv = document.createElement('li')
				var name = getNameFromPath(pathlevel.name)
				//sdiv.style.display = 'flex';
				//sdiv.style.flexDirection = 'row'
				sdiv.className = "mdl-list__item"

				sdiv.style.padding = "3px"
				parentnode.appendChild(sdiv)
				// create name, image and potential list of children. The latter to have the 'parent' id
				var ndiv = document.createElement('button')
				ndiv.className = "mdl-button mdl-js-button mdl-button--raised"
				var ttid = parentnode.id + '.' + name + '_button'

				ndiv.innerHTML = '<div id="'+ttid+'">'+name+'</div>'

				ndiv.style.width = "150px"

				var tdiv = document.createElement('div')
				tdiv.className = "mdl-tooltip mdl-tooltip--large"
				tdiv.for = ndiv.id
				tdiv.innerHTML = name
				//tdiv.innerHTML = '<div class="mdl-tooltip mdl-tooltip--large" for="'+ndiv.id+'">'+name+'</div>'
				parentnode.appendChild(tdiv)

				var img = document.createElement('img')
				if(pathlevel.icon)
				{
					img.src = pathlevel.icon
					img.style.width='25px'
					//img.style.height='20px'
					img.style.paddingLeft = "5px"
				}
				var cdiv = document.createElement('ul')
				cdiv.className = "mdl-list"
				cdiv.style.paddingLeft = "20px"
				cdiv.style.paddingTop = "0"
				cdiv.style.paddingBottom = "0"
				cdiv.id = parentnode.id + '.' + name
				sdiv.appendChild(ndiv)
				ndiv.appendChild(img)
				parentnode.appendChild(cdiv)
				console.log('   adding childnode '+cdiv.id+' under parent node '+parentnode.id)
				sdiv.addEventListener('mouseup', function(e)
				{
					if(pathlevel.selectable)
					{
						selectHierarchy(pathlevel.name, client)
					}
					else
					{
						var provider = pathlevel.name.split('.')[0]
						if(!isClientAlreadySubscribedToService(clientID, pathlevel.name))
						{
							subscribeToService(pathlevel.name, client)
						}
						else
						{
							console.log('--- skipping subscription since we are already subscribed to '+pathlevel.name)
						}
					}
				})
			}
			else
			{
				console.log('addHierarchySelection could not find parent node for '+pathlevel.name+' !!!')
			}
		})
	}

	function getNameFromPath(path)
	{
		var rv = path
		if(path.indexOf('.') > -1)
		{
			rv = path.substring(path.lastIndexOf('.')+1, path.length)
		}
		return rv
	}

	function getIdForParentPath(clientID, path)
	{
		var rv = clientID + '.serviceroot'
		if(path.indexOf('.') > -1)
		{
			var parentpath = path.substring(0, path.lastIndexOf('.'))
			//console.log('parent path = '+parentpath)
			rv += '.' + parentpath
		}
		//console.log('getIdForParentPath returns '+rv+' for path '+path)
		return rv
	}

	function selectHierarchy(path, client)
	{
		console.log('selectHierarchy called for path '+path)
		waitForTimeout()
		mMainWindow.postMessage({ message: 'eval', code: 'window.evo.instrumentation.selectHierarchy("'+path+'")', clientUUID: client.UUID }, '*')
	}

	function subscribeToService(path, client)
	{
		console.log('subscribeToService called for path '+path)
		waitForTimeout()
		mMainWindow.postMessage({ message: 'eval', code: 'window.evo.instrumentation.subscribeToService("'+path+'",{}, '+SUBSCRIPTION_INTERVAL+')', clientUUID: client.UUID }, '*')
	}

	function unsubscribeToService(path, clientID)
	{
		console.log('cancel subscription called')
		var client = mCurrentClients[clientID]
		var subscriptions = mServiceSubscriptions[clientID] || []
		var sid = subscriptions[path]
		console.log('unsubscribing to path '+path+' -> '+sid+' for clientID '+clientID)
		var snackbarContainer = document.querySelector('#snackbar');
		var data =
		{
			message: 'Unsubscribing from '+path,
			timeout: 2000
		};
		snackbarContainer.MaterialSnackbar.showSnackbar(data);
		waitForTimeout()
		mMainWindow.postMessage({ message: 'eval', code: 'window.evo.instrumentation.unSubscribeToService("'+path+'","'+sid+'")', clientUUID: client.UUID }, '*')
	}

	function waitForTimeout()
	{
		if(mTimeoutHandle)
		{
			cancelNetworkTimeout()
		}
		document.getElementById('p2').style.display="block"
		mTimeoutHandle = setTimeout(function()
		{
			document.getElementById('p2').style.display="none"
			var snackbarContainer = document.querySelector('#snackbar');
			var data =
			{
				message: 'Temporarily unable to reach viewer.',
				timeout: 2000
			};
			snackbarContainer.MaterialSnackbar.showSnackbar(data);
		}, NETWORK_TIMEOUT)
	}

	function cancelNetworkTimeout()
	{
		document.getElementById('p2').style.display="none"
		if(mTimeoutHandle)
		{
			console.log('cancelTimeout')
			clearTimeout(mTimeoutHandle)
			mTimeoutHandle = undefined
		}
	}

	function addServiceDataToViewer(clientID, time, servicedata)
	{
		if(!isClientAlreadySubscribedToService(clientID, servicedata.path))
		{
			saveServiceSubscription(clientID, {subscriptionID: servicedata.subscriptionID, path: servicedata.path})
		}
		var path = servicedata.path
		var channels = 0
		for(var k in servicedata.data)
		{
			channels++
		}
		var chart = getChartForPath(clientID, path, channels)
		if(chart)
		{
			var count = 0
			for(var key in servicedata.data)
			{
				if(key != 'timestamp')
				{
					var value = servicedata.data[key]
					var color = servicedata.color || 'rgba(255,255,255,0.76)'
					var fillstyle = servicedata.fillstyle || 'rgba(0,0,0,0.30)'
					switch(count)
					{
						case 0:
							color = 'rgba(25,255,25,0.76)'
						case 1:
							color = 'rgba(255,25,25,0.76)'
						case 2:
							color = 'rgba(25,25,255,0.76)'
						case 3:
							color = 'rgba(115,95,205,0.76)'
						default:
							color = 'rgba(195,205,255,0.76)'
					}
					var ts = getTimeSeriesFor(path+'_'+key, chart, color, fillstyle)
					console.log('  -- appending value '+parseFloat(value)+' for key '+key+' and timestamp '+time)
					ts.append(time, value)
				}
				count++
			}
		}
	}

	function getTimeSeriesFor(key, chart, color, fillstyle)
	{
		var ts = mTimeSeriesForChart[key]
		if(!ts)
		{
			ts = new TimeSeries()
			mTimeSeriesForChart[key] = ts
			console.log('  -- adding new timeseries for key '+key+' and color '+color)
			chart.addTimeSeries(ts, {lineWidth: 1, strokeStyle: color, fillStyle: fillstyle});
		}
		return ts
	}

	function getChartForPath(clientID, path)
	{
		var id = clientID+'.serviceroot.'+path+'.chart'
		var chart = mChartsVisible[id]
		var chartnode = document.getElementById(id)
		//console.log('chart at '+id+' is '+chart)
		if(!chartnode)
		{
			console.log('creating new chart')
			chartnode = document.createElement('canvas')
			chartnode.width = "500"
			chartnode.height = "100"
			chartnode.id = id
			var parent = document.getElementById(clientID+'.serviceroot.'+path)
			if(parent)
			{
				parent.appendChild(chartnode)
				chart = new SmoothieChart({grid: {verticalSections: 3}, timestampFormatter: SmoothieChart.timeFormatter})
				mChartsVisible[id] = chart
				chart.streamTo(chartnode, 500);
			}
			chartnode.addEventListener('mouseup', function(e)
			{
				unsubscribeToService(path, clientID)
			})
		}
		return chart
	}

	function removeChartFor(clientID, path)
	{
		console.log('removeChartFor called clientID = '+clientID+', path = '+path)
		setTimeout(function()
		{
			var parent = document.getElementById(clientID+'.serviceroot.'+path)
			var id = clientID+'.serviceroot.'+path+'.chart'
			var chartnode = document.getElementById(id)
			parent.removeChild(chartnode)
			chartnode.id = ""
			parent.innerHTML = ""
		}, SUBSCRIPTION_INTERVAL*3)
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
		releaseSubscriptions()
		releaseEventHandlers()
		this.close(true)
	})

	// Init layout.
	setLayoutProperties()

	// Set the save state since last session.
	//restoreSavedUIState()
	setupEventListeners()

})
