/*
File: ui-main.js
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

/*** Imported modules ***/

var GUI = require('nw.gui')
var UI_FUNC = require('./ui-func.js')
var UI_EVENTS = require('./ui-events.js')
var UI_SERVER = require('./ui-server.js')

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

// Reference to nw.js GUI module.
hyper.UI.GUI = GUI

// Currently active app path (set when clicking RUN,
// used to highlight list item).
hyper.UI.activeAppPath = ''

/*** Main setup function ***/

// This function is called at the end of this file.
hyper.UI.main = function()
{
    UI_FUNC.defineUIFunctions(hyper)
    UI_SERVER.defineServerFunctions(hyper)
    UI_EVENTS.defineUIEvents(hyper)

	hyper.UI.setupUI()
	hyper.UI.setStartScreenHelpVisibility()
	hyper.UI.showInitialScreen()

	hyper.UI.setupServer()
	hyper.UI.connect()
}

// Call main function to setup UI and server.
hyper.UI.main()

})() // End of closure wrapper.
