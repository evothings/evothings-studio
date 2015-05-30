/*
File: hyper-server.js
Description: HyperReload server functionality.
Author: Mikael Kindborg

License:

Copyright (c) 2013 Mikael Kindborg

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

/*** Modules used ***/

var OS = require('os')
var SOCKETIO = require('socket.io')
var FS = require('fs')
var PATH = require('path')
var FILEUTIL = require('./fileutil.js')
var WEBSERVER = require('./webserver')
var SETTINGS = require('../settings/settings.js')

/*********************************/
/***	   Server code		   ***/
/*********************************/

/*** Server variables ***/

var mWebServer = null
var mUDPServer = null
var mIO
var mBasePath
var mAppPath
var mAppFile
var mIpAddress
var mMessageCallback = null
var mClientConnectedCallback = null
var mReloadCallback = null

/*** Server functions ***/

/**
 * Internal.
 *
 * Version of the webserver hook function that inserts the reloader
 * script on each HTML page requested.
 */
function webServerHookFunForScriptInjection(request, response, path)
{
	// Update the server address on every request (overkill but simple).
	// TODO: If connecting using 'localhost' or '127.0.0.1' this
	// will break existing wifi connections! This should be fixed and/or
	// documented.
	mIpAddress = request.socket.address().address

	if (path == '/')
	{
		// Serve the root request.
		return serveRootRequest(request, response)
	}

	// Proceed serving requests.
	if (path == '/hyper.reloader')
	{
		return serveReloaderScript(response)
	}
	else if (SETTINGS.getServeCordovaJsFiles() &&
		(path == '/cordova.js' ||
		path == '/cordova_plugins.js' ||
		path.indexOf('/plugins/') == 0))
	{
		return serveCordovaFile(request, response, path)
	}
	else if (mBasePath && FILEUTIL.fileIsHTML(path))
	{
		return serveHtmlFileWithScriptInjection(request, response, path)
	}
	else
	{
		// Use default processing for all other pages.
		return false
	}
}

/**
 * Internal.
 *
 * Serve root file.
 */
function serveRootRequest(request, response)
{
	// Set the app path so that the server/ui directory can be accessed.
	setAppPath(process.cwd() + '/hyper/server/hyper-connect.html')

	// Always serve the connect page for the root url.
	return serveHtmlFile(
		request,
		response,
		'./hyper/server/hyper-connect.html')

	/* UNUSED
	// Root path is requested, send the current page if set.
	if (mAppPath)
	{
		window.console.log('@@@ serving mAppPath: ' + mAppPath)
		return serveHtmlFile(
			request,
			response,
			mAppPath)
	}
	// Otherwise send the connect page.
	else
	{
		return serveHtmlFile(
			request,
			response,
			'./hyper/server/hyper-connect.html')
	}
	*/
}

/**
 * Internal.
 *
 * Serve reloader script.
 */
function serveReloaderScript(response)
{
	var script = FILEUTIL.readFileSync('./hyper/server/hyper-reloader.js')
	if (script)
	{
		script = script.replace(
			'__SOCKET_IO_PORT_INSERTED_BY_SERVER__',
			SETTINGS.getWebServerPort())
		mWebServer.writeRespose(response, script, 'application/javascript')
		return true
	}
	else
	{
		return false
	}
}

/**
 * Internal.
 *
 * Serve HTML file. Will insert reloader script.
 */
function serveHtmlFileWithScriptInjection(request, response, path)
{
	var filePath = mBasePath + path.substr(1)
	return serveHtmlFile(
		request,
		response,
		filePath)
}

/**
 * Internal.
 *
 * Serve Cordova JavaScript file for the platform making the request.
 */
function serveCordovaFile(request, response, path)
{
	// Platform flags (boolean values).
	var userAgent = request['headers']['user-agent']
	var isAndroid = userAgent.indexOf('Android') > 0
	var isIOS =
		(userAgent.indexOf('iPhone') > 0) ||
		(userAgent.indexOf('iPad') > 0) ||
		(userAgent.indexOf('iPod') > 0)
	var isWP = userAgent.indexOf('Windows Phone') > 0

	// Two methods are used to find cordova files for the
	// platform making the request.

	// Method 1:
	// If we are inside a cordova project, we use the
	// files in that project.
	// Folder structure:
	//   www <-- mBasePath (root of running app)
	//     index.html
	//   platforms
	//     android
	//       assets
	//         www
	//           cordova.js
	//           cordova_plugins.js
	//           plugins
	//     ios
	//       www
	//         cordova.js
	//         cordova_plugins.js
	//         plugins

	// Search path to Cordova files in current project.
	// Note that mBasePath ends with path separator.
	var androidCordovaAppPath =
		mBasePath +
		'../platforms/android/assets/' +
		'www' + path
	var iosCordovaAppPath =
		mBasePath +
		'../platforms/ios/' +
		'www' + path
	var wpCordovaAppPath =
		mBasePath +
		'../platforms/wp8/' +
		'www' + path

	// Get the file, first try the path for a Cordova project, next
	// get the file from the HyperReload Cordova library folder.
	if (isAndroid)
	{
		if (serveJsFile(response, androidCordovaAppPath)) { return true }
		return false
	}

	if (isIOS)
	{
		if (serveJsFile(response, iosCordovaAppPath)) { return true }
		return false
	}

	if (isWP)
	{
		if (serveJsFile(response, wpCordovaAppPath)) { return true }
		return false
	}

	return false
}

