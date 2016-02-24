
hyper.log ('bluetooth intrumentation provider loading....')

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

var me = window.evo.bluetooth =
{
    services: [],
    subscriptions: [],
    devices: [],
    name: 'bluetooth',
    icon: 'images/bt.png',

    discover: function(callback)
    {
        var me = window.evo.bluetooth
        hyper.log('bluetooth.discover called')

        var characteristic =
        {
            name: 'characteristic',

            subscribeTo: function(params, interval, cb)
            {
                hyper.log('bluetooth.characteristic.subscribeto called with interval '+interval)
                var sid =
                me.subscriptions[sid] = characteristic
            },
            unSubscribeTo: function(sid)
            {
                hyper.log('bluetooth.characteristic.unsubscribeto called')

            }
        }

        //
        //------------------------------------------ Register all services
        //
        me.services[characteristic.name] = characteristic
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
        hyper.log('* bluetooth.selectHierarchy called for path '+path+' typeof path = '+(typeof path))
        var me = window.evo.bluetooth
        var levels = path.split('.')
        hyper.log('** levels[0] == '+levels[0])
        if(levels[0] == 'bluetooth')
        {
            if(levels.length == 1)
            {
                evothings.ble.startScan(
                    function(device)
                    {
                        // Report success. Sometimes an RSSI of +127 is reported.
                        // We filter out these values here.
                        if (device.rssi <= 0 && !me.devices[device.address])
                        {
                            me.devices[device.address] = device
                            //{"address":"C3:EE:68:01:33:62","rssi":-77,"name":"estimote","scanRecord":"AgEGGv9MAAIVuUB/MPX4Rm6v+SVVa1f+bTNiaAG2CQllc3RpbW90ZQ4WChhiMwFo7sO2YjMBaAAAAAAAAAA="}
                            var name = device.name ? device.name + '['+device.address + ']' : device.address
                            callback([{name: 'bluetooth.'+name, selectable: true}])
                        }
                    },
                    function(errorCode)
                    {
                        hyper.log('bluetooth scan error: '+errorCode)
                    }
                )
            }
            else if(levels.length == 2)
            {
                var device = levels[1]
                // device selected
                hyper.log('bluetooth device '+device+' selected')

            }
        }
        else
        {
            callback([])
        }
    },

    subscribeTo: function(path, params, interval, callback)
    {
        hyper.log('bluetooth.subscribeTo called for path '+path+' and interval '+interval)
        var me = window.evo.bluetooth
        var serviceName = path.split('.')[1]
        console.log('serviceName = '+serviceName)
        var service = me.services[serviceName]
        if(service)
        {
            var sid = service.subscribeTo(params, interval, callback)
            console.log('saving subscription '+sid+' in '+me.subscriptions)
            me.subscriptions[sid] = service
            return sid
        }
    },
    unSubscribeTo: function(sid)
    {
        hyper.log('bluetooth.unSubscribeTo called for sid '+sid)
        var me = window.evo.bluetooth
        var service = me.subscriptions[sid]
        if(service)
        {
            service.unSubscribeTo(sid)
        }
    }
}

me.discover()