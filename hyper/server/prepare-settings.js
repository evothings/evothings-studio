/*
File: prepare-settings.js
Description: Make sure settings file exists.
Author: Mikael Kindborg

License:

Copyright (c) 2013 Mikael Kindborg

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var FS = require('fs')

var mSettingsFile = './hyper/settings/settings.js'
var mSettingsTemplateFile = './hyper/settings/settings-template.js'

// Create settings file from template if it does not exist.
if (!FS.existsSync(mSettingsFile))
{
	FS.writeFileSync(
		mSettingsFile,
		FS.readFileSync(
			mSettingsTemplateFile,
			{encoding: 'utf8'}
		),
		{encoding: 'utf8'}
	)
}



