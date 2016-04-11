# Build plugin for Evothings Studio.
# Author: Mikael Kindborg

require './sibling-repos.rb'

$buildTimeStamp = Time.new

def distPackageName
	"EvothingsStudio"
end

def applicationName
	"EvothingsWorkbench"
end

def distCopyright
	"Copyright (c) 2016 Evothings AB"
end

# TODO: Update on new release.
def distVersion
	"2.1.0"
end

# TODO: Update on new release.
# Leave empty for final release.
def distLabel
	"-alpha3"
end

def distVersionLabel
	distVersion + distLabel
end

def distPackageVersion
	time = $buildTimeStamp

	timestamp =
		time.year.to_s[-2..-1] +
		time.month.to_s.rjust(2, '0') +
		time.day.to_s.rjust(2, '0') +
		"_" +
		time.hour.to_s.rjust(2, '0') +
		time.min.to_s.rjust(2, '0')

	distVersion + distLabel + "_" + timestamp
end

def root
	"../"
end

# Destination folder for distribution packages.
def pathDist

	root + distPackageName + "_" + distPackageVersion + "/"
end

# Destination temporary folder for application code.
def pathDistSource
	pathDist + "source/"
end

def cwdName
	File.basename(File.dirname(File.expand_path(__FILE__)))
end

# Source of main HyperReload application code.
def pathSourceHyper
	root + cwdName + "/"
end

# Source file for package.json.
def pathSourcePackageJson
	"./package-template.json"
end

# Source of documentation files.
def pathSourceDoc
	root + "evothings-doc"
end

def nodeWebKitVersion
	"0.12.3"
end

# "node-webkit" for 0.11 and earlier.
# "nwjs" for 0.12.
def nodeWebKitName
	"nwjs"
end

def pathNodeWebkitLinux32
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/nwjs-v" + nodeWebKitVersion +
		"-linux-ia32/"
end

def pathNodeWebkitLinux64
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/nwjs-v" + nodeWebKitVersion +
		"-linux-x64/"
end

def pathNodeWebkitWin32
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/nwjs-v" + nodeWebKitVersion +
		"-win-ia32/"
end

def pathNodeWebkitWin64
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/nwjs-v" + nodeWebKitVersion +
		"-win-x64/"
end

def pathNodeWebkitMac64
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/nwjs-v" + nodeWebKitVersion +
		"-osx-x64/"
end

def pathIconsMac64
	if(RUBY_PLATFORM =~ /darwin/)
		return "./build/nw.icns"
	else
		return nil
	end
end

def updateFile(tar, src)
	if(!FileUtils.uptodate?(tar, [src]))
		FileUtils::Verbose.cp(src, tar)
	end
end

def buildOSXIcons
	# Only on OSX.
	if(RUBY_PLATFORM =~ /darwin/)
		osxIcons = [
			16,
			32,
			128,
			256,
			512,
		]
		FileUtils.mkdir_p('build/icon.iconset')
		osxIcons.each do |size|
			updateFile("build/icon.iconset/icon_#{size}x#{size}.png", "#{root}evothings-viewer/config/icons/icon-#{size}.png")
			updateFile("build/icon.iconset/icon_#{size}x#{size}@2x.png", "#{root}evothings-viewer/config/icons/icon-#{size*2}.png")
		end
		sh 'iconutil -c icns --output build/nw.icns build/icon.iconset'
	end
end

def buildGitVersionFile
	open(pathDistSource + 'gitVersions.txt', 'w') do |file|
		([SiblingRepo.new(cwdName)]+siblingRepos).each do |repo|
			path = root+repo.name
			if(!File.exist?("#{path}/.git"))
				raise "Missing source directory: #{path}"
			end
			o = `git --git-dir=#{path}/.git rev-parse HEAD`
			file.puts "#{repo.name}: #{o.strip}"
		end
	end
end

def buildPreProcess
	sh "ruby ./init.rb"
	buildGitVersionFile
	buildOSXIcons
end

# Not used
#def buildDocumentation
#	include FileUtils::Verbose
#	cwd = pwd
#
#	mkdir_p pathDistSource + 'documentation'
#
#	# plugins
#	cd "#{root}evothings-client"
#	sh 'ruby workfile.rb doc'
#	cd cwd
#	dst = pathDistSource + 'documentation/plugins'
#	mv("#{root}evothings-client/gen-doc", dst)
#
#	# libraries
#	src = "#{root}evothings-examples/resources/libs/evothings"
#	cd src
#	sh 'jsdoc -r .'
#	cd cwd
#	dst = pathDistSource + 'documentation/lib-doc'
#	mv(src + '/out', dst)
#
#	# insert plugin list into API overview.
#	apiOverview = File.read(pathDistSource + 'documentation/studio/api-overview.html')
#	list = File.read(pathDistSource + 'documentation/plugins/index.html.embed')
#	list.gsub!('<a href="', '<a href="../plugins/')
#	apiOverview.gsub!('INSERT_PLUGIN_LIST_HERE', list)
#	File.write(pathDistSource + 'documentation/studio/api-overview.html', apiOverview)
#end

# Not used
#def buildEvoThingsClient
#	cwd = FileUtils.pwd
#	FileUtils.chdir(root + 'evothings-client')
#	sh 'ruby workfile.rb'
#	FileUtils.chdir(cwd)
#	FileUtils.copy_entry(root + 'evothings-client',
#		pathDistSource + 'evothings-client')
#	FileUtils.remove_dir(pathDistSource + 'evothings-client/.git', true)
#end

def buildPostProcess
	#buildDocumentation

	# Delete files that should not be in the dist.
	FileUtils.remove_dir(pathDistSource + "documentation/.git", true)

	# Build Evothings Examples.
	sh 'cd ../evothings-examples/ && ruby build.rb && cd ../evothings-studio/'

	# Copy Evothings Examples to dist.
	FileUtils.copy_entry(
		root + "evothings-examples/generated/examples",
		pathDistSource + "examples")

	# Copy Evothings Studio license file.
	FileUtils.copy_entry(
		"./LICENSE",
		pathDistSource + "LICENSE")
end

# load localConfig.rb, if it exists.
lc = "#{File.dirname(__FILE__)}/localConfig.rb"
require lc if(File.exists?(lc))
