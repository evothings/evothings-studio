# Build plugin for EvoThings Studio.
# Author: Mikael Kindborg

def distPackageName
	"EvoThingsStudio"
end

def applicationName
	"EvoThingsWorkbench"
end

def distCopyright
	"Copyright (c) 2013 EvoThings AB"
end

def distVersion
	"0.6.0"
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
	root + "EvoThingsDoc"
end

def nodeWebKitVersion
	"0.8.4"
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

def pathNodeWebkitWin
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-win-ia32/"
end

def pathNodeWebkitMac
	root + "node-webkit-bin-" + nodeWebKitVersion +
		"/node-webkit-v" + nodeWebKitVersion +
		"-osx-ia32/"
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
		updateFile("build/icon.iconset/icon_#{size}x#{size}.png", "#{root}EvoThingsClient/config/icons/icon-#{size}.png")
		updateFile("build/icon.iconset/icon_#{size}x#{size}@2.png", "#{root}EvoThingsClient/config/icons/icon-#{size*2}.png")
	end
	# Only on OSX.
	if(RUBY_PLATFORM =~ /darwin/)
		sh 'iconutil -c build/icns build/icon.iconset'
	end
end

def buildGitVersionFile
	open(pathDistSource + 'gitVersions.txt', 'w') do |file|
		[
			'EvoThingsStudio',
			'EvoThingsClient',
			'EvoThingsDoc',
			'EvoThingsExamples',
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

	buildEvoThingsClient
end

def buildEvoThingsClient
	cwd = FileUtils.pwd
	FileUtils.chdir(root + 'EvoThingsClient')
	sh 'ruby workfile.rb'
	FileUtils.chdir(cwd)
	FileUtils.copy_entry(root + 'EvoThingsClient',
		pathDistSource + 'EvoThingsClient')
	FileUtils.remove_dir(pathDistSource + 'EvoThingsClient/.git', true)
end

def buildPostProcess
	# Copy EvoStudio-specific files to dist.
	FileUtils.copy_entry(
		"./hyper/ui",
		pathDistSource + "hyper/ui")
	FileUtils.copy_entry(
		"./hyper/settings",
		pathDistSource + "hyper/settings")

	# Delete files that should not be in the dist.
	FileUtils.remove_dir(pathDistSource + "hyper/demo", true)

	# Copy EvoStudio examples to dist.
	FileUtils.copy_entry(
		root + "EvoThingsExamples/examples",
		pathDistSource + "examples")

	# Rename HyperReload license file.
	FileUtils.mv(
		pathDistSource + "LICENSE.md",
		pathDistSource + "HyperReload-LICENSE.md")

	# Copy EvoStudio license file.
	FileUtils.copy_entry(
		"./LICENSE",
		pathDistSource + "LICENSE")
end

# load localConfig.rb, if it exists.
lc = "#{File.dirname(__FILE__)}/localConfig.rb"
require lc if(File.exists?(lc))
