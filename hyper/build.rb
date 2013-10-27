# Build a distribution package of EvoStudio.
# Author: Mikael Kindborg

require "fileutils"
require "pathname"

def startBuild
	FileUtils.copy_entry(
		"../../HyperOpen/buildHyper.rb",
		"./buildHyper.rb")

	load("buildHyper.rb")
end

startBuild
