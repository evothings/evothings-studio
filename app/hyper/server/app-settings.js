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
/***	 Imported modules	   ***/
/*********************************/

var FS = require('fs')
var PATH = require('path')
var FILEUTIL = require('./file-util.js')
var UUID = require('./uuid.js')

/*********************************/
/***	   App settings		   ***/
/*********************************/

/**
 * Get the app ID. Create ID if it does not exist.
 * This ID is used to identify apps.
 */
exports.getAppID = function(appPath)
{
	var settings = readAppSettings(appPath)

	if (!settings) {
		settings = {}
	}

	if (!(settings['uuid']))
	{
		settings['uuid'] = UUID.generateUUID()
		writeAppSettings(settings, appPath)
		return settings['uuid']
	}

	return settings['uuid']
}

/**
 * Return short name for app, or null if not set.
 */
exports.getName = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['name'])
	{
		return settings['name']
	}
	else
	{
		return null
	}
}
exports.setName = function(appPath, name)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['name'] = name
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}
/**
 * Return oneline description for app, or null if not set.
 */
exports.getDescription = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['description'])
	{
		return settings['description']
	}
	else
	{
		return null
	}
}
exports.setDescription = function(appPath, description)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['description'] = description
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Return long description for app, or null if not set.
 */
exports.getLongDescription = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['long-description'])
	{
		return settings['long-description']
	}
	else
	{
		return null
	}
}
exports.setLongDescription = function(appPath, description)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['long-description'] = description
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Return version string for app, or null if not set.
 */
exports.getVersion = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['version'])
	{
		return settings['version']
	}
	else
	{
		return null
	}
}
exports.setVersion = function(appPath, version)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['version'] = version
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Return path to app image icon, or null if not set.
 */
exports.getAppImage = function(appPath)
{
	var settings = readAppSettings(appPath)

	if (settings && settings['icon']) {
		return settings['icon']
	} else {
		return null
	}
}

/**
 * Return URL to app documentation online, or null if not set.
 */
exports.getDocURL = function(appPath)
{
	var settings = readAppSettings(appPath)

	if (settings && settings['doc-url']) {
		return settings['doc-url']
	} else {
		return null
	}
}

/**
 * Return tags, or null if not set.
 */
exports.getTags = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['tags']) {
		return settings['tags']
	} else {
		return null
	}
}
exports.setTags = function(appPath, tags)
{
	var settings = readAppSettings(appPath)
	if (settings) {
		settings['tags'] = tags
		writeAppSettings(settings, appPath)
	} else {
		return null
	}
}

/**
 * Return libraries, or null if not set.
 */
exports.getLibraries = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['libraries'])
	{
		return settings['libraries']
	}
	else
	{
		return null
	}
}
exports.setLibraries = function(appPath, libraries)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['libraries'] = libraries
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Generate and save a new App UUID.
 */
exports.generateNewAppUUID = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['uuid'] = UUID.generateUUID()
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Set the app HTML file path.
 */
exports.setIndexFile = function(appPath, indexPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['index-file'] = indexPath
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Get the app HTML file name.
 */
exports.getIndexFile = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		return settings['index-file']
	}
	else
	{
		return null
	}
}

/**
 * Directory for app source files.
 */
exports.getAppDir = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		return settings['app-dir']
	}
	else
	{
		return null
	}
}

/**
 * Directory for app libraries.
 */
exports.getLibDir = function(appPath)
{
	var appDir = exports.getAppDir(appPath)
	if (appDir) {
	  return PATH.join(appDir, 'libs')
	} else {
	  return 'libs'
	}
}

exports.getLibDirFullPath = function(appPath)
{
	return PATH.join(appPath, exports.getLibDir(appPath))
}

/**
 * Directory for built files.
 */
exports.getWwwDir = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		return settings['www-dir']
	}
	else
	{
		return null
	}
}

/**
 * Directories that should not be processed when building.
 */
exports.getAppDontBuildDirs = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		return settings['dont-build']
	}
	else
	{
		return null
	}
}

/**
 * Get the app HTML file short path (relative to project root).
 */
exports.getIndexFileShortPath = function(appPath)
{
	var appDirPath = exports.getAppDir(appPath)
	var indexPath = exports.getIndexFile(appPath)
	if (appDirPath && indexPath)
	{
		return PATH.join(appDirPath, indexPath)
	}
	else if (indexPath)
	{
		return indexPath
	}
	else
	{
		return null
	}
}

/**
 * Get the full HTML file path for the app.
 */
exports.getIndexFileFullPath = function(appPath) {
	var indexShortPath = exports.getIndexFileShortPath(appPath)
	if (indexShortPath)
	{
		return PATH.join(appPath, indexShortPath)
	}
	else
	{
		return null
	}
}

/**
 * Read settings file and return data object, or null if settings file is missing.
 */
function readAppSettings(appPath) {
	var path = PATH.join(appPath, 'evothings.json')
	if (FS.existsSync(path)) {
		var json = FILEUTIL.readFileSync(path)
		try {
  		var settings = JSON.parse(json)
  	} catch(error) {
  	  window.alert(`The file "${path}" does not parse correctly, check it with a JSON linter: ${error}`)
  	  return null
  	}
		migrateSettings(settings, appPath)
		return settings
	} else {
		return null
	}
}

function migrateSettings(settings, appPath) {
  // Migrate to new names
  if (settings['app-uuid']) {
  	settings['uuid'] = settings['app-uuid']
  	delete settings['app-uuid']
		writeAppSettings(settings, appPath)
  }	
  if (settings['app-icon']) {
  	settings['icon'] = settings['app-icon']
  	delete settings['app-icon']
		writeAppSettings(settings, appPath)
  }
  if (settings['app-doc-url']) {
  	settings['doc-url'] = settings['app-doc-url']
  	delete settings['app-doc-url']
		writeAppSettings(settings, appPath)
  }
}


/**
 * Write settings file in JSON format.
 */
function writeAppSettings(settings, appPath) {
	var path = PATH.join(appPath, 'evothings.json')
	var data = JSON.stringify(settings, null, 2)
	FS.writeFileSync(path, data, {encoding: 'utf8'})
}
