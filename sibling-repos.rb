SiblingRepo = Struct.new(:name, :url)

def siblingRepos
	[
		SiblingRepo.new('evothings-client'),
		SiblingRepo.new('evothings-doc'),
		SiblingRepo.new('evothings-examples'),
		SiblingRepo.new('cordova-plugin-ibeacon', 'https://github.com/petermetz/cordova-plugin-ibeacon'),
		SiblingRepo.new('cordova-ble'),
	]
end
