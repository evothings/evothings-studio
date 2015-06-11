var HTTP = require('http')
var socket = require('socket.io-client')
var LOGGER = require('./log.js')

var authCollector = {}
authCollector.PORT = 9004

authCollector.handleRequest = function(req, res)
{
    LOGGER.log('handleRequest got reply')
    console.dir(req)

    var code = req.url.replace('/?code=', '')
    console.log('code = '+code)

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>Login completed. You can close this window</h1>');

    authCollector.authenticate(code)
}

authCollector.authenticate = function(code)
{
    var msg = {target:'authenticateUser', authCode: code}
    authCollector.mIO.emit('message', msg)
}

authCollector.start = function()
{
    try
    {
        authCollector.mHTTPServer = HTTP.createServer(authCollector.handleRequest)
        console.log('foo')
        authCollector.mHTTPServer.listen(authCollector.PORT, function()
        {
            LOGGER.log('auth collector server started at port ' +authCollector.PORT)
        })

        authCollector.mIO = socket('ws://evothings.com:3003')
        // Handle socket connections.
        authCollector.mIO.on('event', function(data)
        {
            console.log('socket.io client got event')
            console.dir(data)

        })

        LOGGER.log('auth collector started')
    }
    catch (error)
    {
        LOGGER.log('Could not create webserver: ' + error)
    }
}


module.exports = authCollector