def doSiblingRepos
	clone('evothings-client')
	clone('evothings-doc')
	clone('evothings-examples')
	clone('cordova-plugin-ibeacon', 'https://github.com/petermetz/cordova-plugin-ibeacon')
	#cordova-http-digest	# no ios version yet
	clone('cordova-ble')
end
