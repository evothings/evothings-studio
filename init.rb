#!/usr/bin/ruby

# This script will make sure that the folders 'app/hyper/libs' and
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


### Download JavaScript libraries.

def downloadJavaScriptLibraries
	fetchAndUnpack(ZIP,
		'http://codemirror.net/codemirror-3.24.zip', 'app/hyper/libs',
		'codemirror-3.24')
	fetchAndUnpack(ZIP,
		'https://github.com/twbs/bootstrap/releases/download/v3.3.5/bootstrap-3.3.5-dist.zip',
		'app/hyper/libs', 'bootstrap-3.3.5-dist')
	fetch('http://layout.jquery-dev.com/lib/js/jquery.layout-latest.js',
		'app/hyper/libs/jquery')
	fetch('http://layout.jquery-dev.com/lib/css/layout-default-latest.css',
		'app/hyper/libs/jquery')
	fetch('http://code.jquery.com/jquery-2.1.4.min.js', 'app/hyper/libs/jquery')
	fetchAndUnzipSingleFile('http://jqueryui.com/resources/download/jquery-ui-1.11.4.zip',
		'app/hyper/libs/jquery',
		'jquery-ui-1.11.4/jquery-ui.min.js')
end

# Copy Evothings examples folder to make it possible to
# test examples without building the Workbench.
def copyExamples
	FileUtils.copy_entry(
		"../evothings-examples/generated/examples",
		"./app/examples")
end

### Load custom settings from localConfig.rb

#puts "looking for localConfig..."
# allow override of defined functions
if(File.exist?('./localConfig.rb'))
	load './localConfig.rb'
end

### Run all steps.

#createPackageJson
#installNodeModules
downloadJavaScriptLibraries
copyExamples
