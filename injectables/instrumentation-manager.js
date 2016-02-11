var evo = window.evo || {}
console.log ('intrumentation loading...')
function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return uuid;
}
var me = evo.instrumentation =
{

	services: [],
	serviceProviders: [],

	listServices: function()
	{
		return me.services
	},

	addServiceProvider: function(serviceProvider)
	{
		me.serviceProviders[serviceProvider.name] = serviceProvider
	},

	discoverServices: function()
	{
		me.serviceProviders.forEach(function(sp)
		{
			sp.discover(function(services)
			{
				var serviceProviders = me.services[sp.name] || []
				serviceProviders =serviceProviders.concat(services)
				me.services[sp.name] = serviceProviders
			})
		})
	},

	subscribeToService: function(serviceProviderName, serviceName, params, interval, callback)
	{
		var serviceProvider = me.serviceProviders[serviceProviderName]
		return serviceProvider.subscribeTo(serviceName, params, interval, callback)
	},

	unSubscribeToService: function(subscriptionId)
	{
		var serviceProvider = me.serviceProviders[serviceProviderName]
		serviceProvider.unSubscribeTo(subscriptionId)
	}
}