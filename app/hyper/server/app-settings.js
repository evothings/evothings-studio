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
exports.getOrCreateAppID = function(appPath) {
	var settings = readAppSettings(appPath) || {}
	if (!(settings['uuid'])) {
		settings['uuid'] = UUID.generateUUID()
		writeAppSettings(settings, appPath)
	}
	return settings['uuid']
}

/**
 * Get the app ID, return null if it does not exist.
 */
exports.getAppID = function(appPath) {
	var settings = readAppSettings(appPath)
	if (settings && settings['uuid']) {
		return settings['uuid']
	}
	return null
}

/**
 * Return short name for app, or null if not set.
 */
exports.getName = function(appPath) {
	var settings = readAppSettings(appPath)
	if (settings && settings['name']) {
		return settings['name']
	}
	return null
}
exports.setName = function(appPath, name) {
	var settings = readAppSettings(appPath)
	if (settings) {
		settings['name'] = name
		writeAppSettings(settings, appPath)
	}
	return null
}

/**
 * Return title for app, or null if not set.
 */
exports.getTitle = function(appPath) {
	var settings = readAppSettings(appPath)
	if (settings && settings['title']) {
		return settings['title']
	}
	// Otherwise we try to extract it from title tag
	return getTitleFromFile(appPath)
}
exports.setTitle = function(appPath, title) {
	var settings = readAppSettings(appPath)
	if (settings) {
		settings['title'] = title
		writeAppSettings(settings, appPath)
		// Here we ought to set it in the index file too
	}
	return null
}

function getTitleFromFile(path) {
	// Is it an HTML file?
	if (FILEUTIL.fileIsHTML(path)) {
			var indexPath = path
	}	else if (FILEUTIL.directoryHasEvothingsJson(path)) {
		// Is it a directory with evothings.json in it?
		// Read index file from evothings.json
		var indexPath = APP_SETTINGS.getIndexFileFullPath(path)
	}	else 	{
		// Return null on unknown file type.
		return null
	}

	// Read app main file.
	var data = FILEUTIL.readFileSync(indexPath)
	if (!data) {
		// Return null on error (file does not exist).
		return null
	}

	var title = getTagContent(data, 'title')
	if (!title) {
		// If title tag is missing, use short form of path as title.
		title = getNameFromPath(indexPath)
	}

	return title
}


function getTagContent(data, tag)
{
	var tagStart = '<' + tag + '>'
	var tagEnd = '</' + tag + '>'
	var pos1 = data.indexOf(tagStart)
	if (-1 === pos1) { return null }
	var pos2 = data.indexOf(tagEnd)
	if (-1 === pos2) { return null }
	return data.substring(pos1 + tagStart.length, pos2)
}

// Use last part of path as name.
// E.g. '/home/apps/HelloWorld/index.html' -> 'HelloWorld/index.html'
// Use full path as fallback.
function getNameFromPath(path)
{
	path = path.replace(new RegExp('\\' + PATH.sep, 'g'), '/')
	var pos = path.lastIndexOf('/')
	if (-1 === pos) { return path }
	pos = path.lastIndexOf('/', pos - 1)
	if (-1 === pos) { return path }
	return path.substring(pos + 1)
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
 * Return Cordova ID (reverse domain style) for app, or null if not set.
 */
exports.getCordovaID = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['cordova-id'])
	{
		return settings['cordova-id']
	}
	else
	{
		return null
	}
}
exports.setCordovaID = function(appPath, version)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['cordova-id'] = version
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Return Author name for app, or null if not set.
 */
exports.getAuthorName = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['author-name'])
	{
		return settings['author-name']
	}
	else
	{
		return null
	}
}
exports.setAuthorName = function(appPath, version)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['author-name'] = version
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}
/**
 * Return Author email for app, or null if not set.
 */
exports.getAuthorEmail = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['author-email'])
	{
		return settings['author-email']
	}
	else
	{
		return null
	}
}
exports.setAuthorEmail = function(appPath, version)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['author-email'] = version
		writeAppSettings(settings, appPath)
	}
	else
	{
		return null
	}
}

/**
 * Return Author URL for app, or null if not set.
 */
exports.getAuthorURL = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['author-url'])
	{
		return settings['author-url']
	}
	else
	{
		return null
	}
}
exports.setAuthorURL = function(appPath, version)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['author-url'] = version
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
 * Return plugins.
 */
exports.getPlugins = function(appPath)
{
	var settings = readAppSettings(appPath)
	if (settings && settings['plugins'])
	{
		return settings['plugins']
	}
	else
	{
		return []
	}
}
exports.setPlugins = function(appPath, plugins)
{
	var settings = readAppSettings(appPath)
	if (settings)
	{
		settings['plugins'] = plugins
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
