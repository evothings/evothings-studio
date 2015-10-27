# This program pulls the latest commits for each sibling repo and itself, then builds with zip.
# If any pull is not fast-forward, this program aborts.

require 'fileutils'

require './helpers.rb'
require './sibling-repos.rb'

include FileUtils::Verbose

cwd = FileUtils.pwd
siblingRepos.each do |sr|
	path = '../'+sr.name
	next if(!Dir::exist?(path))
	chdir(path)
	sh 'git pull --ff-only'
end
chdir(cwd)

sh 'git pull --ff-only'

sh 'ruby build.rb zip'
