hyper.log('instrumentation-starter loading...')
if (window.evo && window.evo.instrumentation)
{
	var mgr = window.evo.instrumentation
	//
	//
	/*
	if(window.evo.cordova)
	{
		mgr.addServiceProvider(window.evo.cordova)
	}
	*/
	if(window.evo.bluetooth)
	{
		mgr.addServiceProvider(window.evo.bluetooth)
	}
	if(window.evo.watcher)
	{
		mgr.addServiceProvider(window.evo.watcher)
	}
	//
	window._instrumentation = true
	hyper.log("INJECTION ACTIVATED")
}
else
{
	hyper.log('ERROR: Could not find any evo instrumentation to start!!')
}