# This program pulls the latest commits for each sibling repo and itself, then builds with zip.
# If any pull is not fast-forward, this program aborts.

require 'fileutils'

require './helpers.rb'
require './sibling-repos.rb'

include FileUtils::Verbose

# Override function "clone" from helpers.rb
def clone(name, url=nil)
	path = '../'+name
	return if(!Dir::exist?(path))
	chdir(path)
	sh 'git pull --ff-only'
end

cwd = FileUtils.pwd
doSiblingRepos
chdir(cwd)

sh 'git pull --ff-only'

sh 'ruby build.rb zip'
