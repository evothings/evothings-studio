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
/***     Imported modules      ***/
/*********************************/

var OS = require('os')
var FS = require('fs')
var PATH = require('path')
var IO = require('socket.io-client')
var LOGGER = require('./log.js')
var SETTINGS = require('../settings/settings.js')
var SERVER = require('./hyper-server.js')
var EVENTS = require('./events')

var EVO_SERVER = SETTINGS.getReloadServerAddress()
if(EVO_SERVER.indexOf('http://') > -1)
{
    EVO_SERVER = EVO_SERVER.replace('http://', '')
}
if(EVO_SERVER.indexOf(':') > -1)
{
    EVO_SERVER = EVO_SERVER.substring(0, EVO_SERVER.indexOf(':'))
}
console.log('EVO_SERVER = '+EVO_SERVER)

/*********************************/
/***     Module variables      ***/
/*********************************/

var mLoginServer = null
var mUser = null
var mLoginWindow = null
var mUserLoginCallback = null
var mUserLogoutCallback = null

/*********************************/
/***        Functions          ***/
/*********************************/

/**
 * Internal.
 */
function loginUser()
{
	// Create connection to login sever (SAAS server).
	if (!mLoginServer)
	{
		LOGGER.log('LOGIN: connecting to login server '+EVO_SERVER);
        var wss_string = (EVO_SERVER == 'localhost' || EVO_SERVER.indexOf('192.168') > -1) ? 'ws://'+EVO_SERVER : 'wss://'+EVO_SERVER
		mLoginServer = IO(wss_string)
		mLoginServer.on('message', function(msg)
		{
			LOGGER.log('LOGIN: got auth callback message:');
			LOGGER.log(msg);

			if (msg.user)
			{
				// User is now logged in.
				mUser = msg.user
                mUser.EVO_SERVER = (EVO_SERVER == 'localhost' || EVO_SERVER.indexOf('192.168') > -1) ? 'http://' + EVO_SERVER : 'https://'+EVO_SERVER
				LOGGER.log('LOGIN: setting user to "'+msg.user.name+'"')
				mLoginWindow.close()
				mLoginWindow = null
				LOGGER.log('LOGIN: Listing user object:')
				LOGGER.log(msg.user)

				// Notify logged in callback.
				mUserLoginCallback && mUserLoginCallback(mUser)
			}
		})
	}

    var uid = SERVER.getSessionId()
    console.log('sessionID = '+uid)
    mLoginServer.emit('message', JSON.stringify({target:'registerAuthCallback', uuid: uid }))

	var sessionId = global.mainHyper.sessionID

    LOGGER.log('LOGIN: starting login sequence.')
    var login_string = (EVO_SERVER == 'localhost' || EVO_SERVER.indexOf('192.168') > -1) ? 'http://'+EVO_SERVER+'?uuid='+sessionId+'&loginonly=true' : 'https://'+EVO_SERVER+'?uuid='+sessionId+'&loginonly=true'
    // Create login window if it does not exist.
    if (!mLoginWindow || mLoginWindow.closed)
    {
        LOGGER.log('LOGIN: creating login window')
        mLoginWindow = window.open(
            login_string,
            'Login',
            {
                resizable: true
            })
        mLoginWindow.resizeTo(550, 700)
        mLoginWindow.moveTo(50, 50)
        mLoginWindow.focus()
    }
	LOGGER.log('LOGIN: sending registerAuthCallback to saas server for uuid '+sessionId)
}

/**
 * Internal.
 */
function logoutUser()
{
	LOGGER.log('LOGIN: loggin out user. Setting mUser to null')
	mUser = null
	// TODO: Logout user from the server?
	// Notify logged out callback.
    EVENTS.publish(EVENTS.LOGOUT, {event: 'logout'})
	mUserLogoutCallback && mUserLogoutCallback()
}

// ************** Login Button **********************

/**
 * External.
 */
function loginButtonHandler()
{
	LOGGER.log('LOGIN: Clicked Login button')
	if (mUser)
	{
		// If there is a user object we logout the user.
		LOGGER.log('LOGIN: Logout user')
		logoutUser()
	}
	else
	{
		// If there is no user object we login a new user.
		LOGGER.log('LOGIN: Login user')
		loginUser()
	}
}

/**
 * External.
 */
function setUserLoginCallback(fun)
{
	mUserLoginCallback = fun
}

/*********************************/
/***	  Module exports	   ***/
/*********************************/

exports.loginButtonHandler = loginButtonHandler
exports.logoutUser = logoutUser
exports.setUserLoginCallback = setUserLoginCallback
exports.getUser = function()
{
    return mUser
}

EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
{
    logoutUser()
})
