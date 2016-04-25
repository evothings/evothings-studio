$(function()
{
  /*** Electron modules ***/
	const ipcRenderer = require('electron').ipcRenderer
	var MAIN = require('electron').remote.getGlobal('main');
	var OS = require('os')
	var FS = require('fs')
	var SETTINGS = require('../settings/settings.js')
	var LOGGER = require('../server/log.js')
	var EVENTS = require('../server/system-events.js')
	// Awful, but I am not sure how to get hold of the BrowserWindow.id otherwise
	EVENTS.myID = MAIN.viewersWindow.id
	console.log("MyID = " + EVENTS.myID)
	var SERVER = require('../server/file-server.js')
	var ALL	= require('node-promise').allOrNone
	var PROMISE = require('node-promise').defer
	var MQTT = require('mqtt')

	var paho = require('../server/mqttws31.js')

	var mqtt_client  = ''

	var mCurrentClients = []

	var mCurrentClientList = []
	var mOldClientList = []

	var mChartsVisible = []
	var mTimeSeriesForChart = []
	var mInstrumentationReceivedFrom = []
	var mServiceSubscriptions = []
	var mTimeoutHandle = undefined

	var SUBSCRIPTION_INTERVAL = 300
	var SUBSCRIPTION_TIMEOUT = 600000
	var NETWORK_TIMEOUT = 6000

	ipcRenderer.on('msg', function(event, arg) {
	  //LOGGER.log('[user-Viewers.js] Viewers got : ' + event.data.message)
	  switch (arg.message) {
	    case 'hyper.log':
	      showResult('LOG: ' + event.data.logMessage)
	      break
	    case 'hyper.result':
		    showResult('RES: ' + event.data.result)
	  }
	})

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

	function saveUIState()
	{
		// Save editor and log content.

		var maxStorageSize = 100000

		// Save window layout.

		var geometry = MAIN.viewersWindow.getBounds()

		// Do not save if window is minimized on Windows.
		// On Windows an icon has x,y coords -32000 when
		// window is minimized. On Linux and OS X the window
		// coordinates and size are intact when minimized.
		if (win.x < -1000)
		{
			return;
		}

		SETTINGS.setViewersWindowGeometry(geometry)

		var layout = $('body').layout()

	}

	// Save global reference to function.
	window.saveUIState = saveUIState

	function restoreSavedUIState()
	{
		var geometry = SETTINGS.getViewersWindowGeometry()
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
			geometry.x = Math.min(geometry.x, screen.width - 100)
			geometry.y = Math.min(geometry.y, screen.height - 200)

			// Set window size.
			MAIN.viewersWindow.setBounds(geometry)
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

	function onViewersUpdated(viewerlist)
	{
		LOGGER.log('[hyper-viewers.js] got viewers updated event-------------------------------------------------------------');
		console.dir(viewerlist)
		if(viewerlist && viewerlist.clients)
		{
			mCurrentClientList = viewerlist.clients
			removeViewersNotInList(mCurrentClientList, mOldClientList)
			renderViewersFromList(mCurrentClientList)
			mOldClientList = mCurrentClientList
		}
	}

	function renderViewersFromList(list)
	{
		console.log('renderViewersFromList showing '+list.length+' clients')
		var domlist = document.getElementById('viewer-list')
		if(list && list.length)
		{
			//console.dir(list)
			list.forEach(function(viewer)
			{
				var exist = document.getElementById(viewer.clientID)
				requestStatus(viewer)
				if(!exist)
				{
					console.log('client '+viewer.clientID+' does not exist yet, so adding that...')
					renderViewer(domlist, viewer)
				}
				else
				{
					var applabel = document.getElementById(viewer.clientID+'_applabel')
					applabel.innerHTML = '<b>['+viewer.currentproject+']</b>'
				}
			})
		}
	}

	function removeViewersNotInList(newlist, oldlist)
	{
		console.log('removeViewersNotInList called. We have '+oldlist.length+' old clients and '+newlist.length+' new clients')
		var found = false
		oldlist.forEach(function(oldClient)
		{
			newlist.forEach(function(newClient)
			{
				console.log('checking if new client ' + newClient.clientID + ' == ' + oldClient.clientID)
				if (newClient.clientID == oldClient.clientID)
				{
					found = true
				}
			})
			if(!found)
			{
				removeOldClient(oldClient)
			}
		})
	}

	function removeOldClient(oldClient)
	{
		console.log('removing old client not seen anymore: '+oldClient.clientID)
		var domlist = document.getElementById('viewer-list')
		var client = document.getElementById(oldClient.clientID)
		if(client)
		{
			domlist.removeChild(client)
		}
		//
		// TODO: Remove event handlers!
		//
	}

	function renderViewer(domlist, viewer)
	{

		mCurrentClients[viewer.clientID] = viewer
		var rowdiv = document.createElement('div')
		rowdiv.id = viewer.clientID
		rowdiv.style.paddingLeft = '10px'
		rowdiv.style.display = 'flex';
		rowdiv.style.flexDirection = 'row'
		//
		var div = document.createElement('div')
		div.style.display = 'flex';
		div.style.flexDirection = 'column'
		div.style.justifyContent = 'space-around'
		//div.style.width = '200px'
		div.style.height = '120px'
		var span = document.createElement('span')
		span.innerHTML = viewer.name + ' ('+viewer.info.model+')'
		var span2 = document.createElement('span')
		span2.id = viewer.clientID + '_applabel'
		span2.innerHTML = '<b>['+viewer.currentproject+']</b>'
		var img = document.createElement('img')
		img.style.width='20px'
		img.style.height = '35px'
		img.src = getImageForModel(viewer.info)
		img.addEventListener('mouseup', function(e)
		{
			vibrateClient(viewer)
		})
		//
		var ball = document.createElement('div')
		ball.className = 'ball'
		ball.id = viewer.clientID+'_ball'
		ball.style.height = '15px'
		ball.style.width = '15px'
		//
		rowdiv.appendChild(div)
		//
		div.appendChild(ball)

		var imgrow = document.createElement('div')
		imgrow.style.display = 'flex';
		imgrow.style.flexDirection = 'row'
		imgrow.appendChild(img)

		div.appendChild(imgrow)
		div.appendChild(span)
		div.appendChild(span2)
		addMenuToClient(viewer, rowdiv)
		var cdiv = document.createElement('ul')
		cdiv.className = "treestyle"
		cdiv.style.paddingTop = "0"
		cdiv.style.paddingBottom = "0"
		cdiv.id = viewer.clientID + '.serviceroot'
		rowdiv.appendChild(cdiv)
		domlist.appendChild(rowdiv)
		console.log('adding client and requesting status')
		console.dir(viewer)
	}

	function addMenuToClient(viewer, div)
	{
		var buttonrow = document.createElement('div')
		buttonrow.style.display = 'flex';
		buttonrow.style.flexDirection = 'column'
		buttonrow.style.marginLeft = '5px'
		div.appendChild(buttonrow)

		var ubutton = createButton('Inject File(s)', viewer.clientID + '_ubutton')
		buttonrow.appendChild(ubutton)
		ubutton.addEventListener('mouseup', function(e)
		{
			showInjectionMenu(viewer, div)
		})

		var sbutton = createButton('Start Instrumentation', viewer.clientID + '_sbutton')
		buttonrow.appendChild(sbutton)
		sbutton.addEventListener('mouseup', function(e)
		{
			onClientSelected(viewer)
		})

		/*
		var lebutton = createButton('Load Example', viewer.clientID + '_lebutton')
		buttonrow.appendChild(lebutton)
		lebutton.addEventListener('mouseup', function(e)
		{
			console.log('load example for viewer (not implemented)')
		})

		var labutton = createButton('Load App', viewer.clientID + '_labutton')
		buttonrow.appendChild(labutton)
		labutton.addEventListener('mouseup', function(e)
		{
			console.log('load app for viewer (not implemented)')
		})
		*/
	}

	function createButton(name, id)
	{
		var sbutton = document.createElement('button')
		sbutton.className = "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"
		sbutton.id = id
		sbutton.style.margin = '5px'
		sbutton.style.fontSize = '10px'
		sbutton.style.height = '30px'
		//sbutton.style.height = '150px'
		sbutton.innerHTML = name
		return sbutton
	}

	function showInjectionMenu(viewer, div)
	{
		console.log('showInjectionMenu called (undefined)')
		var udialog = document.getElementById('udialog')
		udialog.viewer = viewer
		udialog.showModal()
	}

	function requestStatus(viewer)
	{
		console.log('....requesting status.....')
		ipcRenderer.send('workbench-window', { message: 'eval', code: '(function(){ hyper.sendMessageToServer(window.hyper.IoSocket, "client.instrumentation", {clientID: window.hyper.clientID, serviceStatus: typeof window._instrumentation });return "_DONOT_"; })();', client: viewer })
	}

	function getImageForModel(info)
	{
		var rv = undefined
		var model = info.model.toLowerCase()
		if (info.platform == "Android") {
			rv = 'images/PNG/Nexus7.png'
			if (model.indexOf('galaxy') > -1) {
				rv = 'images/PNG/Galaxy3.png'
			}
		}
		else {
			rv = 'images/PNG/iPhone5.png'
			if (model.indexOf('ipad') > -1) {
				rv = 'images/PNG/iPad.png'
				if (model.indexOf('mini') > -1) {
					rv = 'images/PNG/iPadMini.png'
				}
			}
		}
		return rv
	}

	function reSubscribeOnReconnect(clientID)
	{
		console.log('reSubscribeOnReconnect called for clientID '+clientID)
	}

	function onClientSelected(viewer)
	{
		console.log('user selected client '+viewer.name+' instrumentation loaded: '+mInstrumentationReceivedFrom[viewer.clientID])
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

	function vibrateClient(viewer)
	{
		ipcRenderer.send('workbench-window', { message: 'eval', code: 'navigator.vibrate(300)', client: viewer })
	}

	function injectInstrumentationToClient(client)
	{
		var wd = global.require.main.filename+'../'
		wd = wd.replace('hyper-viewers.html','')
		document.getElementById('p2').style.display="block"
		console.log('------------------------------------------------------------- injecting instrumentation into client '+client.name+' from directory '+wd+', to client '+client.UUID)
		var files =
		[
			'/injectables/util.js',
			'/injectables/mqttws31.js',
			'/injectables/easyble.js',
			'/injectables/instrumentation-manager.js',
			'/injectables/bluetooth-instrumentation.js',
			'/injectables/cordova-instrumentation.js',
			'/injectables/watcher-instrumentation.js',
			'/injectables/instrumentation-starter.js'
		]
		var promises = []
		var count = 0
		var filedata = []
		files.forEach(function(file)
		{
			(function(_count)
			{
				var p = PROMISE()
				promises.push(p)
				FS.readFile( wd+file, "utf-8", function (err, data)
				{
					console.log('read file '+file)
					filedata[_count] = data
					if (err)
					{
						throw err;
					}
					p.resolve(data)
				})
			})(count++)
		})

		var fdata = ''
		var error = function(e)
		{
			console.log('-- error in promises : '+e)
		}
		Promise.all(promises, error).then(function(datas)
		{
			console.log('-- all files loaded')
			filedata.forEach(function(fd)
			{
				fdata += fd + '; '
			})
			console.log('loaded all injectables')
			ipcRenderer.send('workbench-window', {
				message: 'eval',
				code: fdata,
				client: client
			})
			console.log('all injectables injected into client with UUID '+client.UUID+'. Evaluating listServices()')
			requestStatus(client)


		}, function(err)
		{
			console.log('Oh noes!! '+err)
		})
	}

	function onViewersInstrumentation(message)
	{
		//console.log('------------------ instrumentation received!!')
		cancelNetworkTimeout()
		//console.dir(message)

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
		else if (message.reconnectInstrumentation)
		{
			reSubscribeOnReconnect(message.clientID)
		}
		else if (message.serviceStatus)
		{
			setViewerServiceStatus(message)
		}
	}

	function setViewerServiceStatus(message)
	{
		console.log('-- got serviceStatus back: '+message.serviceStatus)
		var ball = document.getElementById(message.clientID+'_ball')
		var sbutton = document.getElementById(message.clientID + '_sbutton')
		var cdiv = document.getElementById(message.clientID + '.serviceroot')
		if(message.serviceStatus && message.serviceStatus != 'undefined')
		{
			if(ball)
			{
				console.log('setting ball '+ball.id+' green')
				ball.style.backgroundColor = 'green'
			}

			mInstrumentationReceivedFrom[message.clientID] = true
			var client = mCurrentClients[message.clientID]
			ipcRenderer.send('workbench-window', {
				message: 'eval',
				code: 'window.evo.instrumentation.selectHierarchy()',
				client: client
			})
			showElement(cdiv)
			hideElement(sbutton)
		}
		else
		{
			if(ball)
			{
				console.log('setting ball '+ball.id+' gray')
				ball.style.backgroundColor = 'gray'
			}

			mInstrumentationReceivedFrom[message.clientID] = false
			showElement(sbutton)
			hideElement(cdiv)
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
		var sobj = subscriptions[path]
		if(sobj)
		{
			delete subscriptions[path]
			if(!removeChartFor(clientID, path))
			{
				removePlateFor(clientID, path)
			}
		}
	}

	function releaseSubscriptions()
	{
		console.log('releaseSubscriptions called (unimplemented')
	}

	function releaseEventHandlers()
	{
		console.log('releaseSubscriptions called (unimplemented')
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
				var name = getNameFromPath(pathlevel.name)
				var id = parentnode.id + '.' + name
				if(!document.getElementById(id))
				{
					var sdiv = document.createElement('li')
					//sdiv.style.display = 'flex';
					//sdiv.style.flexDirection = 'row'
					//sdiv.className = "mdl-list__item"
					sdiv.style.backgroundColor = pathlevel.backgroundColor || '#fff'
					sdiv.style.minHeight = '0'
					sdiv.style.paddingLeft = "10px"
					sdiv.style.margin = '1px'
					parentnode.appendChild(sdiv)
					// create name, image and potential list of children. The latter to have the 'parent' id
					var ndiv = document.createElement('span')
					//ndiv.className = "mdl-button mdl-js-button mdl-button--raised"
					var ttid = parentnode.id + '.' + name + '_button'

					ndiv.innerHTML = name
					ndiv.id = ttid

					//ndiv.style.width = "150px"
					//ndiv.style.backgroundColor = '#eee'
					//ndiv.style.border = '1px solid grey'
					ndiv.style.fonFamily = 'Proxima Nova Regular'
					ndiv.style.height = '30px'
					if(pathlevel.label)
					{
						var ldiv = document.createElement('div')
						parentnode.appendChild(ldiv)
						var ltext = ''
						for(var l in pathlevel.label)
						{
							ltext += l + ': '+pathlevel.label[l] + ', '
						}
						ltext = ltext.substring(0, ltext.lenght-2)
						ldiv.innerHTML = ltext
					}

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
					//cdiv.className = "mdl-list"
					//cdiv.style.paddingLeft = "20px"
					cdiv.style.paddingTop = "0"
					cdiv.style.paddingBottom = "0"
					cdiv.id = id
					sdiv.appendChild(ndiv)
					ndiv.appendChild(img)
					parentnode.appendChild(cdiv)
					console.log('   adding childnode '+cdiv.id+' under parent node '+parentnode.id)
					sdiv.addEventListener('mouseup', function(e)
					{
						console.log('user selected path '+pathlevel.name)
						if(cdiv.__opened)
						{
							hideElement(cdiv)
						}
						else
						{
							showElement(cdiv)
							if(cdiv.childElementCount == 0)
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
										console.log('unsubscribing to service '+pathlevel.name)
										unsubscribeToService(pathlevel.name, clientID)
									}
								}
							}
						}

					})
				}
				else
				{
					console.log('not adding same things twice, here!')
				}
			}
			else
			{
				console.log('addHierarchySelection could not find parent node for '+pathlevel.name+' !!!')
			}
		})
	}

	function toggleShowOnElement(cdiv)
	{
		console.log('toggleShowOnElement for element '+cdiv.id)
		if(cdiv.__opened)
		{
			cdiv.style.display = 'none'
			cdiv.__opened = false
		}
		else
		{
			cdiv.style.display = 'block'
			cdiv.__opened = true
		}
	}

	function showElement(cdiv)
	{
		cdiv.style.display = 'block'
		cdiv.__opened = true
	}

	function hideElement(cdiv)
	{
		cdiv.style.display = 'none'
		cdiv.__opened = false
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
		console.log('selectHierarchy called for path '+path+' and client ')
		console.dir(client)
		waitForTimeout()
		ipcRenderer.send('workbench-window', { message: 'eval', code: 'window.evo.instrumentation.selectHierarchy("'+path+'")', client: client})
	}

	function subscribeToService(path, client)
	{
		console.log('subscribeToService called for path '+path)
		waitForTimeout()
		//subscribeToMqttChannel(client.clientID, path)
		ipcRenderer.send('workbench-window', { message: 'eval', code: 'window.evo.instrumentation.subscribeToService("'+path+'",{}, '+SUBSCRIPTION_INTERVAL+', '+SUBSCRIPTION_TIMEOUT+')', client: client })
	}

	function unsubscribeToService(path, clientID)
	{
		console.log('cancel subscription called')
		var client = mCurrentClients[clientID]
		var subscriptions = mServiceSubscriptions[clientID] || []
		var sid = subscriptions[path]
		//unSubscribeToMqttChannel(clientID, path)
		console.log('unsubscribing to path '+path+' -> '+sid+' for clientID '+clientID)
		var snackbarContainer = document.querySelector('#snackbar');
		var data =
		{
			message: 'Unsubscribing from '+path,
			timeout: 2000
		};
		snackbarContainer.MaterialSnackbar.showSnackbar(data);
		waitForTimeout()
		ipcRenderer.send('workbench-window', { message: 'eval', code: 'window.evo.instrumentation.unSubscribeToService("'+path+'","'+sid+'")', client: client })
	}

	function subscribeToMqttChannel(clientID, path)
	{
		var channel = '/instrumentation/'+clientID+'/'+path
		console.log('subscribing to mqtt channel '+channel)
		mqtt_client.subscribe(channel)
	}

	function unSubscribeToMqttChannel(clientID, path)
	{
		var channel = '/instrumentation/'+clientID+'/'+path
		console.log('subscribing to mqtt channel '+channel)
		mqtt_client.unsubscribe(channel)
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
			showMessageInSnackbar('Temporarily unable to reach viewer.')
		}, NETWORK_TIMEOUT)
	}

	function showMessageInSnackbar(message)
	{
		var snackbarContainer = document.querySelector('#snackbar');
		var data =
		{
			message: message,
			timeout: 2000
		};
		snackbarContainer.MaterialSnackbar.showSnackbar(data);
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
		//console.log('adding servicedata')
		//console.dir(servicedata)
		if(!isClientAlreadySubscribedToService(clientID, servicedata.path))
		{
			saveServiceSubscription(clientID, {subscriptionID: servicedata.subscriptionID, path: servicedata.path, type: servicedata.data.type})
		}
		var path = servicedata.path
		var channels = 0
		for(var k in servicedata.data.value)
		{
			channels++
		}
		if(servicedata.data.type == 'plot')
		{
			plotServiceData(time, servicedata, clientID, path, channels)
		}
		else
		{
			displayServiceData(time, servicedata, clientID, path, channels)
		}
	}

	function displayServiceData(time, servicedata, clientID, path, channels)
	{
		//console.log('displayServiceData-----------------------')
		//console.dir(servicedata)
		var plate = getPlateForPath(clientID, path)
		plate.innerHTML = '<b>'+servicedata.data.name+'</b>: '
		var part = ''

		if(servicedata && servicedata.data && servicedata.data.value && servicedata.data.value.length)
		{
			if(typeof servicedata.data.value == 'string')
			{
				plate.innerHTML = '&nbsp;&nbsp;'+servicedata.data.value
			}
			else
			{
				for(var i = 0; i < servicedata.data.value.length; i++)
				{
					var val = servicedata.data.value[i]
					part += val+', '
				}
				part = part.substring(0, part.length-2)
				plate.innerHTML += part
			}

		}
		else if (typeof servicedata.data.value == 'object')
		{

			for(var k in servicedata.data.value)
			{
				var v = servicedata.data.value[k]
				part += k+' = '+v+','
			}
			part = part.substring(0, part.length-1)
			plate.innerHTML += part
		}
		else
		{
			plate.innerHTML += servicedata.data.value
		}
	}

	function plotServiceData(_time, servicedata, clientID, path, channels)
	{
		var time = Date.now()
		var chart = getChartForPath(clientID, path, channels)
		//console.log('plotservicedata got chart '+chart)
		//console.dir(chart)
		if(chart)
		{
			var color = servicedata.color || 'rgb(255,255,255)'
			var fillstyle = servicedata.fillstyle || 'rgba(0,255,0,0.30)'
			var value = undefined
			var lid = clientID+'.serviceroot.'+path+'.chart_legend'
			var legend = document.getElementById(lid)
			legend.innerHTML = ''
			if(typeof servicedata.data.value == 'object')
			{
				var count = 0
				for(var key in servicedata.data.value)
				{
					if(key != 'timestamp')
					{
						value = parseFloat(servicedata.data.value[key])
						legend.innerHTML += '&nbsp;&nbsp;'+key+': '+value+'<br/>'
						switch(count++)
						{
							case 0:
								color = 'rgb(25, 255, 25)'
								break;
							case 1:
								color = 'rgba(255, 25, 25, 0.76)'
								break;
							case 2:
								color = 'rgba(25, 25, 255, 0.76)'
								break;
							case 3:
								color = 'rgb(115, 95, 205)'
								break;
							default:
								color = 'rgb(195, 205, 255)'
								break;
						}
						var ts = getTimeSeriesFor(path+'_'+key, chart, color, fillstyle)
						//console.log('  -- appending value '+parseFloat(value)+' for key '+key+' and timestamp '+time)
						ts.append(time, value)
					}
				}
			}
			else
			{
				value = parseFloat(servicedata.data.value)
				legend.innerHTML = getNameFromPath(path)
				var ts = getTimeSeriesFor(path, chart, color, fillstyle)
				ts.append(time, value)
			}
		}
	}

	function getTimeSeriesFor(key, chart, color, fillstyle)
	{
		var ts = mTimeSeriesForChart[key]
		if(!ts)
		{
			ts = new TimeSeries()
			ts._instrumentation_key = key
			mTimeSeriesForChart[key] = ts
			console.log('  -- adding new timeseries for key '+key+' and color '+color)
			chart.addTimeSeries(ts, {lineWidth: 2, strokeStyle: color, fillStyle: fillstyle});
			//chart.addTimeSeries(ts)
			console.dir(chart)
		}
		return ts
	}

	function getPlateForPath(clientID, path)
	{
		var id = clientID+'.serviceroot.'+path+'.plate'
		var platenode = document.getElementById(id)
		if(!platenode)
		{
			platenode = document.createElement('div')
			platenode.style.backgroundColor = '#eee'
			platenode.width = "100"
			platenode.height = "100"
			platenode.style.fontSize = 18
			platenode.id = id
			var parent = document.getElementById(clientID+'.serviceroot.'+path)
			if(parent)
			{
				parent.appendChild(platenode)
			}
			platenode.addEventListener('mouseup', function(e)
			{
				unsubscribeToService(path, clientID)
			})
		}
		return platenode
	}

	function removePlateFor(clientID, path)
	{
		setTimeout(function()
		{
			var parent = document.getElementById(clientID+'.serviceroot.'+path)
			var id = clientID+'.serviceroot.'+path+'.plate'
			var platenode = document.getElementById(id)
			if(platenode)
			{
				parent.removeChild(platenode)
				platenode.id = ""
				parent.innerHTML = ""
			}
		}, SUBSCRIPTION_INTERVAL*3)
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
			chartnode.__openend = true
			var chartnodelegend = document.createElement('div')
			chartnodelegend.id = chartnode.id + '_legend'
			chartnodelegend.__opened = true
			var parent = document.getElementById(clientID+'.serviceroot.'+path)
			if(parent)
			{
				parent.appendChild(chartnode)
				parent.appendChild(chartnodelegend)
				chart = new SmoothieChart({grid: {verticalSections: 4}, timestampFormatter: SmoothieChart.timeFormatter})
				mChartsVisible[id] = chart
				console.log('chart '+path+' streaming to node '+chartnode.id+' with interval '+SUBSCRIPTION_INTERVAL)
				chart.streamTo(chartnode,SUBSCRIPTION_INTERVAL);
			}
			chartnode.addEventListener('mouseup', function(e)
			{
				unsubscribeToService(path, clientID)

			})
		}
		else if (!chartnode.__opened)
		{
			showElement(chartnode)
			showElement(document.getElementById(chartnode.id+'_legend'))
		}
		return chart
	}

	function removeChartFor(clientID, path)
	{
		console.log('removeChartFor called clientID = '+clientID+', path = '+path)
		var parent = document.getElementById(clientID+'.serviceroot.'+path)
		var id = clientID+'.serviceroot.'+path+'.chart'
		var chartnode = document.getElementById(id)

		if(chartnode)
		{
			hideElement(chartnode)
			var chartnodelegend = document.getElementById(chartnode.id + '_legend')
			hideElement(chartnodelegend)
			return true
		}
		else
		{
			return false
		}
	}

	function sendUploadFiles (files, viewer)
	{

		files.forEach(function(file)
		{
			console.log('------------------------------------------ file')
			console.dir(file)
			var name = file.name
			var size = file.size
			var reader = new FileReader();
			reader.onload = function(event)
			{
				console.dir(event)
				var filedata = btoa(event.target.result)
				var escapedata = escape(encodeURIComponent(filedata))
				var file = {name: name, size: size, data: escapedata}
				//injectFileData({file: file, viewer: viewer})
				EVENTS.publish(EVENTS.INJECTFILEDATA,{file: file, viewer:{}} )
			}
			reader.readAsBinaryString(file);
		})
	}

	function executeUploadFile (files, viewer)
	{

		console.log('executeUploadFiles called')
		files.forEach(function(file)
		{
			var reader = new FileReader();
			reader.onload = function(event)
			{
				var filedata = event.target.result
				//executeFileData({filedata: filedata, viewer: viewer})
				EVENTS.publish(EVENTS.EXECUTEFILEDATA,{file: filedata, viewer:{}} )
			}
			reader.readAsText(file);
		})
	}



	function setupEventListeners()
	{
		EVENTS.subscribe(EVENTS.VIEWERSUPDATED, onViewersUpdated.bind(this))
		EVENTS.subscribe(EVENTS.VIEWERSINSTRUMENTATION, onViewersInstrumentation.bind(this))

		console.log('getting initial list of clients from server '+SERVER)
		var info = SERVER.getClientInfo()
		if(info && info.clients)
		{
			renderViewersFromList(info.clients)
			mCurrentClientList = info.clients
			mOldClientList = info.clients
		}


		var uploadFiles = []
		var state = 'off'

		document.getElementById('uploadbutton').addEventListener('click', function()
		{
			var dialog = document.getElementById('udialog')
			dialog.close()
			if(state == 'off')
			{
				showMessageInSnackbar('Injecting files and calling callbacks')
				sendUploadFiles(uploadFiles, dialog.viewer)
			}
			else
			{
				showMessageInSnackbar('Injecting and executing JS files.')
				executeUploadFile(uploadFiles, dialog.viewer)
			}

		});
		document.getElementById('uclose').addEventListener('click', function()
		{
			document.getElementById('udialog').close()
		});
		document.getElementById('fileselect').addEventListener('change', function()
		{
			uploadFiles = []
			for(var i = 0; i<this.files.length; i++)
			{
				var file =  this.files[i];
				uploadFiles.push(file)
				// This code is only for demo ...
				console.group("File "+i);
				console.log("name : " + file.name);
				console.log("size : " + file.size);
				console.log("type : " + file.type);
				console.log("date : " + file.lastModified);
				console.groupEnd();
			}
		}, false);

		var uswitch = document.getElementById('switch-1')
		var label = document.getElementById('uswitchlabel')

		uswitch.addEventListener('change', function(e)
		{
			console.dir(e)
			console.log('upload file type switch ')
			console.dir(uswitch.value)
			state = state == 'on' ? 'off' : 'on'
			uswitchlabel.innerHTML = state  == 'on' ? "send file as javaScript and eval immediately" : "Send file as Base64"
		})

		var uuid = SETTINGS.getEvoGUID()

		//mqtt_client = MQTT.connect('wss://vernemq.evothings.com:8084', options)
		//mqtt_client = MQTT.connect('mqtt://test.mosquitto.org')
		/*
		mqtt_client.on('message', function(topic, message)
		{
			console.log('mqtt message received on channel '+topic)
			console.dir(message)
			addServiceDataToViewer(message.clientID, message.time, message.serviceData)
		})

		mqtt_client.on('error', function(error)
		{
			console.log('mqtt ERROR: '+error)
		})

		mqtt_client.on('connect', function()
		{
			console.log('++ MQTT client connected ++')
		})

		mqtt_client.on('offline', function ()
		{
			console.log('offline');
		});

		mqtt_client.on('close', function ()
		{
			console.log('close');
			mqtt_client.end();
		})
		*/

		/*

		mqtt_client = new paho.MQTT.Client('vernemq.evothings.com', 8084, uuid)
		var options = {
			useSSL: true,
			onSuccess: function()
			{
				console.log('MQTT connected')

			},
			onFailure: function(err)
			{
				console.log('MQTT Error: '+JSON.stringify(arguments))
			}
		}
		mqtt_client.connect(options);

		mqtt_client.onMessageArrived = function(message)
		{

			console.log("Message Arrived: " + message.payloadString);
			console.log("Topic:     " + message.destinationName);
			console.log("QoS:       " + message.qos);
			console.log("Retained:  " + message.retained);
			// Read Only, set if message might be a duplicate sent from broker
			console.log("Duplicate: " + message.duplicate);

			var pl = JSON.parse(message.payloadString)
			addServiceDataToViewer(pl.clientID, pl.time, pl.serviceData)
		}
		*/
	}




	var win = MAIN.viewersWindow
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
