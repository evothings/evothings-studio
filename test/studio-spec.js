var assert = require('assert')
var expect = require("chai").expect;
var Application = require('spectron').Application
//
//
// Look here for examples on how to write exepect assertions;
//----------------------------------------------------------
// http://chaijs.com/guide/styles/
// http://chaijs.com/api/bdd/
//
//
var DEFER = require('node-promise').defer

var app = undefined
var main = undefined

describe("Evothings Studio", function()
{
    before(function (done)
    {
        // Any async inits for mocks et.c. before testin+g starts

        done()
    })

    beforeEach(function (done)
    {
        app = new Application({
            path: '/usr/bin/electron',
            args: ['app/main.js']
        });
        app.start().then(function()
        {
             var mm = app.webContents

             console.log('main module is')
             console.dir(mm)

            console.log('--- app is')
            console.dir(main)
            console.log('workbenchWindow = '+main.workbenchWindow)

        }.bind(this))
    })

    it("should be able to test that internet connectivity works ", function(done)
    {
        app.client.util.checkInternet().then(function(res)
        {
            console.log('checkInternet result = '+res)
            expect(true).to.equal(true)
            done()
        }, function(rej)
        {
            console.log('checkInternet reject = '+rej)
        })
    })

})

