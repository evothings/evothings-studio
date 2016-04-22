/*
File: build-plugin-coffee.js.js
Description: Plugin for building CoffeeScript files.
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
var COFFEE = require('coffee-script')

exports.build = function(hyper, fullSourcePath, fullDestFolderPath, resultCallback)
{
	console.log('COFFEE build')

	try
	{
		var options =
		{
		}

		var code = FS.readFileSync(fullSourcePath, { encoding: 'utf8' })

		var result = COFFEE.compile(code, options)

		// Save result.
		var fullDestPath = PATH.join(
			fullDestFolderPath,
			PATH.basename(fullSourcePath, '.coffee') + '.js')
		FSEXTRA.outputFileSync(fullDestPath, result, { encoding: 'utf8' })

		// Call callback with no error.
		resultCallback()
	}
	catch (error)
	{
		console.log('COFFEE error: ' + error)
		console.log(error)

		resultCallback(error)
	}
}
