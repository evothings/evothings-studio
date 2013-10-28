# Path definitions for EvoThings Studio.
# Author: Mikael Kindborg

def distPackageName
	"EvoThingsStudio"
end

# Destination folder for distribution packages.
def pathDist
	"../" + distPackageName + "_" + version + "/"
end

# Destination temporary folder for application code.
def pathDistSource
	pathDist + "source/"
end

# Source of main HyperReload application code.
def pathSourceHyper
	"../HyperOpen/"
end

# Source file for package.json.
def pathSourcePackageJson
	"./package-template.json"
end

# Source of main demo apps.
def pathSourceDemo
	"./demo/"
end

# Source of initial project list.
def pathSourceProjectList
	"./project-list-template.json"
end

# Source of documentation files.
def pathSourceDoc
	"./documentation/"
end

def pathNodeWebkitLinux32
	"../node-webkit-bin/node-webkit-v0.7.5-linux-ia32/"
end

def pathNodeWebkitLinux64
	"../node-webkit-bin/node-webkit-v0.7.5-linux-x64/"
end

def pathNodeWebkitWin
	"../node-webkit-bin/node-webkit-v0.7.5-win-ia32/"
end

def pathNodeWebkitMac
	"../node-webkit-bin/node-webkit-v0.7.5-osx-ia32/"
end

def buildPostProcess
	# Copy EvoStudio-specific files to dist.
	FileUtils.copy_entry(
		"./application/ui/hyper-ui.html",
		pathDistSource + "application/ui/hyper-ui.html")
	FileUtils.copy_entry(
		"./application/ui/hyper-ui.css",
		pathDistSource + "application/ui/hyper-ui.css")
	FileUtils.copy_entry(
		"./application/ui/hyper-ui.js",
		pathDistSource + "application/ui/hyper-ui.js")

	# Copy EvoStudio license file.
	FileUtils.copy_entry(
		"./LICENSE.md",
		pathDistSource + "license/EvoStudio-license.md")
end