/**
 * Internal.
 *
 * If file exists, serve it and return true, otherwise return false.
 * Insert the reloader script if file exists.
 */
function serveHtmlFile(request, response, path)
{
	var content = FILEUTIL.readFileSync(path)
	if (content)
	{
		content = insertReloaderScript(content, request)
		if(!content)
		{
			return false
		}
		mWebServer.writeRespose(response, content, 'text/html')
		return true
	}
	else
	{
		return false
	}
}

/**
 * Internal.
 *
 * Serve HTML file without inserting reloader script.
 * An optional modification function allows the caller
 * to update the content of the file being served.
 */
function serveHtmlFilePlainlyWithoutReloaderScript(request, response, path, modFun)
{
	var content = FILEUTIL.readFileSync(path)
	if (content)
	{
		if (modFun)
		{
			content = modFun(content)
		}
		mWebServer.writeRespose(response, content, 'text/html')
		return true
	}
	else
	{
		return false
	}
}

/**
 * Internal.
 *
 * If file exists, serve it and return true, otherwise return false.
 */
function serveJsFile(response, path)
{
	var content = FILEUTIL.readFileSync(path)
	if (content)
	{
		mWebServer.writeRespose(response, content, 'application/javascript')
		return true
	}
	else
	{
		return false
	}
}

/**
 * Internal.
 *
 * Return script tags for reload functionality.
 */
function createReloaderScriptTags(address)
{
	return ''
		+ '<script src="/socket.io/socket.io.js"></script>'
		+ '<script src="/hyper.reloader"></script>'
}

/**
 * Internal.
 *
 * Insert the script at the template tag, if no template tag is
 * found, insert at alternative locations in the document.
 *
 * It is desirable to have script tags inserted as early as possible,
 * to enable hyper.log and error reporting during document loading.
 *
 * Applications can use the tag <!--hyper.reloader--> to specify
 * where to insert the reloader script, in case of reload problems.
 */
function insertReloaderScript(html, request)
{
	var host = request.headers.host
	if(!host)
	{
		return false
	}
	var address = host.substr(0, host.indexOf(':'))
	//window.console.log('address ' + address)
	var script = createReloaderScriptTags(address)

	// Is there a template tag? In that case, insert script there.
	var hasTemplateTag = (-1 != html.indexOf('<!--hyper.reloader-->'))
	if (hasTemplateTag)
	{
		return html.replace('<!--hyper.reloader-->', script)
	}

	// Insert after title tag.
	var pos = html.indexOf('</title>')
	if (pos > -1)
	{
		return html.replace('</title>', '</title>' + script)
	}

	// Insert last in head.
	var pos = html.indexOf('</head>')
	if (pos > -1)
	{
		return html.replace('</head>', script + '</head>')
	}

	// Fallback: Insert first in body.
	// TODO: Rewrite to use regular expressions to capture more cases.
	pos = html.indexOf('<body>')
	if (pos > -1)
	{
		return html.replace('<body>', '<body>' + script)
	}

	// Insert last in body.
	pos = html.indexOf('</body>')
	if (pos > -1)
	{
		return html.replace('</body>', script + '</body>')
	}

	// If no place to insert the reload script, just return the HTML unmodified.
	// TODO: We could insert the script tag last in the document,
	// as a last resort.
	return html
}

/**
 * External.
 */
function getIpAddress(fun)
{
	fun(ensureIpAddress(mIpAddress))
}

/**
 * External.
 */
function getIpAddresses(fun)
{
	mWebServer.getIpAddresses(function(addresses)
	{
		fun(addresses)
	})
}

/**
 * External.
 */
function setAppPath(appPath)
{
	if (appPath != mAppPath)
	{
		mAppPath = appPath.replace(new RegExp("\\"+PATH.sep, 'g'), '/')
		var pos = mAppPath.lastIndexOf('/') + 1
		mBasePath = mAppPath.substr(0, pos)
		mAppFile = mAppPath.substr(pos)
		mWebServer.setBasePath(mBasePath)
	}
}

/**
 * External.
 * Return the name of the main HTML file of the application.
 */
