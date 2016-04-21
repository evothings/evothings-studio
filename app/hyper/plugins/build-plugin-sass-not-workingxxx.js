/*
File: build-plugin-sass.js.js
Description: Plugin for buildling SASS files.
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
var SASS = require('node-sass')

exports.build = function(hyper, fullSourcePath, fullDestFolderPath, resultCallback)
{
	console.log('SASS build')

	try
	{
		// TODO: Use utf8 encoding when reading file?
		var code = FS.readFileSync(fullSourcePath, { encoding: 'utf8' })

		var options =
		{
			data: code
		}

		var result = SASS.renderSync(options)

		console.log('@@@ SASS result: ' + result)

		// Save result.
		var fullDestPath = PATH.join(
			fullDestFolderPath,
			PATH.basename(fullSourcePath, '.sass') + '.css')
		FSEXTRA.outputFileSync(fullDestPath, result, { encoding: 'utf8' })

		// Call callback with no error.
		resultCallback()
	}
	catch (error)
	{
		console.log('SASS error: ' + error)
		console.log(error)

		resultCallback(error)
	}
}
