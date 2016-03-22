
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
           hyper.log('watch called for name ' +name +' obj '+object+' and property '+property)
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
                        var oldval = undefined
                        var sid = setInterval(function()
                        {
                          var v = watch.object[watch.property]
                          //hyper.log('sendinv value '+v+' for property '+watch.property+' on object '+watch.object)
                          if(v != oldval)
                          {
                            callback({name: watch.name, value: v, type: watch.type})
                            oldval = v
                          }
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
                    hyper.log('* watcher.selectHierarchy called for path '+path)
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
                        me.sendWebViewHierarchyAt(levels, callback)
                      }
                    }
                    // --- If we're beyond length == 2, then we're most probably drilling down into the variable hierarchy looking for a non-selectable to plot or watch
                    else
                    {
                      if(levels[1] == 'select')
                      {
                        me.sendWebViewHierarchyAt(levels, callback)
                      }
                      else
                      {
                        callback([])
                      }
                    }
                  },

  sendWebViewHierarchyAt: function(levels, callback)
                          {
                            var me = window.evo.watcher
                            var rv = []
                            if(levels.length == 2)
                            {
                              rv.push({name: 'watch.select.window', selectable: true})
                              callback(rv)
                            }
                            else if(levels.length > 2)
                            {
                              bobj = me.getBaseNameAndObjectFromLevels(levels)
                              for(var p in bobj.base)
                              {
                                var prop = bobj.base[p]
                                if(typeof prop != 'function')
                                {
                                  hyper.log('iterating next level selectable names : '+p+' of type '+(typeof prop))
                                  rv.push({name: 'watch.select.'+bobj.baseName+'.'+p, selectable: prop && typeof prop == 'object' && !prop.length})
                                }
                              }
                              callback(rv)
                            }
                          },
  getBaseNameAndObjectFromLevels: function(levels)
                                  {
                                    var base = window
                                    var baseName = ''
                                    // remove first two levels, so we get to window
                                    levels.shift()
                                    levels.shift()
                                    // drill down until base refers to the object we want to list properties under
                                    hyper.log('-- levels before base hunting are..')
                                    hyper.log(JSON.stringify(levels))
                                    levels.forEach(function(l)
                                    {
                                      baseName += l + '.'
                                      base = base[l]
                                    })
                                    baseName = baseName.substr(0, baseName.length-1)
                                    hyper.log('returning final baseName '+baseName)
                                    return {base: base, baseName: baseName}
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
                   var prop = levels.pop()
                   bobj = me.getBaseNameAndObjectFromLevels(levels)
                   me.watch(prop, bobj.base, prop, 'scalar')
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