function getAppFileName()
{
	return mAppFile
}

/**
 * External.
 */
function getAppFileURL()
{
	return 'http://' + mIpAddress + ':' + SETTINGS.getWebServerPort() + '/' + mAppFile
}

/**
 * External.
 */
function getServerBaseURL()
{
	return 'http://' + mIpAddress + ':' + SETTINGS.getWebServerPort() + '/'
}

/**
 * External.
 * Reloads the main HTML file of the current app.
 */
function runApp()
{
	mIO.emit('hyper.run', {url: getAppFileURL()})
}

/**
 * External.
 * Reloads the currently visible page of the browser.
 */
function reloadApp()
{
	mIO.emit('hyper.reload', {})
	mReloadCallback && mReloadCallback()
}

/**
 * External.
 */
function evalJS(code)
{
	mIO.emit('hyper.eval', code)
}

/**
 * External.
 *
 * Callback form: fun(object)
 */
function setMessageCallbackFun(fun)
{
	mMessageCallback = fun
}

/**
 * External.
 *
 * Callback form: fun()
 */
function setClientConnenctedCallbackFun(fun)
{
	mClientConnectedCallback = fun
}

/**
 * External.
 */
function startServers()
{
	window.console.log('Start servers')

	if (SETTINGS.getServerDiscoveryEnabled())
	{
		window.console.log('Start UDP server')
		startUDPServer(SETTINGS.getServerDiscoveryPort())
	}

	window.console.log('Start web server')
	startWebServer(mBasePath, SETTINGS.getWebServerPort(), function(server)
	{
		window.console.log('Web server started')
		mWebServer = server
		mWebServer.getIpAddress(function(address)
		{
			mIpAddress = ensureIpAddress(address)
		})
		mWebServer.setHookFun(webServerHookFunForScriptInjection)
	})
}

/**
 * External.
 */
function stopServers(callback)
{
	window.console.log('Stop servers')
	try
	{
		if (mWebServer)
		{
			mWebServer.stop(function()
			{
				window.console.log('Web server stopped.')
				if (mUDPServer)
				{
					window.console.log('Stop UDP server.')
					mUDPServer.close()
					window.console.log('UDP server stopped.')
					callback && callback()
				}
			})
		}
	}
	catch (error)
	{
		window.console.log('Error in stopServers: ' + error)
	}
}

/**
 * External.
 */
function restartServers()
{
	window.console.log('Restart servers')

	// Callback passed to stop servers is not always reliable.
	stopServers()

	// Using time out instead to start servers.
	setTimeout(startServers, 5000)
}

/**
 * External.
 *
 * Callback form: fun()
 */
function setReloadCallbackFun(fun)
{
	mReloadCallback = fun
}

/**
 * Internal.
 */
function ensureIpAddress(address)
{
	return address || '127.0.0.1'
}

/**
 * Internal.
 */
function displayLogMessage(message)
{
	if (mMessageCallback)
	{
		mMessageCallback({ message: 'hyper.log', logMessage: message })
	}
}

/**
 * Internal.
 */
function displayJsResult(result)
{
	if (mMessageCallback)
	{
		mMessageCallback({ message: 'hyper.result', result: result })
	}
}

/**
 * Internal.
 */
function startWebServer(basePath, port, fun)
{
	var server = WEBSERVER.create()
	server.setBasePath(basePath)
	server.create()
	createSocketIoServer(server.getHTTPServer())
	server.start(port)
	fun(server)
}

/**
 * Internal.
 */
function createSocketIoServer(httpServer)
{
	mIO = SOCKETIO(httpServer)

	// Handle socket connections.
	mIO.on('connection', function(socket)
	{
		// Debug logging.
		window.console.log('Client connected')
/*
		if (!isWhiteListed(socket.ip))
		{
			socket.disconnect()
			return
		}
*/
		socket.on('disconnect', function ()
		{
			// Debug logging.
			window.console.log('Client disconnected')
		})

		socket.on('hyper.client-connected', function(data)
		{
			// Debug logging.
			window.console.log('hyper.client-connected')

			mClientConnectedCallback && mClientConnectedCallback()
		})

		socket.on('hyper.log', function(data)
		{
			displayLogMessage(String(data))
		})

		socket.on('hyper.result', function(data)
		{
			//window.console.log('data result type: ' + (typeof data))
			//window.console.log('data result : ' + data)

			// Functions cause a cloning error.
			if (typeof data == 'function')
			{
				data = typeof data
			}
			displayJsResult(data)
		})

		// TODO: This code is not used, remove it eventually.
		// Closure that holds socket connection.
		/*(function(socket)
		{
			//mSockets.push_back(socket)
			//socket.emit('news', { hello: 'world' });
			socket.on('unregister', function(data)
			{
				mSockets.remove(socket)
			})
		})(socket)*/
	})
}

