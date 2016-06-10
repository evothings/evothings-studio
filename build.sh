#!/bin/bash
# Simple shell script to build and upload installers.
# This can only be used if you are on OSX and have s3cmd
# installed and configured with access keys.

# Extract VERSION from app/main.js
MAJOR=$(sed -n '/^main\.MAJOR.*=.*/p' app/main.js | cut -d' ' -f 3)
MINOR=$(sed -n '/^main\.MINOR.*=.*/p' app/main.js | cut -d' ' -f 3)
PATCH=$(sed -n '/^main\.PATCH.*=.*/p' app/main.js | cut -d' ' -f 3)
BUILD=$(sed -n '/^main\.BUILD.*=.*/p' app/main.js | cut -d"\"" -f 2)
if [ ! -z "$BUILD" ] ; then
  VERSION=$MAJOR.$MINOR.$PATCH-$BUILD
else
  VERSION=$MAJOR.$MINOR.$PATCH
fi

export NAME=evothings-studio

# Default is all three, empty
PLATFORM=

function usage {
        cat <<ENDOFHELP
Usage: $0 [-wolauh?]
  -w        Build Windows
  -o        Build OSX
  -l        Build Linux
  -a        Build all
  -u        Upload to S3
  -h -?     Show this help.
ENDOFHELP
  exit 1;
}

# No arguments
if [ -z "$1" ] ; then
  usage
  exit 1
fi

# Read global options and shift them away
while getopts "wolauh?" o; do
case "$o" in
   w)
    DOBUILD=true
    PLATFORM=win;;
   o)
    DOBUILD=true
    PLATFORM=osx;;
   l)
    DOBUILD=true
    PLATFORM=linux;;
   u) DOUPLOAD=true;;
   a) DOBUILD=true;;
   h) usage;;
   [?]) usage;;
   esac
done
#shift $(($OPTIND - 1))

if [ ! -z "$DOBUILD" ] ; then
  echo "Building version $VERSION ..."
  # Burn in build timestamp
  NOW=$(date)
  sed -i '' -e "s/main\.TIMESTAMP = '<timestamp>'/main\.TIMESTAMP = '$NOW'/g" ./app/main.js

  # Nuke old builds
  rm -rf dist/*

  # Build for one or all platforms
  if [ -z "$PLATFORM" ] ; then
    npm run dist
  else
    npm run dist:$PLATFORM
  fi

  # Remove burn
  sed -i '' -e "s/main\.TIMESTAMP = '.*'/main\.TIMESTAMP = '<timestamp>'/g" ./app/main.js
fi

if [ ! -z "$DOUPLOAD" ] ; then
  echo PASTE INTO GITTER:
  if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "linux" ] ; then
    # Upload debs
    s3cmd put dist/*.deb s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.deb
    #s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-i386.deb
    echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.deb
  fi

  if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "win" ] ; then
    # Upload (rename) Windows installer
    cp dist/win/Evothings\ Studio\ Setup\ $VER.exe /tmp/$NAME-$VER.exe
    s3cmd put /tmp/$NAME-$VER.exe s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.exe
    rm /tmp/$NAME-$VER.exe
    echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.exe
  fi

  if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "osx" ] ; then
    # Upload (rename) OSX installer
    cp dist/osx/Evothings\ Studio-$VER.dmg /tmp/$NAME-$VER.dmg
    s3cmd put /tmp/$NAME-$VER.dmg s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.dmg
    rm /tmp/$NAME-$VER.dmg
    echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.dmg
  fi
fi

echo "DONE"
