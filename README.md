# Evothings Studio

Evothings Studio is a tool for development of IoT enabled mobile apps in HTML5/JavaScript.

## Download the latest stable version

You are most welcome to visit [evothings.com](http://evothings.com) to learn more and to download the latest stable version. You will find tutorials, videos, documentation and a forum to help you develop mobile applications for IoT in JavaScript. It is easy to get started!

## Building from source

If you wish to build Evothings Studio you need either Linux or OSX. Linux builds Linux32, Linux64 and Windows, but you need an OSX machine to also build for Mac.

## OSX

Easiest is to begin with installing Homebrew (http://brew.sh):

    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

Then install prerequisites:

    brew install wget nodejs

Install node module flatten-packages:

    npm install -g flatten-packages

Then proceed below under heading Build.

## Debian/Ubuntu Linux

Install nodejs, ruby, git, wget:

    sudo apt-get install nodejs ruby git wget

Install node module flatten-packages:

    sudo npm install -g flatten-packages

## Building

Clone this repository:

    git clone git@github.com:evothings/evothings-studio.git

Run init.rb before first build, this will download required repositories:

    ruby init.rb

Build only with:

    ruby build.rb

Update dependent repos, build and zip packages in one step:

    ruby build-latest.rb

Built packages are created in a folder named "EvothingsStudio_VERSIONNUMBER", where VERSIONNUMBER is the version number given in file buildPlugin.rb.

## Info

Evothings Studio is based on [HyperReload](https://github.com/divineprog/HyperReload).

[Evothings](http://evothings.com) are a seasoned bunch of developers who enjoy connecting phones to other things. We love to improve, refurbish, evolve and augment buildings, vehicles and gadgets, and make them smarter.
