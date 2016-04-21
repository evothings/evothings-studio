UUID = require('./uuid')
const ipcRenderer = require('electron').ipcRenderer

var Events =
{
    CONNECT:                'connect',
    DISCONNECT:             'disconnect',
    LOGIN:                  'login',
    LOGOUT:                 'logout',
    SETSESSIONID:           'setsessionid',
    USERMESSAGE:            'usermessage',
	  LOGINCONNECT:           'loginconnect',
	  LOGINDISCONNECT:        'logindisconnect',
	  VIEWERSUPDATED:         'viewersupdated',
	  VIEWERSINSTRUMENTATION: 'viewersinstrumentation',

    listeners:  [],

    subscribe: function(channel, callbackFun)
    {
        var listeners = Events.listeners[channel] || []
        var mListenerID = UUID.generateUUID()
        listeners[mListenerID] = (callbackFun)
        Events.listeners[channel] = listeners
        ipcRenderer.send('events-subscribe', channel, Events.myID)
        return mListenerID
    },

    unSubscribe: function(channel, listenerID)
    {
        var mTempList = []
        var listeners = Events.listeners[channel]
        for(var k in listeners)
        {
            if(k != listenerID)
            {
                mTempList[k] = listeners[k]
            }
        }
        Events.listeners[channel] = mTempList
        // TODO: If nTempList does not contain channel we unsubscribe
        ipcRenderer.send('events-unsubscribe', channel, Events.myID)
    },

    publish: function(channel, obj)
    {
        console.log("Publish "+JSON.stringify(obj) + " on "+channel)
        ipcRenderer.send('events-publish', channel, obj);
    }
}


ipcRenderer.on('events-event', function(event, channel, obj) {
  var listeners = Events.listeners[channel] || []
  console.log("Got an event " + JSON.stringify(obj) + " on channel " + channel)
  for (var k in listeners) {
    console.log("Called function")
    listeners[k](obj)
  }
})


module.exports = Events
