/*
File: hyper-server.js
Description: HyperReload file server.
Author: Mikael Kindborg

License:

Copyright (c) 2015 Evothings AB

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

/*********************************/
/***     Imported modules      ***/
/*********************************/

var OS = require('os')
var FS = require('fs')
var PATH = require('path')
var SOCKETIO_CLIENT = require('socket.io-client')
var FILEUTIL = require('./fileutil.js')
var LOADER = require('./fileloader.js')
var LOGGER = require('./log.js')
var SETTINGS = require('../settings/settings.js')
var UUID = require('./uuid.js')

/*********************************/
/***     Module variables      ***/
/*********************************/

// Workbench version code should be incremented on each new release.
// The version code can be used by the server to display info.
var mWorkbenchVersionCode = 2

// Version of the server message protocol implemented on top of socket.io.
// Increment when the protocol has changed.
var mProtocolVersion = 1

var mIsConnected = false
var mSessionID = null
var mRemoteServerURL = ''
var mSocket = null
var mAppPath = null
var mAppFile = null
var mAppID = null
var mMessageCallback = null
var mClientConnectedCallback = null
var mReloadCallback = null
var mStatusCallback = null
var mRequestKeyCallback = null
var mCheckIfModifiedSince = false

// The current base directory. Must NOT end with a slash.
var mBasePath = ''

/*********************************/
/***     Server functions      ***/
/*********************************/

/**
 * External.
 */
function connectToRemoteServer()
{
	LOGGER.log('Connecting to remote server')

	// Message handler table.
	var messageHandlers =
	{
		// Messages from the server to the Workbench.
		'workbench.set-session-id': onMessageWorkbenchSetSessionID,
        'workbench.set-connect-key': onMessageWorkbenchSetConnectKey,
		'workbench.client-connected': onMessageWorkbenchClientConnected,
		'workbench.get-resource': onMessageWorkbenchGetResource,
		'workbench.log': onMessageWorkbenchLog,
		'workbench.javascript-result': onMessageWorkbenchJavaScriptResult,
		'workbench.user-message': onMessageWorkbenchUserMessage
	}

	// Create socket.io instance.
	var socket = SOCKETIO_CLIENT(
		mRemoteServerURL,
		{ 'force new connection': true })

	// Save global reference to socket.io object.
	mSocket = socket

	// Connect function.
	socket.on('connect', function()
	{
		LOGGER.log('Connected to server')

		mIsConnected = true

		//requestConnectKey()
        sendMessageToServer(mSocket, 'workbench.connected', { sessionID: mSessionID })
	})

	socket.on('disconnect', function()
	{
		mIsConnected = false

		mStatusCallback && mStatusCallback({
			event: 'disconnected' })
	})

	socket.on('hyper-workbench-message', function(message)
	{
        //LOGGER.log('hyper workbench message received')
        //console.dir(message)
        var handler = messageHandlers[message.name]
        if (handler)
        {
        	handler(socket, message)
        }
	})
}

function sendMessageToServer(socket, name, data)
{
	socket.emit('hyper-workbench-message', {
		protocolVersion: mProtocolVersion,
		workbenchVersionCode: mWorkbenchVersionCode,
		name: name,
		data: data })
}

function onMessageWorkbenchSetSessionID(socket, message)
{
	//LOGGER.log('onMessageWorkbenchSetSessionID: ' + message.data.sessionID)

	// Set/display session id if we got it.
	if (message.data.sessionID)
	{
		// Save the session id.
		mSessionID = message.data.sessionID

		// Save sessionID in global reference.
		global.mainHyper.sessionID = mSessionID

		// Pass the connect key to the callback function,
		// this displays the key in the UI.
        message.data.event = "connected"
		mStatusCallback && mStatusCallback(message.data)
	}

	// Display message if we gone one.
	if (message.userMessage)
	{
		// Pass the message to the callback function,
		// this displays the message in the UI.
		mStatusCallback && mStatusCallback({
			event: 'user-message',
			userMessage: message.userMessage })
	}
}

