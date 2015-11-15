/*
File: app-settings.js
Description: Handling of settings for an app.
File evothings.json in the app folder contains settings.
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

var FS = require('fs')
var PATH = require('path')
var FILEUTIL = require('./fileutil.js')
var UUID = require('./uuid.js')

/*********************************/
/***       App settings        ***/
/*********************************/

/**
 * Get the app ID. Create ID if it does not exist.
 * This ID is used to identify apps.
 */
exports.getAppID = function(appPath)
{
	var settings = readAppSettings(appPath)

	if (!settings)
	{
		settings = {}
	}

	if (!(settings['app-uuid']))
	{
		settings['app-uuid'] = UUID.generateUUID()
		writeAppSettings(settings, appPath)
		return settings['app-uuid']
	}

	return settings['app-uuid']
}

/**
 * Return path to app image icon, or null if not set.
 */
exports.getAppImage = function(appPath)
{
	var settings = readAppSettings(appPath)

	if (settings && settings['app-icon'])
	{
		return settings['app-icon']
	}
	else
	{
		return null
	}
}

/**
 * Read settings file and return data object, or null if settings file is missing.
 */
function readAppSettings(appPath)
{
	var path = PATH.join(appPath, 'evothings.json')
	console.log('*** readAppSettings path: ' + path)
	if (FS.existsSync(path))
	{
	console.log('*** readAppSettings EXISTS')
		var json = FILEUTIL.readFileSync(path)
		console.log('*** JSON: ' + json)
		var settings = JSON.parse(json)
		console.dir(settings)
		return settings
	}
	else
	{
	console.log('*** readAppSettings ERROR')
		return null
	}
}

/**
 * Write settings file in JSON format.
 */
function writeAppSettings(settings, appPath)
{
	var data = JSON.stringify(settings)
	FS.writeFileSync(appPath, data, {encoding: 'utf8'})
}
