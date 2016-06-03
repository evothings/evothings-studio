/*
File: user-handler.js
Description: Handles login/logout of users.

License:

Copyright (c) 2013-2015 Evothings AB

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
/***	 Imported modules	  ***/
/*********************************/

var OS = require('os')
var FS = require('fs')
var PATH = require('path')
var IO = require('socket.io-client')
var LOGGER = require('./log.js')
var SETTINGS = require('../settings/settings.js')
var SERVER = require('./file-server.js')
var EVENTS = require('./system-events.js')

/*********************************/
/***	 Module variables	  ***/
/*********************************/

var mLoginClient = null
var mUser = null

/*********************************/
/***		Functions		  ***/
/*********************************/

exports.createLoginClient = function()
{

}

exports.setUser = function(uobj)
{
	LOGGER.log('[user-handler.js] LOGIN: setting user to "'+uobj.name+'"')
	LOGGER.log('[user-handler.js] LOGIN: Listing user object:')
	LOGGER.log(uobj)
	mUser = uobj
}

exports.isEnterprise = function()
{
	return mUser && mUser.limits.enterprise == true
}

exports.clearUser = function()
{
	LOGGER.log('[user-handler.js] LOGIN:clearing user')
	mUser = undefined
}

exports.startLoginSequence = function()
{
	var sessionID = SERVER.getSessionID()
	LOGGER.log('[user-handler.js] LOGIN: starting Login Sequence. Registering authentication callback with proxy. sessionID = '+sessionID)
	SERVER.sendMessageToServer(undefined, 'workbench.registerauthcallback', { sessionID: sessionID })
}

exports.getLoginURL = function()
{
	var sessionID = SERVER.getSessionID()

	var serverAddress = getLoginServerAddress()
	var loginURL = serverAddress+'/?uuid='+sessionID+'&loginonly=true'

	LOGGER.log('[user-handler.js] LOGIN: loginURL = '+loginURL)

	return loginURL
}

exports.getLogoutURL = function()
{
	var sessionID = SERVER.getSessionID()

	var serverAddress = getLoginServerAddress()
	var logoutURL = serverAddress+'/?uuid='+sessionID+'&loginonly=true&logout=true'
	var checked = SETTINGS.getRememberMe()
	LOGGER.log('[user-handler.js] checked remember me = '+checked)
	if(!checked)
	{
		logoutURL += '&federated'
	}

	LOGGER.log('[user-handler.js] LOGOUT: logoutURL = '+logoutURL)

	return logoutURL
}

exports.getUser = function()
{
	return mUser
}

exports.clearUser = function()
{
	mUser = undefined
}

function getLoginServerAddress()
{
	var serverAddress = SETTINGS.getReloadServerAddress()
	serverAddress = serverAddress + ':3003'
	return serverAddress
}

EVENTS.subscribe(EVENTS.LOGIN, exports.setUser)
EVENTS.subscribe(EVENTS.LOGOUT, exports.clearUser)
