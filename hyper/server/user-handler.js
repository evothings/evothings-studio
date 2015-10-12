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

/*********************************/
/***     Module variables      ***/
/*********************************/

var mLoginClient = null
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
	createLoginClient()
	openLoginWindow()
}

function createLoginClient()
{
	// Create connection to login sever (SAAS server).
	if (!mLoginClient)
	{
		var serverAddress = getLoginServerAddress()
		LOGGER.log('LOGIN: connecting to login server '+serverAddress);

		// Create login client.
        var serverURL = serverAddress.replace('https', 'wss')
		mLoginClient = IO(serverURL)

		mLoginClient.on('message', function(msg)
		{
			LOGGER.log('LOGIN: got auth callback message:');
			LOGGER.log(msg);

			if (msg.user)
			{
				// User is now logged in.
				mUser = msg.user
				LOGGER.log('LOGIN: setting user to "'+msg.user.name+'"')
				LOGGER.log('LOGIN: Listing user object:')
				LOGGER.log(msg.user)

				mLoginWindow.close()
				mLoginWindow = null

				// Notify logged in callback.
				mUserLoginCallback && mUserLoginCallback(mUser)
			}
		})
	}
}

function openLoginWindow()
{
    var sessionID = SERVER.getSessionID()
    console.log('sessionID = '+sessionID)
    mLoginClient.emit(
    	'message',
    	JSON.stringify({target:'registerAuthCallback', uuid: sessionID }))

    LOGGER.log('LOGIN: starting login sequence.')
    var serverAddress = getLoginServerAddress()
    var loginURL = serverAddress+'/?uuid='+sessionID+'&loginonly=true'
    console.log('loginURL = '+loginURL)

    // Create login window if it does not exist.
    if (!mLoginWindow || mLoginWindow.closed)
    {
        LOGGER.log('LOGIN: creating login window')
        mLoginWindow = window.open(
            loginURL,
            'Login',
            {
                resizable: true
            })
        mLoginWindow.resizeTo(550, 700)
        mLoginWindow.moveTo(50, 50)
        mLoginWindow.focus()
    }

	LOGGER.log('LOGIN: sending registerAuthCallback to saas server for uuid '+sessionID)
}

exports.logoutUser = function()
{
	LOGGER.log('LOGIN: loggin out user. Setting mUser to null')
	mUser = null
	// TODO: Logout user from the server?
	// Notify logged out callback.
    EVENTS.publish(EVENTS.LOGOUT, {event: 'logout'})
	mUserLogoutCallback && mUserLogoutCallback()
}

/**
 * Internal.
 */
function getLoginServerAddress()
{
	var serverAddress = SETTINGS.getReloadServerAddress()
	var serverAddress = serverAddress + ':3003'
	return serverAddress
}

// ************** Login Button **********************

/**
 * External.
 */
exports.loginButtonHandler = function()
{
	LOGGER.log('LOGIN: Clicked Login button')
	if (mUser)
	{
		// If there is a user object we logout the user.
		LOGGER.log('LOGIN: Logout user')
		exports.logoutUser()
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
exports.setUserLoginCallback = function(fun)
{
	mUserLoginCallback = fun
}

/**
 * External.
 */
exports.getUser = function()
{
    return mUser
}

EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
{
    exports.logoutUser()
})
