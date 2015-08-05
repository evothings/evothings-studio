#######################################################
# Build a distribution package of HyperReload.        #
#                                                     #
# Note that paths must be defined in a file           #
# named "buildPlugin.rb".                             #
#                                                     #
# This script is experimental and undocumented,       #
# and is not needed to run HyperReload. The easiest   #
# way to run Hyper is by downloading node-webkit,     #
# see instructions in the README.md file.             #
#                                                     #
# Author: Mikael Kindborg                             #
# Copyright (c) 2013 Mikael Kindborg                  #
# License: Apache Version 2.0                         #
#######################################################

require "fileutils"
require "pathname"

#######################################################
#               BUILD PROCESS OVERVIEW                #
#######################################################

# Copy files from the HyperReload repository into the
# destination folder named <dist>_<version>
#
# Do some processing of the files.
#
# Create directories for binary dists and copy
# the code there and also copy node-webkit
# binary files there.
#
# Zip distribution directories.

#######################################################
#                 GLOBAL VARIABLES                    #
#######################################################

$VersionString = 'UndefinedVersion'

def version
	$VersionString
end

#######################################################
#                  BUILD FUNCTIONS                    #
#######################################################

def buildCreateDistDir
	fileDelete(pathDist)
	fileCreateCleanPath(pathDistSource)
end

def buildCopyHyperToDistDir
	puts "Copying Hyper to dist dir"

	FileUtils.copy_entry(
		pathSourceHyper + "hyper/",
		pathDistSource + "hyper/")
	FileUtils.copy_entry(
		pathSourceDoc,
		pathDistSource + "documentation/")
	FileUtils.copy_entry(
		pathSourceHyper + "node_modules/",
		pathDistSource + "node_modules/")

	# Copy license file.
	FileUtils.copy_entry(
		pathSourceHyper + "HyperReload-LICENSE.md",
		pathDistSource + "HyperReload-LICENSE.md")

	# Create package.json for this version.
	content = fileReadContent(pathSourcePackageJson)
	content = content.gsub("__VERSION__", version)
	fileSaveContent(pathDistSource + "package.json", content)

	# Delete hidden OS X files.
	fileDeleteAll(pathDist + "**/.DS_Store")
end

def buildDistBinaries
	puts "Building binary packages"

	puts "Building Linux32"
	buildDistBinaryLinux32

	puts "Building Linux64"
	buildDistBinaryLinux64

	puts "Building Mac64"
	buildDistBinaryMac64

	puts "Building Win32"
	buildDistBinaryWin32

	puts "Building Win64"
	buildDistBinaryWin64

	# Delete hidden OS X files.
	fileDeleteAll(pathDist + "**/.DS_Store")
end

def buildDistBinaryLinux32
	buildDistBinaryLinux(
		pathDistSource,
		distPackageLinux32,
		pathNodeWebkitLinux32, true)
end

def buildDistBinaryLinux64
	buildDistBinaryLinux(
		pathDistSource,
		distPackageLinux64,
		pathNodeWebkitLinux64, true)
end

def buildDistBinaryLinux(sourcePath, targetPath, sourceBin, wrap)

	# Copy JavaScript/HTML files.
	FileUtils.copy_entry(sourcePath, targetPath)

	# Copy files.
	if(wrap)
		FileUtils.copy_entry(
			sourceBin + "nw",
			targetPath + "nw")
		FileUtils.copy_entry(
			pathSourceHyper + "wrap-nw.sh",
			targetPath + applicationName)
	else
		FileUtils.copy_entry(
			sourceBin + "nw",
			targetPath + applicationName)
	end
	FileUtils.copy_entry(
		sourceBin + "nw.pak",
		targetPath + "nw.pak")
	FileUtils.copy_entry(
		sourceBin + "libffmpegsumo.so",
		targetPath + "libffmpegsumo.so")
	FileUtils.copy_entry(
		sourceBin + "icudtl.dat",
		targetPath + "icudtl.dat")
	FileUtils.copy_entry(
		sourceBin + "credits.html",
		targetPath + "hyper/license/node-webkit-credits.html")
end

def buildDistBinaryMac64

	sourcePath = pathDistSource
	targetPath = distPackageMac64
	sourceBin = pathNodeWebkitMac64
	appPath = targetPath + applicationName + ".app"

	# Copy JavaScript/HTML files.
	FileUtils.copy_entry(sourcePath, targetPath)

	# Copy files.
	FileUtils.copy_entry(
		sourceBin + "node-webkit.app",
		appPath)
	FileUtils.copy_entry(
		sourceBin + "credits.html",
		targetPath + "hyper/license/node-webkit-credits.html")

	# Patch Info.plist.
	# TODO: Add icon patch.
	infoPlistPath = appPath + "/Contents/Info.plist"
	info = fileReadContent(infoPlistPath)
	#puts(info)
	info = macPatchValue(info, "CFBundleName", applicationName)
	info = macPatchValue(info, "CFBundleShortVersionString", version)
	info = macPatchValue(info, "CFBundleVersion", distCopyright)
	#puts(info)
	fileSaveContent(infoPlistPath, info)
end

# This is a hack.
def macPatchValue(info, key, newValue)
	index1 = info.index("<key>" + key + "</key>", 0)
	index1 = info.index("<string>", index1)
	index1 = index1 + 7
	index2 = info.index("</string>", index1)
	info = info[0..index1] + newValue + info[index2..-1]
