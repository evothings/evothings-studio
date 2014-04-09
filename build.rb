# Build a distribution package of Evothings Studio.
# Author: Mikael Kindborg

require "fileutils"
require "pathname"

FileUtils.copy_entry(
	"../HyperReload/hyper/build/buildHyper.rb",
	"./buildHyper.rb")

load("buildHyper.rb")