function onMessageWorkbenchSetConnectKey(socket, message)
{
    LOGGER.log('- onMessageWorkbenchSetConnectKey: ' + message.data.connectKey)
    //console.dir(message)
    mRequestKeyCallback && mRequestKeyCallback(message)
}

function onMessageWorkbenchClientConnected(socket, message)
{
	// Notify UI that a client has connected.
	mClientConnectedCallback && mClientConnectedCallback()
}

function onMessageWorkbenchGetResource(socket, message)
{
	//LOGGER.log('onMessageWorkbenchGetResource: ' + data.path)

	var ifModifiedSince =
		mCheckIfModifiedSince
			? message.data.ifModifiedSince
			: null

	var response = serveResource(
		message.data.platform,
		message.data.path,
		ifModifiedSince)

	sendMessageToServer(socket, 'workbench.resource-response',
		{
			id: message.data.id,
			sessionID: mSessionID,
			appID: mAppID,
			response: response
		})
}

function onMessageWorkbenchLog(socket, message)
{
	// Pass message to Tools window.
	mMessageCallback && mMessageCallback(
		{ message: 'hyper.log', logMessage: message.data })
}

function onMessageWorkbenchJavaScriptResult(socket, message)
{
	var data = message.data

	// Functions cause a cloning error, as a fix just use the type.
	if (typeof data == 'function')
	{
		data = typeof data
	}

	// Pass message to Tools window.
	mMessageCallback && mMessageCallback(
		{ message: 'hyper.result', result: data })
}

function onMessageWorkbenchUserMessage(socket, message)
{
	// Display message if we gone one.
	if (message.userMessage)
	{
		// Pass the message to the callback function,
		// this displays the message in the UI.
		mStatusCallback && mStatusCallback({
			event: 'user-message',
			userMessage: message.userMessage })
	}
}

/**
 * External.
 */
function isConnected()
{
	return mIsConnected
}

/**
 * External.
 */
function requestConnectKey()
{
	// On first call mSessionID will be null, if server goes down
	// and we connect again we will pass our session id so the server
	// can restore our session.
    LOGGER.log('requesting connect key from server')
	sendMessageToServer(mSocket, 'workbench.request-connect-key', { sessionID: mSessionID })
}

/**
 * External.
 */
function disconnectFromRemoteServer()
{
	LOGGER.log('Disconnecting from remote server')

	if (mSocket)
	{
		mSocket.close()
	}
}

/**
 * Internal.
 */
function serveUsingResponse200()
{
	mCheckIfModifiedSince = false
}

/**
 * Internal.
 */
function serveUsingResponse304()
{
	mCheckIfModifiedSince = true
}

/**
 * Internal.
 */
function serveResource(platform, path, ifModifiedSince)
{
	//LOGGER.log('serveResource: ' + path)

	if (!path || path == '/')
	{
		// Serve the Connect page.
		return serveRootRequest()
	}
	else if (path == '/hyper.reloader')
	{
		return serveReloaderScript(ifModifiedSince)
	}
	else if (SETTINGS.getServeCordovaJsFiles() &&
		(path == '/cordova.js' ||
		path == '/cordova_plugins.js' ||
		path.indexOf('/plugins/') == 0))
	{
		return serveCordovaFile(platform, path, ifModifiedSince)
	}
	else if (mBasePath && FILEUTIL.fileIsHTML(path))
	{
		return serveHtmlFileWithScriptInjection(
			mBasePath + path.substr(1),
			ifModifiedSince)
	}
	else if (mBasePath)
	{
		return LOADER.response(
			mBasePath + path.substr(1),
			ifModifiedSince)
	}
	else
	{
		return serveRootRequest()
	}
}

/**
 * Internal.
 *
 * Serve root file.
 */