end

def buildDistBinaryWin32
	buildDistBinaryWin(
		pathDistSource,
		distPackageWin32,
		pathNodeWebkitWin32)
end

def buildDistBinaryWin64
	buildDistBinaryWin(
		pathDistSource,
		distPackageWin64,
		pathNodeWebkitWin64)
end

def buildDistBinaryWin(sourcePath, targetPath, sourceBin)

	# Copy JavaScript/HTML files.
	FileUtils.copy_entry(sourcePath, targetPath)

	# Copy files.
	FileUtils.copy_entry(
		sourceBin + "nw.exe",
		targetPath + applicationName + ".exe")
	FileUtils.copy_entry(
		sourceBin + "nw.pak",
		targetPath + "nw.pak")
	FileUtils.copy_entry(
		sourceBin + "d3dcompiler_46.dll",
		targetPath + "d3dcompiler_46.dll")
	FileUtils.copy_entry(
		sourceBin + "ffmpegsumo.dll",
		targetPath + "ffmpegsumo.dll")
	FileUtils.copy_entry(
		sourceBin + "icudtl.dat",
		targetPath + "icudtl.dat")
	FileUtils.copy_entry(
		sourceBin + "libEGL.dll",
		targetPath + "libEGL.dll")
	FileUtils.copy_entry(
		sourceBin + "libGLESv2.dll",
		targetPath + "libGLESv2.dll")
	FileUtils.copy_entry(
		sourceBin + "credits.html",
		targetPath + "hyper/license/node-webkit-credits.html")
end

def buildZippedBinaries
	zipPackage(distPackageLinux32)
	zipPackage(distPackageLinux64)
	zipPackage(distPackageMac64)
	zipPackage(distPackageWin32)
	zipPackage(distPackageWin64)
end

# Build distribution package.
def buildDist zipFlag
	puts "Building " + distPackageName + " version " + version + " with node-webkit version " + nodeWebKitVersion
	buildCreateDistDir
	buildPreProcess
	buildCopyHyperToDistDir
	buildPostProcess
	buildDistBinaries
	if zipFlag == "zip" then
		buildZippedBinaries
	end
	puts "Build done"
end

#######################################################
#                    FILE HELPERS                     #
#######################################################

def fileReadContent(filePath)
	# File.open(filePath, "rb") { |f| f.read.force_encoding("UTF-8") }
	File.open(filePath, "rb") { |f| f.read }
end

def fileSaveContent(destFile, content)
	File.open(destFile, "wb") { |f| f.write(content) }
end

def fileDelete(path)
	if File.exists? path then
		FileUtils.remove_entry(path, true)
	end
end

def fileCreateCleanPath(path)
	pathName = Pathname.new(path)
	pathName.mkpath()
		begin
	pathName.rmtree()
	rescue
		puts "Cannot delete: " + pathName.to_s
	end
	pathName.mkpath()
end

# Example: fileDeleteAll(pathDist + "**/.DS_Store")
def fileDeleteAll(globPath)
	Pathname.glob(globPath).each do |path|
		puts "Deleting " + path.to_s
		file = path.to_s
		File.delete file
	end
end

def fileSubstString(path, fromString, toString)
	content = fileReadContent(path)
	content = content.gsub(fromString, toString)
	fileSaveContent(path, content)
end

# Helper function to run shell commands.
def sh(cmd)
	# Print the command to stdout.
	if(cmd.is_a?(Array))
		p cmd
	else
		puts cmd
	end
	# Run it.
	success = system(cmd)
	raise "Command failed" unless(success)
end

def zip(source, dest)
	command = "zip -r " + dest + " " + source
	sh(command)
end

def zipPackage(distPackage)
	oldDir = FileUtils.pwd
	FileUtils.cd pathDist
	distPackage.gsub!(pathDist, '')
	zipName = distPackage + "__ZIP__"
	zipName = zipName.gsub("/__ZIP__", ".zip")
	zip(distPackage, zipName)
	FileUtils.cd oldDir
end


#######################################################
#                  PATH NAME SHORTCUTS                #
#######################################################

def distPackageLinux32
	pathDist + distPackageName + "_Linux_32_" + version + "/"
end

def distPackageLinux64
	pathDist + distPackageName + "_Linux_64_" + version + "/"
end

def distPackageMac64
	pathDist + distPackageName + "_Mac_64_" + version + "/"
end

def distPackageWin32
	pathDist + distPackageName + "_Win_32_" + version + "/"
end

def distPackageWin64
	pathDist + distPackageName + "_Win_64_" + version + "/"
end


#######################################################
#                      OVERRIDES                      #
#######################################################

load "buildPlugin.rb"

#######################################################
#                 START BUILD PROCESS                 #
#######################################################
$VersionString = distVersion

if (ARGV.size == 0)
	buildDist "nozip"
elsif (ARGV.size == 1 and ARGV[0] == "zip")
	buildDist "zip"
else
	puts "Usage:"
	puts "	ruby build.rb [zip]"
	puts "Example:"
	puts "	ruby build.rb"
	puts "	ruby build.rb zip"
	puts "(zip option does not work very well...)"
end
