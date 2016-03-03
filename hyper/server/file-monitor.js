/*
File: file-monitor.js
Description: File monitoring functionality
Author: Mikael Kindborg

License:

Copyright (c) 2013-2015 Mikael Kindborg

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

/*** Modules used ***/

var FS = require('fs')
var PATH = require('path')
var FILEUTIL = require('./file-util.js')
var LOGGER = require('./log.js')

/*** File traversal variables ***/

var mLastTraverseTime = Date.now()
var mTraverseNumDirecoryLevels = 0
var mFileCounter = 0
var mNumberOfMonitoredFiles = 0
var mBasePath = null
var mFileSystemChangedCallback
var mRunFileSystemMonitor = true
// TODO: Add to UI settings.
//var mIncludeFilter = ['htm','html','css','js','png','jpg','jpeg','gif']
var mExcludeFilter = ['.DS_Store']

/*** File traversal functions ***/

/**
 * External.
 * Set path to monitor.
 */
function setBasePath(path)
{
	mBasePath = path
}

/**
 * External.
 */
function setTraverseNumDirectoryLevels(levels)
{
	mTraverseNumDirecoryLevels = levels
}

/**
 * External.
 */
function getNumberOfMonitoredFiles()
{
	return mNumberOfMonitoredFiles
}

/**
 * External.
 * Circular file structures are not supported and will cause
 * an infinite loop.
 */
function startFileSystemMonitor()
{
	mRunFileSystemMonitor = true
	runFileSystemMonitor()
}

/**
 * External.
 */
function stopFileSystemMonitor()
{
	mRunFileSystemMonitor = false
}

/**
 * External.
 * The callback function will be called when one or more files
 * are modified. File monitoring will stop until started again.
 * This allows the callback to run build scripts without
 * interruption by the file monitor.
 * @param fun Function called when file system has changed.
 * Callback format fun(array), where array is an array of
 * paths for changed files.
 */
function setFileSystemChangedCallbackFun(fun)
{
	mFileSystemChangedCallback = fun
}

/**
 * Internal.
 */
function shouldMonitorFile(path)
{
	for (var i = 0; i < mExcludeFilter.length; ++i)
	{
		if (FILEUTIL.stringEndsWith(path, mExcludeFilter[i]))
		{
			return false
		}
	}
	return true

/*
	for (var i = 0; i < mIncludeFilter.length; ++i)
	{
		if (FILEUTIL.stringEndsWith(path, mIncludeFilter[i]))
		{
			return true
		}
	}
	return false
*/
}

/**
 * Internal.
 */
function runFileSystemMonitor()
{
	if (!mRunFileSystemMonitor) { return }

	mFileCounter = 0

	var changedFiles = []

	var filesUpdated = fileSystemMonitorWorker(
		mBasePath,
		mTraverseNumDirecoryLevels,
		changedFiles)
	if (changedFiles.length > 0)
	{
		// File(s) changed, call the changed function and stop monitoring.
		mFileSystemChangedCallback && mFileSystemChangedCallback(changedFiles)
	}
	else
	{
		// No modifie files detected, monitor file again.
		mNumberOfMonitoredFiles = mFileCounter
		setTimeout(runFileSystemMonitor, 500)
	}
}

/**
 * Internal.
 * Return true if any file has been updated, otherwise false.
 */
function fileSystemMonitorWorker(path, level, changedFiles)
{
	if (!path) { return }

	try
	{
/*
		// For debugging.
		var files = FS.readdirSync(path)
		for (var i in files)
		{
			LOGGER.log(PATH.join(path,files[i]))
		}
		return false
*/
		var files = FS.readdirSync(path)
		for (var i in files)
		{
			try
			{
				var fileName = files[i]
				var fullFilePath = PATH.join(path, fileName)
				var stat = FS.statSync(fullFilePath)
				var t = stat.mtime.getTime()

				if (stat.isFile())
				{
					++mFileCounter
				}

				//LOGGER.log('[file-monitor.js] Checking file: ' + files[i] + ': ' + stat.mtime)
				if (stat.isDirectory() && level > 0)
				{
					//LOGGER.log('[file-monitor.js] Decending into: ' + path + files[i])
					fileSystemMonitorWorker(
						fullFilePath,
						level - 1,
						changedFiles)
				}
				else if (stat.isFile() && shouldMonitorFile(fileName) && t > mLastTraverseTime)
				{
					console.log('[file-monitor.js] @@@ File has changed: ' + files[i])
					mLastTraverseTime = Date.now()
					// Shorten path.
					var shortPath = fullFilePath.replace(mBasePath, '')
					if (0 == shortPath.indexOf(PATH.sep)) { shortPath = shortPath.substr(1) }
					console.log('[file-monitor.js]	   short path: ' + shortPath)
					changedFiles.push(shortPath)
				}
			}
			catch (err2)
			{
				LOGGER.log('[file-monitor.js] ERROR in fileSystemMonitorWorker inner loop: ' + err2)
			}
		}
	}
	catch(err1)
	{
		LOGGER.log('[file-monitor.js] ERROR in fileSystemMonitorWorker: ' + err1)
	}
}

/*** Module exports ***/

exports.setBasePath = setBasePath
exports.setTraverseNumDirectoryLevels = setTraverseNumDirectoryLevels
exports.getNumberOfMonitoredFiles = getNumberOfMonitoredFiles
exports.setFileSystemChangedCallbackFun = setFileSystemChangedCallbackFun
exports.startFileSystemMonitor = startFileSystemMonitor
exports.stopFileSystemMonitor = stopFileSystemMonitor
