if (window.evo && window.evo.instrumentation)
{
	var mgr = window.evo.instrumentation
	//
	//
	if(window.evo.instrumentation.cordova)
	{
		mgr.addServiceProvider(window.evo.instrumentation.cordova)
	}
	//
	//
	mgr.discoverServices()
}
else
{
	console.log('ERROR: Could not find any evo instrumentation to start!!')
}