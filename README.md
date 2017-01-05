# Evothings Studio
Evothings Studio is a tool for development of IoT enabled mobile apps in HTML5/JavaScript.

## Download
You are most welcome to visit [Evothings.com](https://evothings.com) to learn more and to [download](https://evothings.com/download) the latest version. You will find tutorials, videos, documentation and a forum to help you develop mobile applications for IoT in JavaScript.

It is easy to get started! And we are online at [gitter.im/evothings/evothings](https://gitter.im/evothings/evothings) to help out.

## Building and running from source
Evothings Studio is an [Electron](http://electron.atom.io) application and can be easily built for Windows, OSX and Linux. We use [electron-builder](https://github.com/electron-userland/electron-builder) to produce our installers.

1. Get required tools:
 * Make sure you have [NodeJS](https://nodejs.org/en/download/) installed which includes npm.
   - Ubuntu 14.04 LTS: The regular nodejs is too old, [use this instead](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions). Also make sure you have git and unzip, get them with `sudo apt-get install git unzip`.
 * Make sure you have rpmbuild (for building Linux), on OSX it can be installed view Homebrew (brew install rpm).

2. Clone this repository and enter it `git clone https://github.com/evothings/evothings-studio.git && cd evothings-studio`.

3. Run `npm install` to get all needed npm dependencies for development and building.

4. Run `npm install app` to get all needed npm dependencies for the application itself.

5. Run the studio using `npm start`.

6. On OSX (with several extra required tools installed) you can build all installers using `./build.sh -a`, you will find them in the `dist` directory. For Evothings employees: The `-u` option will also upload them to S3 if you have proper keys. :)


## Info
Evothings Studio is based on [HyperReload](https://github.com/divineprog/HyperReload).

[Evothings](http://evothings.com) are a seasoned bunch of developers who enjoy connecting phones to other things. We love to improve, refurbish, evolve and augment buildings, vehicles and gadgets, and make them smarter.