/**
 * Experimental.
 */
function startUDPServer(port)
{
	// Send info about this server back to the client.
	function sendServerInfo(info)
	{
		var serverData =
		{
			name: OS.hostname(),
			port: SETTINGS.getWebServerPort()
		}

		var message = new Buffer(JSON.stringify(serverData))

		server.send(
			message,
			0,
			message.length,
			info.port,
			info.address,
			function(err, bytes)
			{
			}
		)
	}

	// Create server socket.
	var DATAGRAM = require('dgram')
	var server = DATAGRAM.createSocket('udp4')
	mUDPServer = server

	// Set handler for incoming messages.
	server.on('message', function (msg, info)
	{
		if (msg == 'hyper.whoIsThere')
		{
			// TODO: Make some allow/deny/whitelist type of
			// check here? Only send server info if user allows?
			sendServerInfo(info)
		}
	})

	// Set handler for incoming messages.
	server.on('listening', function ()
	{
		// Not used: var address = server.address()
		window.console.log('UDP server listening')
	})

	// Bind server socket to port.
	server.bind(port)
}

/*********************************/
/*** Hot reload on file update ***/
/*********************************/

/*** File traversal variables ***/

var mLastReloadTime = Date.now()
var mTraverseNumDirecoryLevels = 0
var mFileCounter = 0
var mNumberOfMonitoredFiles = 0

/*** File traversal functions ***/

/**
 * External.
 */
function setTraverseNumDirectoryLevels(levels)
{
	mTraverseNumDirecoryLevels = levels
}

/**
 * External.
 */
function getNumberOfMonitoredFiles()
{
	return mNumberOfMonitoredFiles
}

/**
 * External.
 */
function fileSystemMonitor()
{
	mFileCounter = 0
	var filesUpdated = fileSystemMonitorWorker(
		mBasePath,
		mTraverseNumDirecoryLevels)
	if (filesUpdated)
	{
		reloadApp()
		setTimeout(fileSystemMonitor, 1000)
	}
	else
	{
		mNumberOfMonitoredFiles = mFileCounter
		setTimeout(fileSystemMonitor, 500)
	}
}

/**
 * Internal.
 * Return true if a file ahs been updated, otherwise false.
 */
function fileSystemMonitorWorker(path, level)
{
	//window.console.log('fileSystemMonitorWorker path:level: ' + path + ':' + level)
	if (!path) { return false }
	try
	{
		/*var files = FS.readdirSync(path)
		for (var i in files)
		{
			window.console.log(path + files[i])
		}
		return false*/

		var files = FS.readdirSync(path)
		for (var i in files)
		{
			try
			{
				var stat = FS.statSync(path + files[i])
				var t = stat.mtime.getTime()

				if (stat.isFile())
				{
					++mFileCounter
				}

				//window.console.log('Checking file: ' + files[i] + ': ' + stat.mtime)
				if (stat.isFile() && t > mLastReloadTime)
				{
					//window.console.log('***** File has changed ***** ' + files[i])
					mLastReloadTime = Date.now()
					return true
				}
				else if (stat.isDirectory() && level > 0)
				{
					//window.console.log('Decending into: ' + path + files[i])
					var changed = fileSystemMonitorWorker(
						path + files[i] + '/',
						level - 1)
					if (changed) { return true }
				}
			}
			catch (err2)
			{
				window.console.log('***** ERROR2 fileSystemMonitorWorker ****** ' + err2)
			}
		}
	}
	catch(err1)
	{
		window.console.log('***** ERROR1 fileSystemMonitorWorker ****** ' + err1)
	}
	return false
}

/*window.console.log(mBasePath)
var files = FS.readdirSync(mBasePath)
for (var i in files)
{
	window.console.log(files[i])
}*/

/*********************************/
/***	  Module exports	   ***/
/*********************************/

exports.startServers = startServers
exports.stopServers = stopServers
exports.restartServers = restartServers
exports.getIpAddress = getIpAddress
exports.getIpAddresses = getIpAddresses
exports.setAppPath = setAppPath
exports.getAppFileName = getAppFileName
exports.getAppFileURL = getAppFileURL
exports.getServerBaseURL = getServerBaseURL
exports.runApp = runApp
exports.reloadApp = reloadApp
exports.evalJS = evalJS
exports.setMessageCallbackFun = setMessageCallbackFun
exports.setClientConnenctedCallbackFun = setClientConnenctedCallbackFun
exports.setReloadCallbackFun = setReloadCallbackFun
exports.setTraverseNumDirectoryLevels = setTraverseNumDirectoryLevels
exports.getNumberOfMonitoredFiles = getNumberOfMonitoredFiles
exports.fileSystemMonitor = fileSystemMonitor
