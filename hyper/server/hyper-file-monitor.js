/*
File: hyper-file-monitor.js
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
var LOGGER = require('./log.js')

/*** File traversal variables ***/

var mLastReloadTime = Date.now()
var mTraverseNumDirecoryLevels = 0
var mFileCounter = 0
var mNumberOfMonitoredFiles = 0
var mBasePath = null
var mFileSystemChangedCallback
var mRunFileSystemMonitor = true

/*** File traversal functions ***/

/**
 * External.
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
 */

function setFileSystemChangedCallbackFun(fun)
{
	mFileSystemChangedCallback = fun
}

/**
 * Internal.
 */
function runFileSystemMonitor()
{
	if (!mRunFileSystemMonitor) { return }

	mFileCounter = 0
	var filesUpdated = fileSystemMonitorWorker(
		mBasePath,
		mTraverseNumDirecoryLevels)
	if (filesUpdated)
	{
		mFileSystemChangedCallback && mFileSystemChangedCallback()
		setTimeout(runFileSystemMonitor, 1000)
	}
	else
	{
		mNumberOfMonitoredFiles = mFileCounter
		setTimeout(runFileSystemMonitor, 500)
	}
}

/**
 * Internal.
 * Return true if a file ahs been updated, otherwise false.
 */
function fileSystemMonitorWorker(path, level)
{
	if (!path) { return false }
	try
	{
		/*var files = FS.readdirSync(path)
		for (var i in files)
		{
			LOGGER.log(path + files[i])
		}
		return false*/

		var files = FS.readdirSync(path)
		for (var i in files)
		{
			try
			{
				var stat = FS.statSync(path + files[i])
				var t = stat.mtime.getTime()

				if (stat.isFile())
				{
					++mFileCounter
				}

				//LOGGER.log('Checking file: ' + files[i] + ': ' + stat.mtime)
				if (stat.isFile() && t > mLastReloadTime)
				{
					//LOGGER.log('***** File has changed ***** ' + files[i])
					mLastReloadTime = Date.now()
					return true
				}
				else if (stat.isDirectory() && level > 0)
				{
					//LOGGER.log('Decending into: ' + path + files[i])
					var changed = fileSystemMonitorWorker(
						path + files[i] + '/',
						level - 1)
					if (changed) { return true }
				}
			}
			catch (err2)
			{
				LOGGER.log('ERROR in fileSystemMonitorWorker inner loop: ' + err2)
			}
		}
	}
	catch(err1)
	{
		LOGGER.log('ERROR in fileSystemMonitorWorker: ' + err1)
	}
	return false
}

/*** Module exports ***/

exports.setBasePath = setBasePath
exports.setTraverseNumDirectoryLevels = setTraverseNumDirectoryLevels
exports.getNumberOfMonitoredFiles = getNumberOfMonitoredFiles
exports.setFileSystemChangedCallbackFun = setFileSystemChangedCallbackFun
exports.startFileSystemMonitor = startFileSystemMonitor
exports.stopFileSystemMonitor = stopFileSystemMonitor
