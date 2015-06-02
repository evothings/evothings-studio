# Definitions of build paths.
# Author: Mikael Kindborg
# Copyright (c) 2013 Mikael Kindborg
# License: Apache Version 2.0

def distPackageName
	"HyperReload"
end

def applicationName
	"HyperReload"
end

def distCopyright
	"Copyright (c) 2013 Mikael Kindborg"
end

def distVersion
	"0.5"
end

def root
	"../../"
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
	root + "HyperReload/hyper/build/package-template.json"
end

# Source of main demo apps.
def pathSourceDemo
	root + "HyperReload/demo/"
end

# Source of initial project list.
def pathSourceProjectList
	"./project-list-template.json"
end

# Source of documentation files.
def pathSourceDoc
	"./documentation/"
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

def buildPreProcess
end

def buildPostProcess
	# Copy license file.
	FileUtils.copy_entry(
		"LICENSE",
		pathDistSource + "LICENSE")
end

# load localConfig.rb, if it exists.
localConfig = "#{File.dirname(__FILE__)}/localConfig.rb"
require localConfig if(File.exists?(localConfig))
