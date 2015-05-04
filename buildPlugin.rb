# Build plugin for Evothings Studio.
# Author: Mikael Kindborg

def distPackageName
	"EvothingsStudio"
end

def applicationName
	"EvothingsWorkbench"
end

def distCopyright
	"Copyright (c) 2015 Evothings AB"
end

def distVersion
	"1.2.0"
end

def root
	"../"
end

# Destination folder for distribution packages.
def pathDist
	root + distPackageName + "_" + version + "/"
end

# Destination temporary folder for application code.
def pathDistSource
	pathDist + "source/"
end

# Source of main HyperReload application code.
def pathSourceHyper
	root + "HyperReload/"
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
	"0.11.2"
end

def pathNodeWebkitLinux32
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-linux-ia32/"
end

def pathNodeWebkitLinux64
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-linux-x64/"
end

def pathNodeWebkitWin32
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-win-ia32/"
end

def pathNodeWebkitWin64
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-win-x64/"
end

def pathNodeWebkitMac64
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-osx-x64/"
end

def updateFile(tar, src)
	if(!FileUtils.uptodate?(tar, [src]))
		FileUtils::Verbose.cp(src, tar)
	end
end

def buildOSXIcons
	osxIcons = [
		16,
		32,
		128,
		256,
		512,
	]
	FileUtils.mkdir_p('build/icon.iconset')
	osxIcons.each do |size|
		updateFile("build/icon.iconset/icon_#{size}x#{size}.png", "#{root}evothings-client/config/icons/icon-#{size}.png")
		updateFile("build/icon.iconset/icon_#{size}x#{size}@2x.png", "#{root}evothings-client/config/icons/icon-#{size*2}.png")
	end
	# Only on OSX.
	if(RUBY_PLATFORM =~ /darwin/)
		sh 'iconutil -c icns --output build/nw.icns build/icon.iconset'
	end
end

def buildGitVersionFile
	open(pathDistSource + 'gitVersions.txt', 'w') do |file|
		[
			'evothings-studio',
			'evothings-client',
			'evothings-doc',
			'evothings-examples',
			'HyperReload',
			'cordova-ble',
		].each do |repo|
			if(!File.exist?("#{root}#{repo}/.git"))
				raise "Missing source directory: #{root}#{repo}"
			end
			o = `git --git-dir=#{root}#{repo}/.git rev-parse HEAD`
			file.puts "#{repo}: #{o.strip}"
		end
	end
end

def buildPreProcess
	buildGitVersionFile
	buildOSXIcons
	# Commented out build of Evothings Client to make download package smaller.
	#buildEvoThingsClient
end

def buildDocumentation
	include FileUtils::Verbose
	cwd = pwd

	mkdir_p pathDistSource + 'documentation'

	# plugins
	cd "#{root}evothings-client"
	sh 'ruby workfile.rb doc'
	cd cwd
	dst = pathDistSource + 'documentation/plugins'
	mv("#{root}evothings-client/gen-doc", dst)

	# libraries
	src = "#{root}evothings-examples/resources/libs/evothings"
	cd src
	sh 'jsdoc -r .'
	cd cwd
	dst = pathDistSource + 'documentation/lib-doc'
	mv(src + '/out', dst)

	# insert plugin list into API overview.
	apiOverview = File.read(pathDistSource + 'documentation/studio/api-overview.html')
	list = File.read(pathDistSource + 'documentation/plugins/index.html.embed')
	list.gsub!('<a href="', '<a href="../plugins/')
	apiOverview.gsub!('INSERT_PLUGIN_LIST_HERE', list)
	File.write(pathDistSource + 'documentation/studio/api-overview.html', apiOverview)
end

def buildEvoThingsClient
	cwd = FileUtils.pwd
	FileUtils.chdir(root + 'evothings-client')
	sh 'ruby workfile.rb'
	FileUtils.chdir(cwd)
	FileUtils.copy_entry(root + 'evothings-client',
		pathDistSource + 'evothings-client')
	FileUtils.remove_dir(pathDistSource + 'evothings-client/.git', true)
end

def buildPostProcess
	buildDocumentation

	# Copy (overwrite) custom server files to dist.
	FileUtils.copy_entry(
		"./hyper/server",
		pathDistSource + "hyper/server")

	# Copy (overwrite) custom UI files to dist.
	FileUtils.copy_entry(
		"./hyper/ui",
		pathDistSource + "hyper/ui")

	# Copy (overwrite) custom settings files to dist.
	FileUtils.copy_entry(
		"./hyper/settings",
		pathDistSource + "hyper/settings")

	# Copy Evothings Examples UI resources to hyper/server.
	# This is used by the hyper-connect.html page.
	FileUtils.cp_r(
		Dir[root + "evothings-examples/resources/ui"],
		pathDistSource + "hyper/server")

	# Delete files that should not be in the dist.
	FileUtils.remove_dir(pathDistSource + "hyper/demo", true)
	FileUtils.remove_dir(pathDistSource + "documentation/.git", true)

	# Build Evothings Examples.
	sh 'cd ../evothings-examples/ && ruby build.rb && cd ../evothings-studio/'

	# Copy Evothings Examples to dist.
	FileUtils.copy_entry(
		root + "evothings-examples/examples",
		pathDistSource + "examples")

	# Rename HyperReload license file.
	FileUtils.mv(
		pathDistSource + "LICENSE.md",
		pathDistSource + "HyperReload-LICENSE.md")

	# Copy Evothings Studio license file.
	FileUtils.copy_entry(
		"./LICENSE",
		pathDistSource + "LICENSE")
end

# load localConfig.rb, if it exists.
lc = "#{File.dirname(__FILE__)}/localConfig.rb"
require lc if(File.exists?(lc))
