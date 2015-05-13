/*
File: file-util.js
Description: File helper functions.
Author: Mikael Kindborg

License:

Copyright (c) 2013 Mikael Kindborg

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

var PATH = require('path')
var URL = require('url')
var HTTP = require('http')
var FS = require('fs')

exports.readFileSync = function(path, options)
{
	try
	{
		return FS.readFileSync(path, options || {encoding: 'utf8'})
	}
	catch (err)
	{
		return null
	}
}

exports.isPathAbsolute = function(path)
{
	// Check for Linux/OS X and Windows.
	return (path[0] === '/') || (path[0] === PATH.sep) || (path[1] === ':')
}

exports.fileIsHTML = function(path)
{
	var pos = path.lastIndexOf('.')
	var extension = path.substring(pos).toLowerCase()
	return (extension === '.html' || extension === '.htm')
}

// Download a document as a text string.
// callbackFun(resultCode, dataOrError)
// On error, resultCode is -1, on success the HTTP status code.
exports.downloadAsString = function(url, userAgent, callbackFun)
{
	uri = URL.parse(url);
	HTTP.get({hostname:uri.hostname, path:uri.path, headers:{'user-agent':userAgent}}, function(response)
	{
		response.setEncoding('utf8')
		var data = ''
		response.on('data', function (chunk)
		{
			data += chunk
		})
		response.on('end', function ()
		{
			callbackFun(response.statusCode, data)
		})
	}).on('error', function(err)
	{
		callbackFun(-1, err.message)
	})
}

/*

https://npmjs.org/package/adm-zip
https://github.com/cthackers/adm-zip
http://nodejs.org/api/stream.html
https://npmjs.org/package/unzip

http://stackoverflow.com/questions/18323152/get-download-progress-in-node-js-with-chunks
http://stackoverflow.com/questions/4771614/download-large-file-with-node-js-avoiding-high-memory-consumption

var http = require('http');
var fs = require('fs');

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      cb();
    });
  });
}

var file_url = 'http://test-jackguy.rhcloud.com/snap.zip';
var out = fs.createWriteStream('test.zip');

var req = request({
    method: 'GET',
    uri: file_url
});
req.pipe(out);

req.on('data', function (chunk)
{
    console.log(chunk.length);
});

req.on('end', function()
{
    var zip = new AdmZip("test.zip"),
    zipEntries = zip.getEntries();
    zip.extractAllTo("temp-download", true);
});

req.on( 'response', function ( data ) {
    console.log( data.headers[ 'content-length' ] );
} );


var r = request(downloadURL).pipe(downloadFile);

r.on('data', function(data) {
  inspect('binary data received');
});
downloadFile.on('end', function () {
  inspect(downloadPath, 'file downloaded to path');
});

downloadFile.on('error', function (err) {
  inspect(err, 'error downloading file');
});

request(downloadurl).pipe(fs.createWriteStream(downloadtohere))
http://stackoverflow.com/questions/18323152/get-download-progress-in-node-js-with-chunks
*/