function serveRootRequest()
{
	// Set the app path so that the server/ui directory can be accessed.
	setAppPath(process.cwd() + '/hyper/server/hyper-connect.html')

	// Always serve the connect page for the root url.
	return serveHtmlFile('./hyper/server/hyper-connect.html', null)
}

/**
 * Internal.
 *
 * Serve reloader script.
 */
function serveReloaderScript(ifModifiedSince)
{
	//LOGGER.log('serveReloaderScript')
	var path = './hyper/server/hyper-reloader.js'
	var script = FILEUTIL.readFileSync(path)
	var stat = FILEUTIL.statSync(path)
	if (script && stat)
	{
		script = script.replace(
			'__SESSIONID_INSERTED_BY_SERVER__',
			mSessionID)
		return LOADER.createResponse(
			script,
			stat.mtime,
			'application/javascript',
			ifModifiedSince)
	}
	else
	{
		return LOADER.createResponse404(path)
	}
}

/**
 * Internal.
 *
 * Serve HTML file. Will insert reloader script.
 */
function serveHtmlFileWithScriptInjection(filePath, ifModifiedSince)
{
	return serveHtmlFile(filePath, ifModifiedSince)
}

/**
 * Internal.
 *
 * If file exists, serve it and return true, otherwise return false.
 * Insert the reloader script if file exists.
 */
function serveHtmlFile(path, ifModifiedSince)
{
	//LOGGER.log('serveHtmlFile: ' + path)
	var html = FILEUTIL.readFileSync(path)
	var stat = FILEUTIL.statSync(path)
	if (html && stat)
	{
		var data = insertReloaderScript(html)
		return LOADER.createResponse(
			data,
			stat.mtime,
			'text/html',
			ifModifiedSince)
	}
	else
	{
		return LOADER.createResponse404(path)
	}
}

/**
 * Internal.
 *
 * Returns null if file is not found.
 */
function serveFileOrNull(path)
{
	var response = LOADER.response(path)
	if (200 == response.resultCode)
	{
		return response
	}
	else
	{
		return null
	}
}

/**
 * Internal.
 *
 * Serve Cordova JavaScript file for the platform making the request.
 */
function serveCordovaFile(platform, path)
{
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
	//
	// Set path to Cordova files in current project.
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

	// Method 2:
	// Paths to Cordova files in the HyperReload library.
	// This is used if the application is not a Cordova project.
	var androidCordovaLibPath = './hyper/libs-cordova/android' + path
	var iosCordovaLibPath = './hyper/libs-cordova/ios' + path
	var wpCordovaLibPath = './hyper/libs-cordova/wp' + path

	// Get the file, first try the path for a Cordova project, next
	// get the file from the HyperReload Cordova library folder.
	var cordovaJsFile = null
	if ('android' == platform)
	{
		cordovaJsFile =
			serveFileOrNull(androidCordovaAppPath) ||
			serveFileOrNull(androidCordovaLibPath)
	}
	else if ('ios' == platform)
	{
		cordovaJsFile =
			serveFileOrNull(iosCordovaAppPath) ||
			serveFileOrNull(iosCordovaLibPath)
	}
	else if ('wp' == platform)
	{
		cordovaJsFile =
			serveFileOrNull(wpCordovaAppPath) ||
			serveFileOrNull(wpCordovaLibPath)
	}

	return cordovaJsFile || LOADER.createResponse404(path)
}

/**
 * Internal.
 *
 * Return script tags for reload functionality.
 */
