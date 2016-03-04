
hyper.log ('watcher intrumentation provider loading....')

var generateUUID = function()
{
  var d = new Date().getTime()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function(c)
    {
      var r = (d + Math.random()*16)%16 | 0
      d = Math.floor(d/16)
      return (c=='x' ? r : (r&0x3|0x8)).toString(16)
    })
}

var me = window.evo.watcher =
{
  watches: [],
  watchesShowing: false,
  subscriptions: [],
  name: 'watch',
  icon: 'images/cogs.png',

  getWatchFromUUID: function(uuid)
  {
    var me = window.evo.watcher
    var rv = undefined
    for(var _uuid in me.watches)
    {
      if(_uuid == uuid)
      {
        rv = me.watches[uuid]
        break
      }
    }
    return rv
  },

  getWatchFromName: function(name)
                    {
                      var me = window.evo.watcher
                      var rv = undefined
                      for(var _uuid in me.watches)
                      {
                        var watch = me.watches[_uuid]
                        if(watch.name == name)
                        {
                          rv = watch
                          break
                        }
                      }
                      return rv
                    },

  watch: function(name, object, property, type)
         {
           var me = window.evo.watcher
           uuid = generateUUID()
           me.watches[uuid] = {name: name, object: object, property: property, type: type}
           if(me.watchesShowing)
           {
             var rv = [{name: 'watch.watches.'+name, selectable: false}]
             window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, hierarchySelection:  rv })
           }
           return uuid
         },

  unwatch: function(uuid)
           {
             var me = window.evo.watcher
             if(me.watches[uuid])
             {
               delete me.watches[uuid]
             }
           },

  discover: function(callback)
            {
              var me = window.evo.watcher
              hyper.log('watcher.discover called')
              console.dir(me.watches)
              //
              //------------------------------------------ Register all services
              //

              //
              //------------------------------------------
              //
              if(callback)
              {
                callback(me.watches)
              }
            },

  subscribeToWatch: function(watchname, params, interval, callback)
                    {
                      var me = window.evo.watcher
                      hyper.log('subscribeToWatch called for path '+watchname+' and interval '+interval)
                      var watch = me.getWatchFromName(watchname)
                      if(watch)
                      {
                        var sid = setInterval(function()
                        {
                          var v = watch.object[watch.property]
                          //hyper.log('sendinv value '+v+' for property '+watch.property+' on object '+watch.object)
                          callback({name: watch.name, value: v, type: watch.type})
                        }, interval)
                        return sid
                      }
                      else
                      {
                        hyper.log('did not find watch '+watchname)
                        hyper.log(JSON.stringify(me.watches))
                      }
                    },

  selectHierarchy:function(path, callback)
                  {
                    hyper.log('* watcher.selectHierarchy called for path '+path+' typeof path = '+(typeof path))
                    var me = window.evo.watcher
                    var levels = path.split('.')
                    // --- list watches and select variable
                    if(levels.length == 1)
                    {
                      me.watchesShowing = true
                      var rv = [{name: 'watch.watches', selectable: true}, {name: 'watch.select', selectable: true}]
                      callback(rv)
                    }
                    // --- if watches, send back names of all watches, non-selectable
                    // --- if select variable, drill down first step and list what's under window root )or whatever other root we want to begin from)
                    else if(levels.length == 2)
                    {
                      if(levels[1] == 'watches')
                      {
                        hyper.log('listing watches')
                        var names = me.getWatchNames()
                        var rnames = []
                        names.forEach(function(wname)
                        {
                          rnames.push({name: 'watch.watches.'+wname, selectable: false})
                        })
                        callback(rnames)
                      }
                      else if(levels[1] == 'select')
                      {


                      }
                    }
                    // --- If we're beyond length == 2, then we're most probably drilling down into the variable hierarchy looking for a non-selectable to plot or watch
                    else
                    {
                      callback([])
                    }
                  },

  getWatchNames: function()
                 {
                   var me = window.evo.watcher
                   hyper.log(JSON.stringify(me.watches))
                   var rv = []
                   for(var pname in me.watches)
                   {
                     var service = me.watches[pname]
                     rv.push(service.name)
                   }
                   return rv
                 },

  subscribeTo: function(path, params, interval, callback)
               {
                 hyper.log('watcher.subscribeTo called for path '+path+' and interval '+interval)
                 var me = window.evo.watcher
                 var levels = path.split('.')
                 if(levels[1] == 'watches')
                 {
                   var watchname = levels[2]
                   if(watchname)
                   {
                     var sid = me.subscribeToWatch(watchname, params, interval, callback)
                     hyper.log('saving subscription '+sid+' in '+me.subscriptions)
                     me.subscriptions[sid] = watchname
                     return sid
                   }
                 }
                 else if(levels[1] == 'select')
                 {
                   // get reference to actual variable and set up timer to publish value every interval

                 }
               },
  unSubscribeTo: function(sid, callback)
               {
                 hyper.log('watcher.unSubscribeTo called for sid '+sid)
                 clearInterval(sid)
                 callback()
               }
}

me.discover()