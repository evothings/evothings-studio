var HTTP = require('http')
var SOCKETIO = require('socket.io')
var LOGGER = require('./log.js')

var authCollector = {}
authCollector.PORT = 9004

authCollector.handleRequest = function(req, res)
{
    LOGGER.log('handleRequest got reply')
    console.dir(req)

    var code = req.url.replace('/?code=', '')
    console.log('code = '+code)

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('<h1>Login completed. You can close this window</h1>');

    authCollector.authenticate(code)
}

authCollector.authenticate = function(code)
{
    var msg = {target:'authenticateUser', authCode: auth_code}
    authCollector.mIO.emit('message')
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

        authCollector.mIO = SOCKETIO(authCollector.mHTTPServer)
        // Handle socket connections.
        authCollector.mIO.on('connection', function(socket)
        {

        }
        LOGGER.log('auth collector started')
    }
    catch (error)
    {
        LOGGER.log('Could not create webserver: ' + error)
    }
}


module.exports = authCollector