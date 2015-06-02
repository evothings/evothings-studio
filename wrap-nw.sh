#!/bin/bash

# This script enables running node-webkit on newer distros that don't have libudev.so.0.

# First, find out where we are.
MYAPP_WRAPPER="`readlink -f "$0"`"
HERE="`dirname "$MYAPP_WRAPPER"`"

# If we don't already have a local symlink...
if [ ! -h "$HERE/libudev.so.0" ]
then
	# Search these paths to find the new version of libudev.
	paths=(
		"/lib/x86_64-linux-gnu/libudev.so.1" # Ubuntu, Xubuntu, Mint
		"/usr/lib64/libudev.so.1" # SUSE, Fedora
		"/usr/lib/libudev.so.1" # Arch, Fedora 32bit
		"/lib/i386-linux-gnu/libudev.so.1" # Ubuntu 32bit
	)
	for i in "${paths[@]}"
	do
		# The first one found is the target of the local symlink.
		if [ -f $i ]
		then
			# Any existing file is overwritten.
			ln -sf "$i" "$HERE/libudev.so.0"
			break
		fi
	done
fi

# Always use our local versions of libs.
# This also makes RPMs find our library symlinks.
export LD_LIBRARY_PATH=$([ -n "$LD_LIBRARY_PATH" ] && echo "$HERE:$HERE/lib:$LD_LIBRARY_PATH" || echo "$HERE:$HERE/lib")

# Finally, run node-webkit.
exec -a "$0" "$HERE/nw"  "$@"
