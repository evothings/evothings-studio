/*
File: filemonitor.js
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
	var filesUpdated = scanAppFiles(fileSystemMonitorCallback)
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
// returns true if any callback returned true, false otherwise.
// if a callback returns true, the scan is aborted.
// sets mFileCounter.
function scanAppFiles(callback)
{
	mFileCounter = 0
	return scanAppFilesWorker(callback, mBasePath, mTraverseNumDirecoryLevels)
}

function shouldIgnoreAppFile(name)
{
	// dot files are hidden by UNIX systems, and should not be part of any HTML project.
	// in Evothings projects, common dot files include ".git" and ".svn".
	//window.console.log(typeof name, name)
	return name.substr(0,1) == '.'
}

function scanAppFilesWorker(callback, path, level)
{
	//window.console.log('scanAppFilesWorker path:level: ' + path + ':' + level)
	if (!path) { return false }
	{
		var files = FS.readdirSync(path)
		for (var i in files)
		{
			{
				if(!files[i])
					continue
				if(shouldIgnoreAppFile(files[i]))
					continue

				var name = path + files[i]
				var stat = FS.statSync(name)

				if (stat.isFile())
				{
					++mFileCounter
				}

				if(callback(name, stat))
					return true

				if (stat.isDirectory() && level > 0)
				{
					//window.console.log('Decending into: ' + path + files[i])
					if(scanAppFilesWorker(callback, path + files[i] + '/', level - 1))
						return true
				}
			}
		}
	}
	return false
}

function fileSystemMonitorCallback(name, stat)
{
	var t = stat.mtime.getTime()

	//window.console.log('Checking file: ' + name + ': ' + stat.mtime)
	if (stat.isFile() && t > mLastReloadTime)
	{
		//window.console.log('***** File has changed ***** ' + name)
		mLastReloadTime = Date.now()
		return true
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
exports.scanAppFiles = scanAppFiles
