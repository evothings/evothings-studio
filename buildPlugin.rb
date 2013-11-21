# Build plugin for EvoThings Studio.
# Author: Mikael Kindborg

def distPackageName
	"EvoThingsStudio"
end

def distCopyright
	"Copyright (c) 2013 EvoThings AB"
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
	"./documentation/"
end

def nodeWebKitVersion
	"0.8.0"
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
	FileUtils.copy_entry(
		pathDistSource + "LICENSE.md",
		pathDistSource + "HyperReload-LICENSE.md")

	# Copy EvoStudio license file.
	FileUtils.copy_entry(
		"./LICENSE.md",
		pathDistSource + "LICENSE.md")
end
