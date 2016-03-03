
hyper.log ('watcher intrumentation provider loading....')

var me = window.evo.watcher =
{
  services: [],
  subscriptions: [],
  name: 'watcher',
  icon: 'images/cogs.png',

  discover: function(callback)
            {
              var me = window.evo.watcher
              hyper.log('watcher.discover called')
              console.dir(me.services)


              //
              //------------------------------------------ Register all services
              //

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
                    hyper.log('* watcher.selectHierarchy called for path '+path+' typeof path = '+(typeof path))
                    var me = window.evo.watcher
                    var levels = path.split('.')
                    if(levels[0] == 'watcher')
                    {
                      hyper.log(JSON.stringify(me.services))
                      var rv = []
                      for(var pname in me.services)
                      {
                        var service = me.services[pname]
                        hyper.log('-- adding service '+pname)
                        hyper.log(JSON.stringify(service))
                        rv.push({name: 'watcher.'+service.name, selectable:false, dataType: 'stream'})
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
                 hyper.log('watcher.subscribeTo called for path '+path+' and interval '+interval)
                 var me = window.evo.watcher
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
                 hyper.log('watcher.unSubscribeTo called for sid '+sid)
                 var me = window.evo.watcher
                 var service = me.subscriptions[sid]
                 if(service)
                 {
                   service.unSubscribeTo(sid)
                   callback()
                 }
               }
}

me.discover()