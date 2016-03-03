/*
File: build-plugin-js.js.js
Description: Plugin for building JavaScript files. Supports ES6.
Author: Mikael Kindborg

License:

Copyright (c) 2016 Evothings AB

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

var FS = require('fs')
var PATH = require('path')
var FSEXTRA = require('fs-extra')
var BABEL = require('babel-core')

exports.build = function(hyper, fullSourcePath, fullDestFolderPath, resultCallback)
{
	console.log('BABEL build')

	try
	{
		var presetsPath = PATH.join(
			hyper.UI.getWorkbenchPath(),
			'node_modules',
			'babel-preset-es2015')

		//http://babeljs.io/docs/usage/options/
		var options =
		{
			"ast": false,
			"babelrc": false,
			"presets": [presetsPath],
			"filename": fullSourcePath
		}

		// TODO: Use utf8 encoding when reading file?
		var code = FS.readFileSync(fullSourcePath, { encoding: 'utf8' })

		var result = BABEL.transform(code, options)

		var data = !!result ? result.code : null

		// Disable strict mode.
		if (data)
		{
			data = data.replace("'use strict';", '')
		}

		console.log('Build result write')

		// Save result.
		var fullDestPath = PATH.join(fullDestFolderPath, PATH.basename(fullSourcePath))
		FSEXTRA.outputFileSync(fullDestPath, data, { encoding: 'utf8' })

		// Call callback with no error.
		resultCallback()
	}
	catch (error)
	{
		//console.log('BABEL error: ' + error)
		//console.log(error)

		resultCallback(error)
	}
}
