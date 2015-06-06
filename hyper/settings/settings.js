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

exports.set = function(key, value)
{
	window.localStorage.setItem(key, JSON.stringify(value))
}

exports.get = function(key)
{
	var data = window.localStorage.getItem(key)
	if (data)
	{
		return JSON.parse(data)
	}
	else
	{
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

	exports[getter] = function()
	{
		return exports.get(name) || defaultValue
	}

	exports[setter] = function(value)
	{
		exports.set(name, value)
	}
}

/**
 * This is the number of directory levels that are
 * scanned when monitoring file updates. The current
 * project that is running is reloaded on all connected
 * devices/browsers when a file is edited and saved.
 * To scan files in the top-level directory only, set
 * this value to 1. Default value is 3.
 */
systemSetting('NumberOfDirecoryLevelsToTraverse', 3)

/**
 * If this setting is true, the Hyper server will
 * serve Cordova JS files for the correct platform,
 * based on user-agent information in the request.
 * Files are fetched from in the Cordova project folder,
 * or if not found from folder application/libs-cordova.
 * Supported platforms are Android and iOS.
 * Set to false to turn this feature off. You then
 * must ensure you include the correct Cordova JS
 * files in your project.
 */
systemSetting('ServeCordovaJsFiles', true)

/**
 * Project window settings.
 */
systemSetting('ProjectWindowGeometry')

/**
 * Welcome screen setting.
 */
systemSetting('ShowWelcomeScreen')

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
 * Web server port.
 */
systemSetting('WebServerPort', 4042)

/**
 * Settings for UDP server discovery.
 */
systemSetting('ServerDiscoveryEnabled', true)
systemSetting('ServerDiscoveryPort', 4088)

/**
 * Version update info should not be shown for this version.
 */
systemSetting('DoNotShowUpdateDialogForVersion', null)

/**
 * Settings for user GUID are handled specially to preserve existing ids.
 */
exports.getEvoGUID = function()
{
	return window.localStorage.getItem('evo-guid')
}

exports.setEvoGUID = function(value)
{
	window.localStorage.setItem('evo-guid', value)
}

/**
 * Address of reload server.
 */
systemSetting('ReloadServerAddress', 'http://evothings.com:8081')
