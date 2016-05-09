/*
File: main-window-events.js
Description: HyperReload UI events.
Author: Mikael Kindborg

License:

Copyright (c) 2013-2014 Mikael Kindborg

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

/*** Imported modules ***/

var SETTINGS = require('../settings/settings.js')
var LOGGER = require('../server/log.js')
var MAIN = require('electron').remote.getGlobal('main');
var EVENTS = require('../server/system-events.js')
// Awful, but I am not sure how to get hold of the BrowserWindow.id otherwise
EVENTS.myID = MAIN.workbenchWindow.id
var USER_HANDLER = require('../server/user-handler.js')
var SERVER = require('../server/file-server.js')
const CLIPBOARD = require('electron').clipboard;

/**
 * Setup UI events and button actions.
 */
exports.defineUIEvents = function(hyper)
{
	var DISCONNECT_DELAY = 30000
	var mDisconnectTimer = 0

	// ************** Connect Key Button **************

	hyper.UI.$('#button-get-connect-key').click(function()
	{
		hyper.UI.getConnectKeyFromServer()
	})

	// ************** Getting Started Screen Button **************

	hyper.UI.$('.button-getting-started').click(function()
	{
		hyper.UI.showTab('getting-started')
	})

	// ************** Open Settings Button **************

	hyper.UI.$('#button-open-settings-dialog').click(function()
	{
		hyper.UI.openSettingsDialog()
	})

	// ************** Settings Dialog Save Button **************

	hyper.UI.$('#button-save-settings').click(function()
	{
		hyper.UI.saveSettings()
	})

	// ************** Disconnect all Viewers **************

	hyper.UI.$('#button-disconnect-all-viewers').click(function()
	{
		hyper.UI.disconnectAllViewers()
	})

	// ************** Links to App Stores **************

	hyper.UI.$('.button-evothings-viewer-on-google-play').click(function()
	{
		hyper.UI.openInBrowser(
			'https://play.google.com/store/apps/details?id=' +
			'com.evothings.evothingsviewer&hl=en')
	})

	hyper.UI.$('.button-evothings-viewer-on-itunes').click(function()
	{
		hyper.UI.openInBrowser(
			'https://itunes.apple.com/nz/app/evothings-viewer/id1029452707?mt=8')
	})

	// ************** Connect Screen Button **************

	hyper.UI.$('#button-connect, .button-open-connect-screen').click(function()
	{
		hyper.UI.showTab('connect')
	})

	// ************** Connect Screen Toggle Help Button **************

	hyper.UI.$('#button-toogle-help').click(function()
	{
		hyper.UI.toogleStartScreenHelp()
	})

	// ************** Feedback Button **************

	hyper.UI.$('#button-feedback').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/feedback/')
	})

	// ************** Chat Button **************

	hyper.UI.$('#button-chat').click(function()
	{
		hyper.UI.openInBrowser('https://gitter.im/evothings/evothings')
	})

	// ************** Forum Button **************

	hyper.UI.$('#button-forum').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/forum/')
	})

	// ************** News Button **************

	hyper.UI.$('#button-news').click(function()
	{
		hyper.UI.openInBrowser('https://evothings.com/news/')
	})

	// ************** Share in Social Media Button **************

	hyper.UI.$('#button-share-social').click(function()
	{
		// hyper.UI.openInBrowser('https://evothings.com/share-social/')
		hyper.UI.$('#dialog-share-social').modal('show')
	})

	hyper.UI.$('#button-share-facebook').click(function()
	{
		hyper.UI.openInBrowser("http://www.facebook.com/sharer.php?u=https%3A%2F%2Fevothings.com")
	})

	hyper.UI.$('#button-share-google').click(function()
	{
		hyper.UI.openInBrowser("https://plus.google.com/share?url=https%3A%2F%2Fevothings.com")
	})

	hyper.UI.$('#button-share-linkedin').click(function()
	{
		hyper.UI.openInBrowser("https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fevothings.com&title=Evothings")
	})

	hyper.UI.$('#button-share-digg').click(function()
	{
		hyper.UI.openInBrowser("http://www.digg.com/submit?url=https%3A%2F%2Fevothings.com")
	})

	hyper.UI.$('#button-share-twitter-1').click(function()
	{
		openTwitter('#share-social-1')
	})

	hyper.UI.$('#button-share-twitter-2').click(function()
	{
		openTwitter('#share-social-2')
	})

	hyper.UI.$('#button-share-twitter-3').click(function()
	{
		openTwitter('#share-social-3')
	})

	hyper.UI.$('#button-share-twitter-4').click(function()
	{
		openTwitter('#share-social-4')
	})

	// Not used anymore
	hyper.UI.$('#button-copy-share-social-1').click(function()
	{
		copyElementTextToClipboard('#share-social-1')
	})

	function openTwitter(elementID)
	{
		var url = 'https://twitter.com/share?url=https%3A%2F%2Fevothings.com&text='
			+ hyper.UI.$(elementID).text().replace(/#/g, '%23')
		hyper.UI.openInBrowser(url)
	}

	function copyElementTextToClipboard(elementID)
	{
		copyToClipboard(hyper.UI.$(elementID).text())
	}

	function copyToClipboard(text)
	{
		CLIPBOARD.writeText(text, 'text')
	}

	// ************** Test-system-message Button **************

	hyper.UI.$('#button-test-system-message').click(function()
	{
		hyper.UI.testSystemMessage()
	})

	// ************** Getting Started Tab Button **************

	hyper.UI.$('#button-getting-started').click(function()
	{
		hyper.UI.showTab('getting-started')
	})

	// ************** Examples Tab Button **************

	hyper.UI.$('#button-examples').click(function()
	{
		hyper.UI.showTab('examples')
	})

	// ************** My Apps Tab Button **************

	hyper.UI.$('#button-projects').click(function()
	{
		hyper.UI.showTab('projects')
	})

	// ************** New App Button **************

	hyper.UI.$('#button-new-app').click(function()
	{
		hyper.UI.openNewAppDialog()
	})
	
	// ************** New App Dialog Change Button **************

	hyper.UI.$('#button-change-new-app').click(function()
	{
		hyper.UI.changeNewApp()
	})

	// ************** New App Dialog Save Button **************

	hyper.UI.$('#button-save-new-app').click(function()
	{
		hyper.UI.saveNewApp()
	})

	// ************** Copy App Dialog Save Button **************

	hyper.UI.$('#button-save-copy-app').click(function()
	{
		hyper.UI.saveCopyApp()
	})
	
	// ************** Copy App Dialog Change Button **************

	hyper.UI.$('#button-change-copy-app').click(function()
	{
		hyper.UI.changeCopyApp()
	})

	// ************** Console Button **************

	hyper.UI.$('#button-tools').click(function()
	{
		hyper.UI.openConsoleWindow()
	})

	// ************** Viewers Button **************

	hyper.UI.$('#button-viewers').click(function()
	{
		hyper.UI.openViewersWindow()
	})

	// ************** Login Button **************

	// Set login button action handler. The button toggles login/logout.
	hyper.UI.$('#button-login').click(function()
	{
		console.log('personalize clicked')
		var user = USER_HANDLER.getUser()
		if (user && !user.picture)
		{
			loginUser()
		}
	})

	// ************** Login Close Button **************

	hyper.UI.$('#connect-screen-login-close-button').click(function()
	{
		hideLoginScreen()
	})

	// ************** Remember me checkbox **************

	/*
	hyper.UI.$('#remember-checkbox').change(function(e)
	{
		var remember = e.target.checked;
		LOGGER.log('[main-window-events.js] remmember me changed value to '+remember);
		SETTINGS.setRememberMe(remember)
	})
	*/

	hyper.UI.$('#tokenbutton').click(function()
	{
		console.log('--------------- token button clicked-------------')

		var token = hyper.UI.$('#tokeninput')[0].value
		//console.dir(hyper.UI.$('#tokeninput')[0])
		//console.dir(token)
		console.log('token is '+token)
		SETTINGS.setEvoCloudToken(token)
		//hyper.UI.$('#tokentext')[0].innerHTML = ""
		hyper.UI.showToken(token)
		SERVER.sendConnectMessage()
	});
	hyper.UI.$('#tclose').click(function()
	{
		//hyper.UI.$('#tokentext')[0].innerHTML = ""
		hyper.UI.$('#tdialog')[0].close()
	});
	hyper.UI.$('#resetbutton').click(function()
	{
		hyper.UI.$('#rdialog')[0].showModal()
	})
	hyper.UI.$('#rcancel').click(function()
	{
		hyper.UI.$('#rdialog')[0].close()
	})
	hyper.UI.$('#rreset').click(function()
	{
		console.log('factory reset clicked')
		hyper.UI.$('#rdialog')[0].close()
		SERVER.sendResetMessage()
		SETTINGS.setEvoCloudToken('')
		SETTINGS.setSessionID('')
		hyper.UI.hideToken()
		hideLoginButton()
	})

	// ************** Login Events **************

	EVENTS.subscribe(EVENTS.CONNECT, function(obj)
	{
		enableLoginButton()
	})

	EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
	{
		displayLoginButton()
		disableLoginButton()
	})

	EVENTS.subscribe(EVENTS.LOGIN, function(user)
	{
		LOGGER.log('[main-window-events.js] *** User has logged in: ' + user)
		console.dir(user)

		hideLoginScreen()
		showUserInfo(user)
		if(user.picture)
		{
			hideLoginButton()
		}
		else
		{
			showLoginButton()
		}
	})

	EVENTS.subscribe(EVENTS.LOGOUT, function()
	{
		// TODO: Pass user id to the Run/Reload messaging code (file-server.js).
		LOGGER.log('[main-window-events.js] *** User has logged out ***')

		displayLoginButton()
	})

	// ************** Connect Events **************

	EVENTS.subscribe(EVENTS.CONNECT, function(obj)
	{
		LOGGER.log('[main-window-events.js] socket.io connect')
		if(mDisconnectTimer)
		{
			clearTimeout(mDisconnectTimer)
			mDisconnectTimer = undefined
		}
	})

	EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
	{
		LOGGER.log('[main-window-events.js] socket.io disconnect')
		mDisconnectTimer = setTimeout(function()
		{
			logoutUser()
		}, DISCONNECT_DELAY)
	})

	function loginUser()
	{
		USER_HANDLER.createLoginClient()

		USER_HANDLER.startLoginSequence()
		var loginURL = USER_HANDLER.getLoginURL()
		LOGGER.log('[main-window-events.js] loginURL : ' + loginURL)
		showLoginScreen(loginURL)
	}

	function logoutUser()
	{
		if (USER_HANDLER.getUser())
		{
			// Open logout url in hidden logout iframe.
			var logoutURL = USER_HANDLER.getLogoutURL()
			hyper.UI.$('#connect-screen-logout-iframe').attr('src', logoutURL)

			// TODO: Find better solution for managing double logouts, when server can't find us and reply back
			setTimeout(function()
			{
				if (USER_HANDLER.getUser())
				{
					USER_HANDLER.clearUser()
					EVENTS.publish(EVENTS.LOGOUT, {event: 'logout'})
				}
			}, 1000)
		}
	}

	function disableLoginButton()
	{
		hyper.UI.$('#button-login').attr('disabled','disabled')
	}

	function enableLoginButton()
	{
		hyper.UI.$('#button-login').removeAttr('disabled')
	}

	function hideLoginButton()
	{
		hyper.UI.$('#button-login').hide()
	}

	function showLoginButton()
	{
		hyper.UI.$('#button-login').show()
	}

	function displayLoginButton()
	{
		hyper.UI.$('#button-login').html('Personalize')
		hyper.UI.$('#login-info').html('Not Logged In')
		hyper.UI.$('#connect-screen-login').hide()
	}

	function showLoginScreen(loginURL)
	{
		hyper.UI.$('#connect-screen-login').show()
		//hyper.UI.$('#connect-screen-login-loading-message').show()
		//hyper.UI.$('#connect-screen-login-iframe').attr('src', loginURL)
		hyper.UI.openInBrowser(loginURL)
	}

	function hideLoginScreen()
	{
		hyper.UI.$('#connect-screen-login').hide()
	}

	function showUserInfo(user)
	{
		if (user && user.name)
		{
			// Display user data.
			var picture = user.picture
			if(picture)
			{
				if (picture.indexOf('http') == -1)
				{
					picture = user.EVO_SERVER + '/' + user.picture
				}
			}
			else
			{
				picture = 'images/kitty.png'
			}
			// Show user picture on login button and change text to "Logout".
			var imageHTML =
				'<img style="height:30px;with:auto;margin-right:5px;margin-top:-3px" '
				+	'class="pull-left" '
				+	'src="' + picture + '">'
			var infoText = ' '+user.name
			var infoHTML = imageHTML + infoText
			hyper.UI.$('#login-info').html(infoHTML)

			// Change login button text to logout.
			//hyper.UI.$('#button-login').html('Logout')
		}
		else
		{
			hyper.UI.$('#login-info').html('Could not log in')
		}
	}

	// ************** Tab Button Handling **************

	hyper.UI.showTab = function(tabname)
	{
		// Hide all screens and set unselected colour for buttons.
		hyper.UI.$('#screen-getting-started').hide()
		hyper.UI.$('#screen-connect').hide()
		hyper.UI.$('#screen-examples').hide()
		hyper.UI.$('#screen-projects').hide()
/*
		hyper.UI.$('#button-connect, #button-getting-started, #button-examples, #button-projects')
			.removeClass('et-btn-et-btn-white-only')
			.addClass('et-btn-stone')
*/
		// Show selected tab.
		var screenId = '#screen-' + tabname
		var buttonId = '#button-' + tabname
		hyper.UI.$(screenId).show()
		hyper.UI.$(buttonId).removeClass('et-btn-stone').addClass('et-btn-et-btn-white-only')
	}

	// ************** No Client Connected Event **************

	// Called when you press Run and no client is connected.
	hyper.UI.noClientConnectedHander = function()
	{
		hyper.UI.$('#ModalDialog-NoClientConnected').modal('show')
	}

	// Click handler for link in the ModalDialog-NoClientConnected dialog.
	hyper.UI.$('#ModalDialog-NoClientConnected-HelpLink').click(function()
	{
		// Hide modal dialog.
		hyper.UI.$('#ModalDialog-NoClientConnected').modal('hide')

		// Show Getting Started screen.
		hyper.UI.showTab('getting-started')
	})

	// ************** Additional event handlers **************

	EVENTS.subscribe(EVENTS.CONNECT, function(obj)
	{
		hyper.UI.displayConnectStatus('Connected')
	})

	EVENTS.subscribe(EVENTS.DISCONNECT, function(obj)
	{
		hyper.UI.displayConnectStatus('Disconnected')
	})

	EVENTS.subscribe(EVENTS.USERMESSAGE, function(message)
	{
		// Display a message for the user.
		hyper.UI.displaySystemMessage(message)
	})

	hideLoginButton()
}

