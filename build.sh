#!/bin/bash
# Simple shell script to build and upload installers.
# This can only be used if you are on OSX and have s3cmd
# installed and configured with access keys.

# Extract VERSION from app/main.js
MAJOR=$(sed -n '/^main\.MAJOR =.*/p' app/main.js | cut -d' ' -f 3)
MINOR=$(sed -n '/^main\.MINOR =.*/p' app/main.js | cut -d' ' -f 3)
PATCH=$(sed -n '/^main\.PATCH =.*/p' app/main.js | cut -d' ' -f 3)
BUILD=$(sed -n '/^main\.BUILD =.*/p' app/main.js | cut -d"\"" -f 2)
if [ ! -z "$BUILD" ] ; then
  VER=$MAJOR.$MINOR.$PATCH-$BUILD
else
  VER=$MAJOR.$MINOR.$PATCH
fi

export NAME=evothings-studio

# Default is all three, empty
PLATFORM=

function usage {
        cat <<ENDOFHELP
Usage: $0 [-wvolauh?]
  -w        Build Windows
  -v        Build Windows32
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
while getopts "wvolauh?" o; do
case "$o" in
   w)
    DOBUILD=true
    PLATFORM=win;;
   v)
    DOBUILD=true
    PLATFORM=win32;;
   o)
    DOBUILD=true
    PLATFORM=mac;;
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
  echo "Building version $VER ..."
  # Burn in build timestamp
  NOW=$(date)
  sed -i '' -e "s/main\.TIMESTAMP = '<timestamp>'/main\.TIMESTAMP = '$NOW'/g" ./app/main.js

  # Nuke old builds
  rm -rf dist/*
fi


if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "linux" ] ; then
  npm run dist:linux
  if [ ! -z "$DOUPLOAD" ] ; then
    # Upload deb, rpm, AppImage
    s3cmd put dist/*.deb s3://evothings-download/
    s3cmd put dist/*.rpm s3://evothings-download/
    s3cmd put dist/*.AppImage s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-amd64.deb
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.rpm
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-x86_64.AppImage
  fi
fi

if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "win" ] ; then
  npm run dist:win
  if [ ! -z "$DOUPLOAD" ] ; then
    # Upload (rename) Windows Squirrel and NSIS installer
    cp dist/win/Evothings\ Studio\ Setup\ $VER.exe /tmp/$NAME-$VER.exe
    s3cmd put /tmp/$NAME-$VER.exe s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.exe
    rm /tmp/$NAME-$VER.exe
    cp dist/Evothings\ Studio\ Setup\ $VER.exe /tmp/$NAME-$VER-nsis.exe
    s3cmd put /tmp/$NAME-$VER-nsis.exe s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-nsis.exe
    rm /tmp/$NAME-$VER-nsis.exe
  fi
fi

if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "win32" ] ; then
  npm run dist:win32
  if [ ! -z "$DOUPLOAD" ] ; then
    # Upload (rename) Windows installer
    cp dist/win-ia32/Evothings\ Studio\ Setup\ $VER-ia32.exe /tmp/$NAME-$VER-ia32.exe
    s3cmd put /tmp/$NAME-$VER-ia32.exe s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-ia32.exe
    rm /tmp/$NAME-$VER-ia32.exe
  fi
fi

if [ -z "$PLATFORM" ] || [ "$PLATFORM" == "mac" ] ; then
  npm run dist:mac
  if [ ! -z "$DOUPLOAD" ] ; then
    # Upload (rename) OSX installer
    cp dist/mac/Evothings\ Studio-$VER.dmg /tmp/$NAME-$VER.dmg
    s3cmd put /tmp/$NAME-$VER.dmg s3://evothings-download/
    s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.dmg
    rm /tmp/$NAME-$VER.dmg
  fi
fi

# Remove burn
sed -i '' -e "s/main\.TIMESTAMP = '.*'/main\.TIMESTAMP = '<timestamp>'/g" ./app/main.js

echo PASTE INTO GITTER:
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER-amd64.deb
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.rpm
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.AppImage
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.dmg
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.exe
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER-nsis.exe
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER-ia32.exe

echo "DONE"
