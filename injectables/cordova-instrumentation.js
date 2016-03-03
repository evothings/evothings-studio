
hyper.log ('cordova intrumentation provider loading....')

function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return uuid;
}

var me = window.evo.cordova =
{
	services: [],
	subscriptions: [],
	name: 'cordova',
	icon: 'images/cordova_256.png',

	discover: function(callback)
	{
		var me = window.evo.cordova
		hyper.log('cordova.discover called')
		console.dir(me.services)
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
				hyper.log('cordova.accelerometer.subscribeto called with interval '+interval)
				var sid = navigator.accelerometer.watchAcceleration(function(accelObj)
				{
					cb(accelObj)
				}, function(error)
				{
					cb()
				}, {frequency: interval})
				me.subscriptions[sid] = accelerometer
				return sid
			},
			unSubscribeTo: function(sid)
			{
				hyper.log('cordova.accelerometer.unsubscribeto called')
				navigator.accelerometer.clearWatch(sid)
			}
		}

		var compass =
		{
			name: 'compass',
			getValue: function(cb)
			{
				return navigator.compass.getCurrentHeading(function(Obj)
				{
					cb({value: Obj, type: 'plot'})
				}, function(error)
				{
					cb()
				})
			},
			subscribeTo: function(params, interval, cb)
			{
				hyper.log('cordova.compass.subscribeto called with interval '+interval)
				var sid = navigator.compass.watchHeading(function(Obj)
				{
					cb({value: Obj, type: 'plot'})
				}, function(error)
				{
					cb()
				}, {frequency: interval})
				me.subscriptions[sid] = accelerometer
				return sid
			},
			unSubscribeTo: function(sid)
			{
				hyper.log('cordova.accelerometer.unsubscribeto called')
				navigator.compass.clearWatch(sid)
			}
		}

		//
		//------------------------------------------ Register all services
		//
		me.services[accelerometer.name] = accelerometer
		me.services[compass.name] = compass
		//
		//------------------------------------------
		//
		if(callback)
		{
			callback(me.services)
		}
	},

	selectHierarchy:function(path, callback)
	{
		hyper.log('* cordova.selectHierarchy called for path '+path+' typeof path = '+(typeof path))
		var me = window.evo.cordova
		var levels = path.split('.')
		if(levels[0] == 'cordova')
		{
			hyper.log(JSON.stringify(me.services))
			var rv = []
			for(var pname in me.services)
			{
				var service = me.services[pname]
				hyper.log('-- adding service '+pname)
				hyper.log(JSON.stringify(service))
				rv.push({name: 'cordova.'+service.name, selectable:false})
			}
			callback(rv)
		}
		else
		{
			callback([])
		}
	},

	subscribeTo: function(path, params, interval, callback)
	{
		hyper.log('cordova.subscribeTo called for path '+path+' and interval '+interval)
		var me = window.evo.cordova
		var serviceName = path.split('.')[1]
		var service = me.services[serviceName]
		if(service)
		{
			var sid = service.subscribeTo(params, interval, callback)
			hyper.log('saving subscription '+sid+' in '+me.subscriptions)
			me.subscriptions[sid] = service
			return sid
		}
	},
	unSubscribeTo: function(sid, callback)
	{
		hyper.log('cordova.unSubscribeTo called for sid '+sid)
		var me = window.evo.cordova
		var service = me.subscriptions[sid]
		if(service)
		{
			service.unSubscribeTo(sid)
			callback()
		}
	}
}

me.discover()