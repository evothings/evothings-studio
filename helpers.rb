require 'uri'

if(RUBY_PLATFORM =~ /linux/)
	HOST = :linux
elsif(RUBY_PLATFORM =~ /win32/)
	HOST = :win32
elsif(RUBY_PLATFORM =~ /mingw32/)
	HOST = :win32
elsif(RUBY_PLATFORM =~ /darwin/)
	HOST = :darwin
else
	raise "Unknown platform: #{RUBY_PLATFORM}"
end

def sh(cmd)
	# Print the command to stdout.
	if(cmd.is_a?(Array))
		p cmd
	else
		puts cmd
	end
	if(HOST == :win32 or HOST == :linux)
		success = system(cmd)
		raise "Command failed" unless(success)
	else
		# Open a process.
		#IO::popen(cmd + " 2>&1") do |io|
		IO::popen(cmd) do |io|
			# Pipe the process's output to our stdout.
			while !io.eof?
				line = io.gets
				puts line
			end
			# Check the return code
			exitCode = Process::waitpid2(io.pid)[1].exitstatus
			if(exitCode != 0)
				raise "Command failed, code #{exitCode}"
			end
		end
	end
end

def clone(name, url = nil)
	path = '../'+name
	return if(Dir::exist?(path))
	if(!url)
		url = 'https://github.com/evothings/'+name
	end
	sh("git clone #{url} \"#{path}\"")
end

module TGZ
	Ending = '.tar.gz'
	def self.unpack(filename, container, target)
		sh("tar -xzf \"#{filename}\" -C\"#{container}\"")
	end
end

module ZIP
	Ending = '.zip'
	def self.unpack(filename, container, target)
		sh("unzip -o -q \"#{filename}\" -d \"#{container}\"")
	end
end

def fetchAndUnpack(pack, url, container, target)
	return if(Dir::exist?(container+'/'+target))
	mkdir_p(container)
	filename = 'downloads/'+File.basename(URI.parse(url).path)
	sh("wget --no-check-certificate -c \"#{url}\" -Pdownloads")
	pack.unpack(filename, container, target)
	raise hell if(!Dir::exist?(container+'/'+target))
end

def lastPathSegment(path)
	path[path.rindex('/')+1 .. -1]
end

def fetch(url, container)
	target = lastPathSegment(url)
	return if(File.exist?(container+'/'+target))
	mkdir_p container
	sh("wget --no-check-certificate -c \"#{url}\" -P\"#{container}\"")
end

def fetchAndUnzipSingleFile(url, container, source)
	target = lastPathSegment(source)
	return if(File.exist?(container+'/'+target))
	mkdir_p container
	sh("wget --no-check-certificate -c \"#{url}\" -Pdownloads")
	zipname = 'downloads/'+lastPathSegment(url)
	sh("unzip -o -q \"#{zipname}\" \"#{source}\" -d downloads")
	mv('downloads/'+source, container+'/'+target)
end

# create a symbolic link pointing to target.
def mklink(name, target)
	return if(File.exist?(name))

	if(HOST == :win32)
		# Weird: mklink doesn't work on its own, but it works when wrapped in cmd /C.
		# Perhaps it is not an executable but rather a built-in command in cmd.exe.
		sh("cmd /C mklink /J \"#{name}\" \"#{target}\"")
	else
		# expand_path because link targets are not relative to the Current Working Directory
		# at the time of link creation (as they are on windows), but rather
		# relative to the link itself.
		sh("ln -s \"#{File.expand_path(target)}\" \"#{name}\"")
	end
end
