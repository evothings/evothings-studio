#!/bin/bash
# Simple shell script to build and upload installers.
# This can only be used if you are on OSX and have s3cmd
# installed and configured with access keys.
 
# Default if not given on command line
VERSION=2.1.0-beta5

export NAME=evothings-studio

function usage {
        cat <<ENDOFHELP
Usage: $0 [version] [-ub]

  version   Default is $VERSION
  -b        Build
  -u        Upload to S3
  -h        Show this help.
ENDOFHELP
        exit 1;
}

# Read global options and shift them away
while getopts "ubh?" o; do
case "$o" in
   u) DOUPLOAD=true;;
   b) DOBUILD=true;;
   h) usage;;
   [?]) usage;;
   esac
done
shift $(($OPTIND - 1))

# Read arguments
VER=$1
if [ -z "$VER" ] ; then
  VER=$VERSION # default
fi
shift

if [ ! -z "$DOBUILD" ] ; then
  # Burn in build timestamp
  NOW=$(date)
  sed -i -e "s/main\.TIMESTAMP = '<timestamp>'/main\.TIMESTAMP = '$NOW'/g" ./app/main.js

  # Nuke old builds
  rm -rf dist/*
  # Build for all platforms
  npm run dist

  # Remove burn
  sed -i -e "s/main\.TIMESTAMP = '.*'/main\.TIMESTAMP = '<timestamp>'/g" ./app/main.js
fi

if [ ! -z "$DOUPLOAD" ] ; then
  # Upload debs
  s3cmd put dist/*.deb s3://evothings-download/
  s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.deb
  #s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-i386.deb

  # Upload (rename) Windows installer
  cp dist/win/Evothings\ Studio\ Setup\ $VER.exe /tmp/$NAME-$VER.exe
  s3cmd put /tmp/$NAME-$VER.exe s3://evothings-download/
  s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.exe
  rm /tmp/$NAME-$VER.exe

  # Upload (rename) OSX installer
  cp dist/osx/Evothings\ Studio-$VER.dmg /tmp/$NAME-$VER.dmg
  s3cmd put /tmp/$NAME-$VER.dmg s3://evothings-download/
  s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.dmg
  rm /tmp/$NAME-$VER.dmg

  # Get nice URLs out of it...
  echo PASTE INTO GITTER:
  echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.deb
  #echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER-i386.deb
  echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.exe
  echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.dmg
fi

echo "DONE"