function createReloaderScriptTags()
{
	return ''
		+ '<script src="/socket.io/socket.io.js"></script>'
		+ '<script src="/hyper/' + mSessionID + '/systemcache/hyper.reloader"></script>'
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
function insertReloaderScript(html)
{
	// Create HTML tags for the reloader script.
	var script = createReloaderScriptTags()

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
function setAppPath(appPath)
{
	if (appPath != mAppPath)
	{
		mAppPath = appPath.replace(new RegExp('\\' + PATH.sep, 'g'), '/')
		var pos = mAppPath.lastIndexOf('/') + 1
		mBasePath = mAppPath.substr(0, pos)
		mAppFile = mAppPath.substr(pos)
	}
}

/**
 * External.
 *
 * Return the name of the main HTML file of the application.
 */
function getAppFileName()
{
	return mAppFile
}

/**
 * External.
 */
function getAppPath()
{
	return mAppPath
}

/**
 * External.
 */
function getBasePath()
{
	return mBasePath
}

/**
 * External.
 */
function getAppServerURL()
{
	return mRemoteServerURL + '/hyper/' + mSessionID + '/' + mAppID + '/' + mAppFile
}

/**
 * External.
 */
function getUserKey()
{
	return mUserKey
}

/**
 * External.
 *
 * Reloads the main HTML file of the current app.
 */
function runApp()
{
	//serveUsingResponse200()
	serveUsingResponse304()
	mAppID = getAppID()
	sendMessageToServer(mSocket, 'workbench.run',
		{
			sessionID: mSessionID,
			appID: mAppID,
			url: getAppServerURL()
		})
}

/**
 * External.
 *
 * Reloads the currently visible page of the browser.
 */
function reloadApp()
{
	serveUsingResponse304()
	sendMessageToServer(mSocket, 'workbench.reload',
		{
			sessionID: mSessionID,
			appID: mAppID
		})
	mReloadCallback && mReloadCallback()
}

/**
 * Internal.
 *
 * Get the app ID.
 *
 * This is used by the server to identify apps.
 *
 * File evothings.json contains app settings. It can be used
 * for other settings as well in the future.
 */
function getAppID()
{
	var path = mBasePath + '/' + 'evothings.json'
	if (FS.existsSync(path))
	{
		var json = FILEUTIL.readFileSync(path)
		var settings = JSON.parse(json)
	}
	else
	{
		var settings = { 'app-uuid': UUID.generateUUID() }
		var json = JSON.stringify(settings)
		FS.writeFileSync(path, json, {encoding: 'utf8'})
	}
	return settings['app-uuid']
}

/**
 * External.
 */
function evalJS(code)
{
	sendMessageToServer(mSocket, 'workbench.eval',
		{
			sessionID: mSessionID,
			code: code
		})
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
 *
 * Callback form: fun()
 */
function setReloadCallbackFun(fun)
{
	mReloadCallback = fun
}

/**
 * External.
 *
 * Callback form: fun(message)
 */
function setStatusCallbackFun(fun)
{
	mStatusCallback = fun
}

/**
 * External.
 *
 * Callback form: fun(message)
 */
function setRequestKeyCallbackFun(fun)
{
    mRequestKeyCallback = fun
}

/**
 * External.
 */
/*
function setUserKey(key)
{
	mUserKey = key
}
*/

/**
 * External.
 */
function setRemoteServerURL(url)
{
	mRemoteServerURL = url
}

/*********************************/
/***	  Module exports	   ***/
/*********************************/

exports.isConnected = isConnected
exports.requestConnectKey = requestConnectKey
exports.setAppPath = setAppPath
exports.getAppPath = getAppPath
exports.getBasePath = getBasePath
exports.getAppFileName = getAppFileName
exports.getAppServerURL = getAppServerURL
exports.runApp = runApp
exports.reloadApp = reloadApp
exports.evalJS = evalJS
exports.setMessageCallbackFun = setMessageCallbackFun
exports.setClientConnenctedCallbackFun = setClientConnenctedCallbackFun
exports.setStatusCallbackFun = setStatusCallbackFun
exports.setRequestKeyCallbackFun =setRequestKeyCallbackFun
exports.setReloadCallbackFun = setReloadCallbackFun
exports.serveResource = serveResource
exports.connectToRemoteServer = connectToRemoteServer
exports.disconnectFromRemoteServer = disconnectFromRemoteServer
//exports.setUserKey = setUserKey
exports.getUserKey = getUserKey
exports.setRemoteServerURL = setRemoteServerURL
