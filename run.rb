#!/usr/bin/ruby

require './helpers.rb'

# Load EvoThingsStudio settings into a namespace where they won't conflict with our globals.
module ETS
	module Foo
		eval(File.read('./buildPlugin.rb'))
	end
	extend Foo
	#p ETS.methods
end

def nodeWebKitPlatform
	if(HOST == :win32)
		# This method is unsafe. It may be overridden by user and it fails silently.
		if(ENV['PROGRAMW6432'])
			return 'win-x64'
		else
			return 'win-ia32'
		end
	elsif(HOST == :linux)
		lb = `getconf LONG_BIT`
		if(lb == 64)
			return 'linux-x64'
		elsif(lb == 32)
			return 'linux-ia32'
		else
			raise "Could not find architecture (lb=#{lb})"
		end
	elsif(HOST == :darwin)
		return 'osx-x64'
	else
		raise "Unsupported HOST: #{HOST}"
	end
end

def nodeWebKitExecutable
	if(HOST == :win32)
		return 'nw.exe'
	elsif(HOST == :linux)
		return 'nw'
	elsif(HOST == :darwin)
		return 'node-webkit.app/Contents/MacOS/node-webkit'
	else
		raise "Unsupported HOST: #{HOST}"
	end
end

sh "../node-webkit-bin-#{ETS.nodeWebKitVersion}/node-webkit-v#{ETS.nodeWebKitVersion}-#{nodeWebKitPlatform}/#{nodeWebKitExecutable} ."
