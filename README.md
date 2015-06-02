# Evothings Studio

Evothings Studio is a tool for development of IoT enabled mobile apps in HTML5/JavaScript.

## Download the latest stable version

You are most welcome to visit [evothings.com](http://evothings.com) to learn more and to download the latest stable version. You will find tutorials, videos, documentation and a forum to help you develop mobile applications for IoT in JavaScript. It is easy to get started!

## Building from source

If you wish to build Evothings Studio, here is an overview of the steps required.

Software needed:

* Node.js
* Ruby
* Git
* Apache Cordova
* TODO: Add additional prerequisites

Install node module "flatten-packages" if not installed. On Windows:

    npm install -g flatten-packages

On Linux or OS X:

    sudo npm install -g flatten-packages

Run init.rb before first build, this will download required repositories:

    ruby init.rb

Build with:

    ruby build.rb

Built packages are created in a folder named "EvothingsStudio_VERSIONNUMBER", where VERSIONNUMBER is the version number given in file buildPlugin.rb.

## Info

Evothings Studio is based on [HyperReload](https://github.com/divineprog/HyperReload).

[Evothings](http://evothings.com) are a seasoned bunch of developers who enjoy connecting phones to other things. We love to improve, refurbish, evolve and augment buildings, vehicles and gadgets, and make them smarter.
