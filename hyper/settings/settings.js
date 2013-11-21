// Settings for EvoStudio

// This is the number of directory levels that are
// scanned when monitoring file updates. The current
// project that is running is reloaded on all connected
// devices/browsers when a file is edited and saved.
// To scan files in the top-level directory only, set
// this value to 1. Default value is 3.
exports.NumberOfDirecoryLevelsToTraverse = 3

// Port numbers.
exports.WebServerPort = 4042
exports.SocketIoPort = 4043

// If this setting is true, the Hyper server will
// serve Cordova JS files for the correct platform,
// based on user-agent information in the request.
// Files served as in folder application/libs-cordova
// Supported platforms are Android and iOS.
// Set to false to turn this feature off. You then
// must ensure you include the correct Cordova JS
// files in your project.
exports.ServeCordovaJsFiles = true

// Font settings for the Workbench editors.
exports.WorkbenchFontFamily = 'monospace'
exports.WorkbenchFontSize = '18px'

// Settings for UDP server discovery.
exports.ServerDiscoveryEnabled = true
exports.ServerDiscoveryPort = 4088
