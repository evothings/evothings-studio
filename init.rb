#!/usr/bin/ruby

# This script will make sure that the folders 'hyper/libs' and
# 'node_modules' are appropriately populated.
# It may fetch files from the Internet.

require 'fileutils'
require './helpers.rb'
require './sibling-repos.rb'

include FileUtils::Verbose

### Clone Git repos required for the build, if they do not exist.

siblingRepos.each do |sr|
	clone(sr.name, sr.url)
end

### Load EvoThingsStudio settings into a namespace where they won't conflict with our globals.

module ETS
	module Foo
		eval(File.read('./buildPlugin.rb'))
	end
	extend Foo
	#p ETS.methods
end

### Create package.json.

def createPackageJson
	content = open('package-template.json') do |file| file.read; end
	content.gsub!('__VERSION__', ETS.distVersion)
	content.gsub!('__VERSION_LABEL__', ETS.distVersionLabel)
	open('package.json', 'w') do |file| file.write(content); end
end

### Get Node Webkit runtimes.

def getNodeWebkit(arch, pack)
	fetchAndUnpack(
		pack,
		'http://dl.nwjs.io/v'+ETS.nodeWebKitVersion+'/'+
		ETS.nodeWebKitName+'-v'+ETS.nodeWebKitVersion+'-'+
		arch+pack::Ending,
		'../node-webkit-bin-'+ETS.nodeWebKitVersion,
		ETS.nodeWebKitName+'-v'+ETS.nodeWebKitVersion+'-'+arch)
end

### Get nwjs.

def getNodeWebkits
	getNodeWebkit('linux-ia32', TGZ)
	getNodeWebkit('linux-x64', TGZ)
	getNodeWebkit('win-ia32', ZIP)
	#getNodeWebkit('win-x64', ZIP)
	getNodeWebkit('osx-x64', ZIP)
end

### Install and flatten node modules.

def installNodeModules
	# Install modules specified in package.json.
	sh 'npm install'

	# Run flatten-packages
	begin
		sh 'flatten-packages'
	rescue => e
		puts 'flatten-packages failed. If module flatten-packages is not found,'
		puts 'please install it with this command (sudo if needed):'
		puts '  npm install -g flatten-packages'
		puts 'Then run init.rb again.'
		exit(1)
	end
end

### Download JavaScript libraries.

def downloadJavaScriptLibraries
	fetchAndUnpack(ZIP,
		'http://codemirror.net/codemirror-3.24.zip', 'hyper/libs',
		'codemirror-3.24')
	fetchAndUnpack(ZIP,
		'https://github.com/twbs/bootstrap/releases/download/v3.3.5/bootstrap-3.3.5-dist.zip',
		'hyper/libs', 'bootstrap-3.3.5-dist')
	fetch('http://layout.jquery-dev.com/lib/js/jquery.layout-latest.js',
		'hyper/libs/jquery')
	fetch('http://layout.jquery-dev.com/lib/css/layout-default-latest.css',
		'hyper/libs/jquery')
	fetch('http://code.jquery.com/jquery-2.1.4.min.js', 'hyper/libs/jquery')
	fetchAndUnzipSingleFile('http://jqueryui.com/resources/download/jquery-ui-1.11.4.zip',
		'hyper/libs/jquery',
		'jquery-ui-1.11.4/jquery-ui.min.js')
end

### Make links required for running Evothings Studio without building a package.

def makeLinksForDevelopment
#	mklink('documentation', '../evothings-doc')
	mklink('examples', '../evothings-examples/generated/examples')
#	mklink('hyper/server/ui', '../evothings-examples/resources/ui')
end

### Load custom settings from localConfig.rb

#puts "looking for localConfig..."

# allow override of defined functions
if(File.exist?('./localConfig.rb'))
	load './localConfig.rb'
end

### Run all steps.

createPackageJson
getNodeWebkits
installNodeModules
downloadJavaScriptLibraries
makeLinksForDevelopment
