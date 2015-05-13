/*
File: hyper-reloader.js
Description: This code is loaded by the server
when the reloader script is requested.
Author: Mikael Kindborg
Copyright (c) 2013-2014 Mikael Kindborg
License: Apache Version 2.0
*/

window.hyper = (function(hyper, socketIoPort)
{
	// Buffer for storing hyper.log messages.
	var hyperLogBuffer = []

	// This variable is true if we are connected to the server.
	hyper.isConnected = false

	// User-defined function that is called when the app is
	// connected to the server.
	hyper.onConnectedFun = null

	// Sets the onConnected function. You can use this function
	// to display a status message, for example.
	hyper.onConnected = function(fun)
	{
		if (hyper.isConnected)
		{
			// Already connected.
			fun()
		}
		else
		{
			// Call when connected.
			hyper.onConnectedFun = fun
		}
	}

	// Send result of evaluating JS to the UI.
	hyper.sendJsResult = function(result)
	{
		hyper.isConnected &&
		hyper.IoSocket.emit('hyper.result', result)
	}

	// Log to remote HyperReload Workbench window.
	hyper.rlog = function(message)
	{
		if (hyper.isConnected)
		{
			hyper.IoSocket.emit('hyper.log', message)
		}
		else
		{
			hyperLogBuffer.push(message)
		}
	}

	// If you want, you can set hyper.log to console.log in your code.
	hyper.log = hyper.log || hyper.rlog

	function sendBufferedHyperLogMessages()
	{
		for (var i = 0; i < hyperLogBuffer.length; ++ i)
		{
			hyper.log(hyperLogBuffer[i])
		}
		hyperLogBuffer = []
	}

	// Called from native code. NOT USED.
	/*hyper.nativeConsoleMessageCallBack = function(message)
	{
		hyper.log(message)
	}*/

	window.onerror = function(msg, url, linenumber)
	{
		url = url || 'unknown'
		//console.log('@@@ url: ' + url)
		// Strip off hostname from url.
		// url: http://192.168.0.102:4042/hyper.reloader
		var pos = url.indexOf('//', 0)
		if (pos < 0) { pos = 0 }
		var pos2 = url.indexOf('/', pos + 2)
		if (pos2 < 0) { pos2 = pos } else { ++pos2 }
		var file = url.substring(pos2)
		var errorMessage = '[ERR] ' + msg + ' [' + file + ': ' + linenumber + ']'
		hyper.log(errorMessage)
		return true
	}

	var baseUrl = 'http://' + window.location.hostname

	function connect()
	{
		// Only connect in the topmost window!
		if (window !== window.top) { return }

		var socket = io(baseUrl + ':' + socketIoPort)
		hyper.IoSocket = socket
		socket.on('hyper.run', function(data)
		{
			if (!hyper.isReloading)
			{
				hyper.isReloading = true

				// Show the loading toast.
				hyper.showMessage('Loading')

				setTimeout(function() {
					window.location.replace(data.url) },
					300)
			}
		})
		socket.on('hyper.reload', function(data)
		{
			if (!hyper.isReloading)
			{
				hyper.isReloading = true

				// Show the loading toast.
				hyper.showMessage('Loading')

				setTimeout(function() {
					window.location.reload(true) },
					300)
			}
		})
		socket.on('hyper.eval', function(data)
		{
			try
			{
				var result = eval(data)
				hyper.sendJsResult(result)
			}
			catch (err)
			{
				hyper.sendJsResult('[ERR] ' + err)
			}
		})
		socket.on('connect', function()
		{
			socket.emit('hyper.client-connected', null)
			hyper.isConnected = true
			if (hyper.onConnectedFun)
			{
				hyper.onConnectedFun()
			}
			sendBufferedHyperLogMessages()
		})
	}

	/**
	 * Go to the start page. When using the
	 * HyperReload app, this is the main screen.
	 */
	hyper.gotoStartPage = function()
	{
		history.go(-(history.length-1))
	}

	/**
	 * Displays a message box similar to a Toast on Android.
	 */
	hyper.showMessage = function(message, id, duration)
	{
		var toast = document.createElement('div')
		var width = Math.min(
			message.length * 16,
			window.innerWidth - 40)
		var left = ((window.innerWidth - width) / 2) - 20 //padding

		toast.id = id || 'hyper-message'
		toast.style.width = width + 'px'
		toast.style.position = 'absolute'
		toast.style.left = left + 'px'
		toast.style.bottom = '40px'
		toast.style.padding = '10px 20px'
		toast.style.borderRadius = '8px'
		toast.style.MozBorderRadius = '8px'
		toast.style.WebkitBorderRadius = '8px'
		toast.style.background = '#FFFFFF'
		toast.style.border = '1px solid #000000'
		toast.style.fontFamily = 'sans-serif'
		toast.style.fontSize = '18px'
		toast.style.fontWeight = 'bold'
		toast.style.color = '#000000'
		toast.style.textAlign = 'center'
		toast.style.visibility = 'visible'
		toast.style.zIndex = '999999'
		toast.innerHTML = message

		document.body.appendChild(toast)

		if (duration)
		{
			setTimeout(function() {
				document.body.removeChild(toast) },
				duration)
		}
	}

	/**
	 * Hides the message box.
	 */
	hyper.hideMessage = function(id)
	{
		var toast  = document.getElementById(id || 'hyper-message')
		document.body.removeChild(toast)
	}

	// Connect when page has loaded (connecting sooner may stall page load).
	window.addEventListener('DOMContentLoaded', function(e) { connect() }, true)

	return hyper

})(window.hyper || {}, __SOCKET_IO_PORT_INSERTED_BY_SERVER__)
