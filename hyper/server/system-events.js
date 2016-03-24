UUID = require('./uuid')

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
    },

    publish: function(channel, obj)
    {
        var listeners = Events.listeners[channel] || []
        for(var k in listeners)
        {
            listeners[k](obj)
        }
    }
}

module.exports = Events