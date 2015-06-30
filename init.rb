#!/usr/bin/ruby

require './helpers.rb'

# This script will make sure that the folders 'hyper/libs' and 'node_modules' are appropriately populated.
# It may fetch files from the Internet.

require 'fileutils'

include FileUtils::Verbose

clone('evothings-client')
clone('evothings-doc')
clone('evothings-examples')
clone('cordova-plugin-ibeacon', 'https://github.com/petermetz/cordova-plugin-ibeacon')
#cordova-http-digest	# no ios version yet
clone('cordova-ble')

# Load EvoThingsStudio settings into a namespace where they won't conflict with our globals.
module ETS
	module Foo
		eval(File.read('./buildPlugin.rb'))
	end
	extend Foo
	#p ETS.methods
end

def getNodeWebkit(arch, pack)
	fetchAndUnpack(pack,
		'http://dl.node-webkit.org/v'+ETS.nodeWebKitVersion+'/node-webkit-v'+ETS.nodeWebKitVersion+'-'+arch+pack::Ending,
		'../node-webkit-bin-'+ETS.nodeWebKitVersion,
		'node-webkit-v'+ETS.nodeWebKitVersion + '-'+arch)
end

def getNodeWebkits
	getNodeWebkit('linux-ia32', TGZ)
	getNodeWebkit('linux-x64', TGZ)
	getNodeWebkit('win-ia32', ZIP)
	getNodeWebkit('win-x64', ZIP)
	getNodeWebkit('osx-x64', ZIP)
end

#puts "looking for localConfig..."

# allow override of defined functions
if(File.exist?('./localConfig.rb'))
	load './localConfig.rb'
end

getNodeWebkits

if(!File.exist?('node_modules/socket.io'))
	sh 'npm install socket.io'
end

if(File.exist?('node_modules/socket.io/node_modules'))
	sh 'flatten-packages'
end

fetchAndUnpack(ZIP, 'http://codemirror.net/codemirror-3.24.zip', 'hyper/libs', 'codemirror-3.24')
fetchAndUnpack(ZIP, 'https://github.com/twbs/bootstrap/releases/download/v3.3.4/bootstrap-3.3.4-dist.zip', 'hyper/libs', 'bootstrap-3.3.4-dist')

fetch('http://layout.jquery-dev.com/lib/js/jquery.layout-latest.js', 'hyper/libs/jquery')
fetch('http://layout.jquery-dev.com/lib/css/layout-default-latest.css', 'hyper/libs/jquery')
fetch('http://code.jquery.com/jquery-2.1.4.min.js', 'hyper/libs/jquery')
fetchAndUnzipSingleFile('http://jqueryui.com/resources/download/jquery-ui-1.11.4.zip', 'hyper/libs/jquery', 'jquery-ui-1.11.4/jquery-ui.min.js')

# make links required for local execution
mklink('documentation', '../evothings-doc')
mklink('examples', '../evothings-examples/examples')
mklink('hyper/server/ui', '../evothings-examples/resources/ui')

# Create package.json for this version.
content = open('package-template.json') do |file| file.read; end
content.gsub!('__VERSION__', ETS.distVersion)
open('package.json', 'w') do |file| file.write(content); end
