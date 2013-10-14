# Bult a distribution of EvoStudio from HyperReload sources.
# Author: Mikael Kindborg

require "fileutils"
require "pathname"


######################################################
#                VARIABLES AND PATHS                 #
######################################################

$VersionString = "NO_VERSION"

def version
	$VersionString
end

def pathDist
	"../EvoStudio " + version + "/"
end

def pathHyper
	"../HyperReload/UI/"
end

######################################################
#                  BUILD FUNCTIONS                   #
######################################################

def buildCreateDistDir
	fileDelete(pathDist)
end

def buildCopyHyperToDistDir
  puts "Copying Hyper to dist dir"
  FileUtils.copy_entry(pathHyper, pathDist)
  #FileUtils.cp_r(pathHyper, pathDist)
end

# Replace "HyperReload" with "EvoStudio" in selected files.
def buildEvothingifyHyperDist
	puts "EvoThingifying dist"

	# Relplace "HyperReload" with "EvoStudio" in selected files.
	fileEvothingify(pathDist + "application/hyper-workbench.html")
	fileEvothingify(pathDist + "documentation/hyper-documentation.html")

	# Delete files that should not be included in the package.
	fileDelete(pathDist + "package-template.json")
	fileDelete(pathDist + "package.json")

	# Create package.json for this version.
	content = fileReadContent("package-template.json")
	content = content.gsub("__VERSION__", version)
	fileSaveContent(pathDist + "package.json", content)
end

# Build distribution package.
def buildDist
	puts "Building EvoStudion version " + version
	buildCreateDistDir
	buildCopyHyperToDistDir
	buildEvothingifyHyperDist
	puts "Build done"
end

######################################################
#                    FILE HELPERS                    #
######################################################

def fileReadContent(filePath)
	# File.open(filePath, "rb") { |f| f.read.force_encoding("UTF-8") }
	File.open(filePath, "rb") { |f| f.read }
end

def fileSaveContent(destFile, content)
	File.open(destFile, "wb") { |f| f.write(content) }
end

def fileDelete(path)
	if File.exists? path then
		FileUtils.remove_entry(path)
	end
end

def fileSubstString(path, fromString, toString)
	content = fileReadContent(path)
	content = content.gsub(fromString, toString)
	fileSaveContent(path, content)
end

def fileEvothingify(path)
	fileSubstString(path, "HyperReload", "EvoStudio")
end

######################################################
#                COMMAND LINE OPTIONS                #
######################################################

if (ARGV.size == 1)
	$VersionString = ARGV[0]
	buildDist
else
	puts "Usage:"
	puts "  ruby build.rb <version>"
	puts "Example:"
	puts "  ruby build.rb 0.1.0"
end
