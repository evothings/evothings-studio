#!/usr/bin/ruby

# This script will make sure that the folders 'app/hyper/libs' has
# the js libraries we are using.

require 'fileutils'
require './helpers.rb'

include FileUtils::Verbose

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

downloadJavaScriptLibraries
