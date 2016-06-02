# Simple shell script to build and upload installers.
# This can only be used if you are on OSX and have s3cmd
# installed and configured with access keys.
 
NAME=evothings-studio
VER=2.1.0-beta3

# Nuke old builds
rm -rf dist/*
# Build for all platforms
npm run dist

# Upload debs
s3cmd put dist/*.deb s3://evothings-download/
s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-amd64.deb
s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER-i386.deb

# Upload (rename) Windows installer
cp dist/win/Evothings\ Studio\ Setup\ $VER.exe /tmp/$NAME-$VER.exe
s3cmd put /tmp/$NAME-$VER.exe s3://evothings-download/
s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.exe
rm /tmp/$NAME-$VER.exe

# Upload (rename) OSX installer
cp dist/Evothings\ Studio-darwin-x64/Evothings\ Studio-$VER.dmg /tmp/$NAME-$VER.dmg
s3cmd put /tmp/$NAME-$VER.dmg s3://evothings-download/
s3cmd setacl --acl-public s3://evothings-download/$NAME-$VER.dmg
rm /tmp/$NAME-$VER.dmg

# Get nice URLs out of it...
echo PASTE INTO GITTER:
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER-amd64.deb
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER-i386.deb
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.exe
echo https://s3-eu-west-1.amazonaws.com/evothings-download/$NAME-$VER.dmg
