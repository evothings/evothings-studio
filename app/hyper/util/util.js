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
var UNZIP = require('adm-zip')
const CHILD_PROCESS = require('child_process')

exports.alertDownloadError = function(msg, url, status) {
  window.alert(`${msg}\n\nURL: ${url}\nSTATUS: ${status}\n\nDo you have internet access?`)
}

var getJSON = function(url, type) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            //if complete
            if (xhr.status === 200) {
              //check if "OK" (200)
              resolve([xhr.response, url]);
            } else {
              reject([xhr.statusText, url]);
            }
          }
        }
        xhr.open('get', url, true);
        xhr.responseType = type || 'json';
        xhr.send();
    });
};

/*
exports.updateTranslations = function(url) {
    getJSON(url).then(json => {
        translations = json
    }, error => {
        console.log('Unable to download translations')
    })
}*/

exports.getJSON = getJSON

exports.checkInternet = function() {
  return exports.getJSON('http://evothings.com/pong.json').then(json => {
      // If there is an alert message, show it to the user
      if (json[0].alert) {
        window.alert(json[0].alert)
      }
      // Otherwise we just log that we are fine
      console.log(json[0].message)
      return true
    }, error => {
      // Ok, couldn't reach pong.json, internet is probably down
      window.alert('You do not seem to have internet access?\n\nEvothings Workbench requires access to the Internet.');
      return false
    })
}

exports.haveVirtualbox = function(vboxPath) {
  try {
    var output = CHILD_PROCESS.execFileSync(vboxPath, ['--version']).toString()
    return output.startsWith("5.1.")
  } catch (er) {
    return false
  }
}

exports.haveVagrant = function() {
  try {
    var output = CHILD_PROCESS.execFileSync('vagrant', ['-v']).toString()
    return output.startsWith("Vagrant 1.8.")
  } catch (er) {
    return false
  }
}

exports.haveVSCode = function() {
  try {
    var output = CHILD_PROCESS.execFileSync('code', ['-h']).toString()
    return output.startsWith("Visual Studio Code")
  } catch (er) {
    return false
  }
}

exports.isVagrantUp = function(dir) {
  try {
    var re = /\d+,default,state,running/;
    var output = CHILD_PROCESS.execFileSync('vagrant', ['status', '--machine-readable'], {cwd: dir}).toString()
    return re.test(output)
  } catch (er) {
    return false
  }
}

exports.unzip = function(zipfile, path, cb) {
  var zip = new UNZIP(zipfile)
  zip.extractAllTo(path)
  //var extractor = UNZIP.Extract({ path: path })
  //extractor.on("close", cb);
  //extractor.on("error", cb);
  //FS.createReadStream(zipfile).pipe(extractor)
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