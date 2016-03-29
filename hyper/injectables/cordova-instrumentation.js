
hyper.log ('cordova intrumentation provider loading....')

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
					cb({value: accelObj, type: 'plot'})
				}, function(error)
				{
					cb()
				})
			},
			subscribeTo: function(path, params, interval, timeout, cb)
			{
				hyper.log('cordova.accelerometer.subscribeto called with interval '+interval)
				var start = Date.now()
				var sid = navigator.accelerometer.watchAcceleration(function(accelObj)
				{
					//hyper.log('acc getting data..')
					cb({name: 'accelerometer', value: accelObj, type: 'plot'})
					var diff = Date.now() - start
					if(diff > timeout)
					{
						navigator.accelerometer.clearWatch(sid)
						window.evo.instrumentation.unSubscribeToService(params.path, sid)
					}
				}, function(error)
				{
					console.log('cordova accelereomter error: '+error)
					cb()
				}, {frequency: parseInt(interval)})
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
			subscribeTo: function(path, params, interval, timeout, cb)
			{
				hyper.log('cordova.compass.subscribeto called with interval '+interval)
				var start = Date.now()
				var sid = navigator.compass.watchHeading(function(Obj)
				{
					cb({name: 'compass', value: Obj, type: 'plot'})
					var diff = Date.now() - start
					if(diff > timeout)
					{
						navigator.compass.clearWatch(sid)
						window.evo.instrumentation.unSubscribeToService(params.path, sid)
					}
				}, function(error)
				{
					cb()
				}, {frequency: parseInt(interval)})
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
				rv.push({name: 'cordova.'+service.name, selectable:false, dataType: 'stream'})
			}
			callback(rv)
		}
		else
		{
			callback([])
		}
	},

	subscribeTo: function(path, params, interval, timeout, callback)
	{
		hyper.log('cordova.subscribeTo called for path '+path+' and interval '+interval)
		var me = window.evo.cordova
		var serviceName = path.split('.')[1]
		var service = me.services[serviceName]
		params.path = path
		if(service)
		{
			var sid = service.subscribeTo(path, params, interval, timeout, callback)
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