/*
File: util.js
Description: Module with useful stuff.
Author: Göran Krampe

License:

Copyright (c) 2013-2015 Evothings AB

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

var FS = require('fs')
// track will make sure things are removed when we exit Evothings
var TEMP = require('temp').track()
var HTTPS = require('https')
var PATH = require('path')
var UNZIP = require('unzip2')

exports.alertDownloadError = function(msg, url, status) {
  window.alert(`${msg}\n\nURL: ${url}\nSTATUS: ${status}\n\nDo you have internet access?`)
}

var getJSON = function(url)
{
    return new Promise(function(resolve, reject)
    {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if (xhr.readyState === 4)
            {   //if complete
                if (xhr.status === 200)
                {  //check if "OK" (200)
                    resolve([xhr.response, url]);
                }
                else
                {
                    reject([xhr.statusText, url]);
                }
            }
        }
        xhr.open('get', url, true);
        xhr.responseType = 'json';
        xhr.send();
    });
};

exports.updateTranslations = function(url)
{
    console.log('UTIL.updateTranslations called')
    getJSON(url).then(function(ttext)
    {
        console.log('UTIL.updateTranslations got new translations.')
        console.dir(ttext)
        translations = ttext
    }, function(err)
    {
        console.log('unable to donwload translations :(')
        console.dir(err)
    })
}


exports.getJSON = getJSON

exports.checkInternet = function() {
  return exports.getJSON('http://evothings.com/pong.json').then(json =>
      {
        // If there is an alert message, show it to the user
        if (json[0].alert) {
          window.alert(json[0].alert)
        }
        // Otherwise we just log that we are fine
        console.log(json[0].message)
        return true
      }, error =>
      {
        // Ok, couldn't reach pong.json, internet is probably down
        window.alert('You do not seem to have internet access?\n\nEvothings Studio requires access to the Internet.');
        return false
      })
}

exports.unzip = function(zipfile, path, cb) {
  var extractor = UNZIP.Extract({ path: path })
  extractor.on("close", cb);
  extractor.on("error", cb);
  FS.createReadStream(zipfile).pipe(extractor)
}

function download(url, dest, cb) {
  var file = FS.createWriteStream(dest);
  var request = HTTPS.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    FS.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
}

exports.download = function(url, cb) {
  // Download a file to a temp directory and call callback with full path
  TEMP.mkdir('evodownloads', function(err, dirPath) {
    var filePath = PATH.join(dirPath, PATH.basename(url))
    download(url, filePath, function(err) {
      if (err) {
        cb(null, err)
      }
      cb(filePath)
    })
  })
}

var translations =
{
    // Strings internal to the workbench
    'No Evothings Viewer app connected': '* No Evothings Viewer app connected',
    'Please connect from the Evothings Viewer app on your mobile device(s). Learn more on the Getting Started screen.':
        '* Please connect from the Evothings Viewer app on your mobile device(s). Learn more on the Getting Started screen.',
    'System Message': '* System Message',
    // Strings coming from the proxy
    'Could not find cloud API token': '* Could not find cloud API token',
    'Cloud API token has already been used': '* Cloud API token has already been used',
    // Proxy names for limits
    'Clients': '* Clients',
    'InstrumentationDataStreams': '* InstrumentationDataStreams',
    'exceeded (limit:': '* exceeded (limit:'
}

exports.translate = function(content)
{
    // TODO: actually translate :)
    for( k in translations)
    {
        var v = translations[k]
        content = content.replace(k,v)
    }
    return content
}
