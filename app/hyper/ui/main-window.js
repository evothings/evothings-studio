/*
File: main-window.js
Description: HyperReload UI functionality.
Author: Mikael Kindborg

License:

Copyright (c) 2013-2014 Mikael Kindborg

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

// Wrapping everything in a closure since this file is included
// with a script tag in hyper-ui.html and therefore man affect the
// global browser scope.
;(function()
{
/*** Electron modules ***/
const ipcRenderer = require('electron').ipcRenderer

/*** Imported modules ***/
var UI_FUNC = require('./main-window-func.js')
var UI_EVENTS = require('./main-window-events.js')
var UI_SERVER = require('./main-window-server.js')
var UI_BUILD = require('./main-window-build.js')

/*** Globals ***/

// Object that holds globally available functions.
var hyper = {}

// Global Node.js reference to the main hyper object.
// Useful for e.g. access from the JavaScript interactive tools window.
global.hyper = hyper

// Global reference to hyper.
window.hyper = hyper

// UI-related functions.
hyper.UI = {}

// DOM objects.
hyper.UI.DOM = {}

// Reference to jQuery.
hyper.UI.$ = window.$

// Reference to DOM screen object.
hyper.UI.DOM.screen = window.screen

// Reference to DOM document object.
hyper.UI.DOM.document = window.document

// Reference to DOM document object.
hyper.UI.DOM.localStorage = window.localStorage

// Currently active app path (set when clicking RUN,
// used to highlight list item).
hyper.UI.activeAppPath = ''

/*** Main setup function ***/

// This function is called at the end of this file.
hyper.UI.main = function()
{
    // Added to handle Electron ipc events
    ipcRenderer.on('msg', function(event, arg) {
      //console.log('Message from tools-workbench-window ', JSON.stringify(arg));
      if ('eval' == arg.message) {
        hyper.SERVER.evalJS(arg.code, arg.client)
      } else if ('setSession' == arg.message) {
        LOGGER.log('[main-window-func.js] ==== session set to ' + arg.sid)
      }
    });

    // Added to handle Electron command messages
    ipcRenderer.on('command', function(event, arg) {
      switch (arg.message) {
        case 'newApp':
          hyper.UI.openNewAppDialog()
          break
        case 'openConsoleWindow':
          hyper.UI.openConsoleWindow()
          break
        case 'openViewersWindow':
          hyper.UI.openViewersWindow()
          break
        case 'openSettingsDialog':
          hyper.UI.openSettingsDialog()
          break
        case 'disconnectAllViewers':
          hyper.UI.disconnectAllViewers()
          break
        case 'gettingStarted':
          hyper.UI.showTab('getting-started')
          break
        case 'shareInSocialMedia':
          hyper.UI.$('#dialog-share-social').modal('show')
          break
      }
    })

    // Define functions on the hyper.UI object.
    UI_FUNC.defineUIFunctions(hyper)
    UI_SERVER.defineServerFunctions(hyper)
    UI_EVENTS.defineUIEvents(hyper)
    UI_BUILD.defineBuildFunctions(hyper)

    // Setup UI.
    hyper.UI.setupUI()
    hyper.UI.setStartScreenHelpVisibility()
    hyper.UI.showInitialScreen()

    //Connect to server.
    hyper.UI.setupServer()
    hyper.UI.connect()
}

// Call main function to setup UI and server.
hyper.UI.main()

})() // End of closure wrapper.
