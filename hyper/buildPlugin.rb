# Path definitions for EvoStudio.
# Author: Mikael Kindborg

# Destination folder for distribution packages.
def pathDist
	"../../EvoStudio " + version + "/"
end

# Destination temporary folder for application code.
def pathDistSource
	pathDist + "source/"
end

# Source of main HyperReload application code.
def pathSourceHyper
	"../../HyperReload/UI/"
end

# Source file for package.json.
def pathSourcePackageJson
	"./package-template.json"
end

# Source file for LICENSE.md.
def pathSourceLicense
	"../LICENSE"
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

def distPackageName
	"EvoStudio"
end

def pathNodeWebkitLinux32
	"../../node-webkit-bin/node-webkit-v0.7.5-linux-ia32/"
end

def pathNodeWebkitLinux64
	"../../node-webkit-bin/node-webkit-v0.7.5-linux-x64/"
end

def pathNodeWebkitWin
	"../../node-webkit-bin/node-webkit-v0.7.5-win-ia32/"
end

def pathNodeWebkitMac
	"../../node-webkit-bin/node-webkit-v0.7.5-osx-ia32/"
end

def buildPostProcess
	# Copy EvoStudio-specific files to dist.
	FileUtils.copy_entry(
		"./application/hyper-ui.html", 
		pathDistSource + "application/hyper-ui.html")
	FileUtils.copy_entry(
		"./application/hyper-ui.css", 
		pathDistSource + "application/hyper-ui.css")
	# TODO: Copy EvoStudio license file.
end
