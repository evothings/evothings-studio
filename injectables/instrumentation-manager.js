if(!window.evo)
{
	window.evo = {}
}

hyper.log ('intrumentation manager loading...')
function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return uuid;
}
var me = window.evo.instrumentation =
{

	services: [],
	serviceProviders: [],

	listServices: function()
	{
		hyper.log('inst.listServices called. socket is '+window.hyper.IoSocket+', sendMessageToServer is '+window.hyper.sendMessageToServer)
		var services = []
		for(var spname in me.services)
		{
			var slist = me.services[spname] || []
			if(!slist.length)
			{
				slist = [slist]
			}
			console.log('listServices finding services for '+spname+' -> '+slist)
			hyper.log(JSON.stringify(slist))
			slist.forEach(function(service)
			{
				service.providerName = spname
				services.push(service)
			})
		}
		window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, services: services})
	},

	addServiceProvider: function(serviceProvider)
	{
		hyper.log('inst.addServiceProvider called for '+serviceProvider.name)
		me.serviceProviders[serviceProvider.name] = serviceProvider
	},

	discoverServices: function()
	{
		hyper.log('inst.discoverServices called')
		for(var p in me.serviceProviders)
		{
			var sp = me.serviceProviders[p]
			hyper.log('discovering services on provider '+sp.name)
			sp.discover(function(services)
			{
				hyper.log('discovered '+services.length+' services on '+sp.name)
				hyper.log(JSON.stringify(services))
				var slist = me.services[sp.name] || []
				slist = slist.concat(services)
				me.services[sp.name] = slist
				hyper.log('services are now')
				hyper.log(JSON.stringify(me.services))
			})
		}
	},

	subscribeToService: function(serviceProviderName, serviceName, params, interval)
	{
		var serviceProvider = me.serviceProviders[serviceProviderName]
		return serviceProvider.subscribeTo(serviceName, params, interval, function(data)
		{
			window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, serviceData: {provider: providerName, service: servicename, data: data} })
		})
	},

	unSubscribeToService: function(subscriptionId)
	{
		var serviceProvider = me.serviceProviders[serviceProviderName]
		serviceProvider.unSubscribeTo(subscriptionId)
	}
}