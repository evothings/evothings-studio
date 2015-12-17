var http = require('http');
var express = require("express");
var RED = require("node-red");
var PATH = require('path')
var NRMODULES = require("nrmodules")

var app = undefined
var server = undefined

var nreditor =
{
	startForPath: function(path)
	{
		console.log('setting node-red project path to '+path);
		var modpath = PATH.join(__dirname,'..','..','node_modules','nrmodules');
		console.log('modules path is = '+modpath);
		// Create an Express app
		app = express();
		// Add a simple route for static content served from 'public'
		app.use("/",express.static("public"));
		// Create a server
		server = http.createServer(app);
		// Create the settings object - see default settings.js file for other options
		var settings = {
			verbose: true,
			disableEditor: false,
			httpAdminRoot:"/red",
			httpNodeRoot: "/api",
			flowFile: path+"/flows.json",
			nodesDir: modpath,
			userDir:path,
			functionGlobalContext: { }    // enables global context
		};

		// Initialise the runtime with a server and settings
		RED.init(server,settings);
		// Serve the editor UI from /red
		app.use(settings.httpAdminRoot,RED.httpAdmin);
		// Serve the http nodes UI from /api
		app.use(settings.httpNodeRoot,RED.httpNode);
		server.listen(8000);

		// Start the runtime
		console.log('starting node-red .....');
		RED.start();
	},

	stop: function()
	{
		if (app)
		{
			// stop red
			RED.stop();
			if(app && server)
			{
				console.log('stopping app '+app)
				// stop express
				server.close();
				app = undefined;
				server = undefined;
			}
		}
	}
};


module.exports = nreditor