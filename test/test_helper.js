require('mocha')
require('should')

global.inspect = require('eyes').inspector({})

global._ = require('lodash')
var sinon = require('sinon')

beforeEach (function(done) {
  global.sandbox = sinon.sandbox.create();
  done();
})

afterEach (function(done) {
  global.sandbox.restore();
  done();
})
