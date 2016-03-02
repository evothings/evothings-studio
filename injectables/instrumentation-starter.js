hyper.log('instrumentation-starter loading...')
if (window.evo && window.evo.instrumentation)
{
	var mgr = window.evo.instrumentation
	//
	//
	if(window.evo.cordova)
	{
		mgr.addServiceProvider(window.evo.cordova)
	}
	else
	{
		hyper.log('* did not find cordova instrumentation *')
	}
	//
	//
	mgr.discoverServices()
	hyper.log("INJECTION ACTIVATED")
}
else
{
	hyper.log('ERROR: Could not find any evo instrumentation to start!!')
}