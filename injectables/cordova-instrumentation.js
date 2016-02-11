var evo = window.evo || {}
evo.instrumentation = evo.instrumentation || {}
console.log ('cordova intrumentation provider loading...')

function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return uuid;
}

var me = evo.instrumentation.cordova =
{
	services: [],
	subscriptions: [],

	discover: function()
	{
		var accelerometer =
		{
			name: 'accelerometer',
			getValue: function(cb)
			{
				return navigator.accelerometer.getCurrentAcceleration(function(accelObj)
				{
					cb(accelObj)
				}, function(error)
				{
					cb()
				})
			},
			subscribeTo: function(params, interval, cb)
			{
				return navigator.accelerometer.watchAcceleration(function(accelObj)
				{
					cb(accelObj)
				}, function(error)
				{
					cb()
				}, {frequency: interval})
			},
			unSubscribeTo: function(sid)
			{
				navigator.accelerometer.clearWatch(sid)
			}
		}
		//
		//------------------------------------------ Register all services
		//
		me.services.push(accelerometer)
		//
		//------------------------------------------
		//
		return me.services
	},
	subscribeTo: function(serviceName, params, interval, callback)
	{
		var service = me.services[serviceName]
		if(service)
		{
			var sid = service.subscribeTo(params, interval, callback)
			me.subscriptions[sid] = service
			return sid
		}
	},
	unSubscribeTo: function(sid)
	{
		var service = me.subscriptions[sid]
		if(service)
		{
			service.unSubscribeTo(sid)
		}
	}
}