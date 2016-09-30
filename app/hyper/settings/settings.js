/*
File: settings.js
Description: Module that handle settings.
Author: Mikael Kindborg

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

var FILEUTIL = require('../server/file-util.js')
var PATH = require('path')
var UUID = require('../server/uuid.js')
var MAIN = require('electron').remote.getGlobal('main')
var UTIL = require('../util/util.js')
var USER_HANDLER = require('../server/user-handler.js')

exports.set = function(key, value)
{
	window.localStorage.setItem(key, JSON.stringify(value))
}

exports.get = function(key)
{
	var data = window.localStorage.getItem(key)
	if (data) {
	  return JSON.parse(data)
	} else {
		return null
	}
}

function systemSetting(name, defaultValue)
{
	defineSettingFuns(name, defaultValue || null)
}

function defineSettingFuns(name, defaultValue)
{
	var getter = 'get' + name
	var setter = 'set' + name

	exports[getter] = function() {
		if (name in window.localStorage) {
  		try {
  			return exports.get(name)
		  } catch (e) {
        // Some crap entered localStorage, remove it
        window.localStorage.removeItem(name)
        console.log("Removed erroneous value for key " + name + " from localstorage")
        return defaultValue
      }
		}	else {
			return defaultValue
		}
	}

	exports[setter] = function(value) {
		exports.set(name, value)
	}
}

/**
 * This is the number of directory levels that are
 * scanned when monitoring file updates. The current
 * project that is running is reloaded on all connected
 * devices/browsers when a file is edited and saved.
 * To scan files in the top-level directory only, set
 * this value to 1. Default value is 5.
 */
systemSetting('NumberOfDirecoryLevelsToTraverse', 5)

/**
 * Project window settings.
 */
systemSetting('ProjectWindowGeometry')

/**
 * Remeber user account setting for login and logout.
 */
systemSetting('RememberMe')


/**
 * Welcome screen setting.
 */
systemSetting('ShowStartScreenHelp', true)

/**
 * Workbench window settings.
 */
systemSetting('WorkbenchFontSize', '18px')
systemSetting('WorkbenchFontFamily', 'monospace')
systemSetting('WorkbenchWindowGeometry')
systemSetting('WorkbenchWindowDividerPosition')
systemSetting('WorkbenchCodeEditorContent')
systemSetting('WorkbenchResultEditorContent')

/**
 * Viewers window settings.
 */
systemSetting('ViewersFontSize', '18px')
systemSetting('ViewersFontFamily', 'monospace')
systemSetting('ViewersWindowGeometry')

/**
 * Web server port.
 * Not used.
 */
systemSetting('WebServerPort', 4042)

/**
 * Settings for UDP server discovery.
 * Not used.
 */
systemSetting('ServerDiscoveryEnabled', true)
systemSetting('ServerDiscoveryPort', 4088)

/**
 * Version update info should not be shown for this version.
 */
systemSetting('DoNotShowUpdateDialogForVersion', null)

/**
 * Version update info should not be shown for this version.
 */
systemSetting('MyAppsPath', FILEUTIL.getEvothingsUserFolderPath())

/**
 * Session ID for the Workbench.
 */
systemSetting('SessionID', null)

/**
 * List of URLs separated with ;
 */
systemSetting('RepositoryURLs', '')

/*
* Which protocol the viewer should run against
*/
systemSetting('RunProtocol', 'http')

/**
 * URL for translation JSON
 */
systemSetting('TranslationsURL', MAIN.TRANSLATIONS + '/translations.json')

/**
 * Settings for user GUID are handled specially to preserve existing ids.
 */
exports.getEvoGUID = function()
{
	var uuid = window.localStorage.getItem('evo-guid')
	if (!uuid)
	{
		uuid = UUID.generateUUID()
		exports.setEvoGUID(uuid)
	}
	return uuid
}

exports.setEvoGUID = function(value)
{
	window.localStorage.setItem('evo-guid', value)
}

exports.getEvoCloudToken = function()
{
	return window.localStorage.getItem('evo-cloudtoken')
}

exports.setEvoCloudToken = function(value)
{
	console.log('* setting evo-cloudtoken to '+value)
	window.localStorage.setItem('evo-cloudtoken', value)
}


// hasXXXX are capabilities associated with the user account
exports.hasEnterprise = function()
{
  return USER_HANDLER.isEnterprise()
}

// Means that the user ONLY has free features
exports.hasFree = function()
{
  return USER_HANDLER.isFree()
}

/**
 * List of URLs as array
 */
exports.getRepositoryURLsArray = function() {
  var urls = exports.getRepositoryURLs()
  if (urls && urls.length > 0) {
    return urls.split(";")
  } else {
    return []
  }
}

/**
 * Address of reload server.
 */
//systemSetting('ReloadServerAddress', 'https://deploy.evothings.com')

var defaultValue = 'https://deploy.evothings.com'

// Incrementing this number resets the value to default.
var currentVersion = '1'

exports.getReloadServerAddress = function() {
	if(exports.get('ReloadServerAddressVersion') === currentVersion)
		return exports.get('ReloadServerAddress') || defaultValue
	else
		return defaultValue
}

exports.setReloadServerAddress = function(value) {
	exports.set('ReloadServerAddress', value)
	exports.set('ReloadServerAddressVersion', currentVersion)
}

exports.setProjectList = function(list)
{
	window.localStorage.setItem('project-list', JSON.stringify(list))
}

exports.getProjectList = function(list)
{
	var json = window.localStorage.getItem('project-list')
	if (json)
	{
		return JSON.parse(fixWin32PathDelimiters(json))
	}
	else
	{
	    return null
	}
}

exports.getExampleLists = function()
{
  var lists = []
  lists.push(MAIN.EXAMPLES + '/examples-list.json')
  if (exports.hasEnterprise()) {
    lists.push(MAIN.EXAMPLES + '/examples-list-enterprise.json')
  }
  var urls = exports.getRepositoryURLsArray()
  for (url of urls) {
    lists.push(url + '/examples/examples-list.json')
  }    
  return lists
}

exports.getLibraryLists = function()
{
  var lists = []
  lists.push(MAIN.LIBRARIES + '/library-list.json')
  if (exports.hasEnterprise()) {
   lists.push(MAIN.LIBRARIES + '/library-list-enterprise.json')
  }
  var urls = exports.getRepositoryURLsArray()
  for (url of urls) {
    lists.push(url + '/libraries/library-list.json')
  }    
  return lists
}


// What a hack. Replaces forward slashes with two
// backslashes, globally in all json data. '/' --> '\\'
function fixWin32PathDelimiters(aString)
{
	// Replace slashes with backslashes on Windows.
	if (process.platform === 'win32')
	{
		return aString.replace(/[\/]/g,'\\\\')
	}
	else
	{
		return aString
	}
}
