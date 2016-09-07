var Application = require('spectron').Application
var assert = require('assert')
var expect = require("chai").expect;
//
//
// Look here for examples on how to write exepect assertions;
//----------------------------------------------------------
// http://chaijs.com/guide/styles/
// http://chaijs.com/api/bdd/
//
//
var DEFER = require('node-promise').defer

describe("Evothings Studio", function()
{
    before(function (done)
    {
        // Any async inits for mocks et.c. before testin+g starts

        done()
    })

    it("should just work ", function(done)
    {
        expect(true).to.equal(true)
        done()
    })

})

