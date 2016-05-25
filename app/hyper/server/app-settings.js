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
 * Return URL to app documentation online, or null if not set.
 */
exports.getDocURL = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['app-doc-url'])
	{
		return settings['app-doc-url']
	}
	else
	{
		return null
	}
}

/**
 * Return app-tags, or null if not set.
 */
exports.getTags = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['tags'])
	{
		return settings['tags']
	}
	else
	{
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

/**
 * Generate and save a new App UUID.
 */
exports.generateNewAppUUID = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['app-uuid'] = UUID.generateUUID()
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
exports.getIndexFileFullPath = function(appPath)
{
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
function readAppSettings(appPath)
{
	var path = PATH.join(appPath, 'evothings.json')
	if (FS.existsSync(path))
	{
		var json = FILEUTIL.readFileSync(path)
		var settings = JSON.parse(json)
		return settings
	}
	else
	{
		return null
	}
}

/**
 * Write settings file in JSON format.
 */
function writeAppSettings(settings, appPath)
{
	var path = PATH.join(appPath, 'evothings.json')
	var data = JSON.stringify(settings, null, 2)
	FS.writeFileSync(path, data, {encoding: 'utf8'})
}
