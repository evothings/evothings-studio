# Evothings Studio
Evothings Studio is a tool for development of IoT enabled mobile apps in HTML5/JavaScript.

## Download
You are most welcome to visit [Evothings.com](https://evothings.com) to learn more and to [download](https://evothings.com/download) the latest stable version, or our [beta-version](https://evothings.com/download/#beta) of the upcoming release, or perhaps even a [helmet-on-alpha-version](https://evothings.com/download/#alpha). You will find tutorials, videos, documentation and a forum to help you develop mobile applications for IoT in JavaScript. It is easy to get started!

## Running from source
It's easy, get all dependencies first with `npm run install` and then start it with `npm start`.

## Building from source
Evothings Studio is an [Electron](http://electron.atom.io) application and can be easily built for both Windows, OSX and Linux. We use [electron-builder](https://github.com/electron-userland/electron-builder) to produce our installers.
If you wish to build Evothings Studio, here is an overview of the steps required.

0. 

1. Get required tools:
 * Make sure you have [NodeJS](https://nodejs.org/en/download/) installed which includes npm.
   - Ubuntu 14.04 LTS: The regular nodejs is too old, [use this instead](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions). Also make sure you have git and unzip, get them with `sudo apt-get install git unzip`.
 * Make sure you have rpmbuild (for building Linux), on OSX it can be installed view Homebrew (brew install rpm).

2. Clone this repository and enter it `git clone git@github.com:evothings/evothings-studio.git && cd evothings-studio`.

3. Run `npm run libs` to download all needed js libraries that are not npm modules, it also clones a few extra repositories in `..`.

4. Run `npm run devdeps` to get all needed npm dependencies for development and building.

5. Run `npm run deps` to get all needed npm dependencies for the application itself.

6. Build installers `npm run dist`, you will find them in the `dist` directory.


## Info

Evothings Studio is based on [HyperReload](https://github.com/divineprog/HyperReload).

[Evothings](http://evothings.com) are a seasoned bunch of developers who enjoy connecting phones to other things. We love to improve, refurbish, evolve and augment buildings, vehicles and gadgets, and make them smarter.
