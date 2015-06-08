require('test_helper')

var Search = require('search').Search
var Update = require('search').Update
var Bulk = require('search').Bulk
var Index = require('search').Index

describe("Bulk", function() {
  beforeEach(function() {
    this.es = {
      bulk: function() { },
      update: function() { }
    }
    this.bulk = new Bulk(this.es)
    this.update = new Update(this.es)
    this.index = new Index(this.es)
  })

  describe("#add", function() {
    it("Adds an array of updates to the transaction list", function() {
      var updates = [ this.update.doc(42).with({field: 'value'}) ]
      this.bulk.add(updates).transactions.length.should.eql(1)
    })

    it("Adds a single update to the transaction list", function() {
      var update = this.update.doc(42).with({field: 'val'})
      this.bulk.add(update).transactions.length.should.eql(1)
    })
  })

  describe("#exec", function() {
    it("bulk executes with scripts", function(done) {
      var stub = sandbox.stub(this.es, 'bulk').yields()
      var u = this.update.in("analytics").doc(42)
        .withScript('updateClick', {tag: 'new tag'})
      this.bulk.add(u).exec(function() {
        stub.calledWith({
          body: [
            { update: { _id: 42, _index: 'analytics' } },
            { script: 'updateClick', params: {tag: 'new tag'} }
          ]
        }).should.eql(true)
        done()
      })
    })

    it("bulk executes the transactions", function(done) {
      var stub = sandbox.stub(this.es, 'bulk').yields()
      this.bulk.add([
        this.update.in("analytics").doc(42).with({field: 'value'})
      ]).exec(function() {
        stub.calledWith({
          body: [
            { update: { _id: 42, _index: 'analytics' } },
            { doc: {field: 'value'} }
          ]
        }).should.eql(true)
        done()
      })
    })

    it("bulk executes the index transactions", function(done) {
      var stub = sandbox.stub(this.es, 'bulk').yields()
      this.bulk.add([
        this.update.in("analytics").doc(42).with({field: 'value'}),
        this.index.in("analytics").for('click').id(37).doc({a: 'b'})
      ]).exec(function() {
        stub.calledWith({
          body: [
            { update: { _id: 42, _index: 'analytics' } },
            { doc: {field: 'value'} },
            { index: { _id: 37, _index: 'analytics', _type: 'click'}},
            { a: 'b'}
          ]
        }).should.eql(true)
        done()
      })
    })
  })
})

describe("Update", function() {
  beforeEach(function() {
    this.es = { update: function () {} }
    this.update = new Update(this.es)
  })

  describe("#doc", function() {
    it("sets the request._id field", function() {
      this.update.doc(42).request.id.should.eql(42)
    })
  })

  describe("withScript", function() {
    it("sets the request body", function() {
      this.update.withScript('updateClick', {tag: 'new tag'})
        .request.body.should.eql({
          script: 'updateClick',
          params: {tag: 'new tag'}
        })
    })
  })

  describe("#with", function() {
    it("sets the request body", function() {
      this.update.with({field: 'value'}).request.body.should.eql({
        doc: {field: 'value'}
      })
    })

    it("sets the id if not previously set", function() {
      this.update.with({field: 'value', id: 42}).request.id.should.eql(42)
    })

    it("keeps previously set id", function() {
      this.update.doc(37)
        .with({field: 'value', id: 42}).request.id.should.eql(37)
    })
  })

  describe("#exec", function() {
    it("updates the doc", function(done) {
      var stub = sandbox.stub(this.es, 'update').yields()
      var update = this.update.in("analytics").for("click")
      update.exec(function() {
        stub.calledWith(update.request)
        done()
      })
    })
  })
})

describe("Index", function() {
  beforeEach(function() {
    this.es = { index: function () {} }
    this.index = new Index(this.es)
  })

  describe('#id', function() {
    it('should set the request id', function() {
      this.index.id(42).request.id.should.eql(42)
    })
  })

  describe('#doc', function() {
    it('should set the request body', function() {
      this.index.doc({a: 'b'}).request.body.should.eql({a: 'b'})
    })
  })

  describe("#exec", function() {
    it("inserts the doc", function(done) {
      var stub = sandbox.stub(this.es, 'index').yields()
      var index = this.index.in("analytics").for("click")
      index.exec(function() {
        stub.calledWith(index.request)
        done()
      })
    })
  })
})

describe("Search", function() {
  beforeEach(function() {
    this.es = { search: function () {} };
    this.search = new Search(this.es)
  })

  describe("#in", function() {
    it("sets the search index", function() {
      var analytics = this.search.in("analytics")
      analytics.request.index.should.eql("analytics")
    })
  })

  describe("#for", function() {
    it("sets the type", function() {
      var analytics = this.search.in("analytics").for("click")
      analytics.request.type.should.eql("click")
    })
  })

  describe("#compile", function() {
    it("compiles and saves the query", function() {
      var template = '{ "match": "<%= keyword %>" }'
      var analytics = this.search.compile(template)
      var hits = {
        hits: []
      }
      var stub = sandbox.stub(this.es, 'search').yields(null, hits)
      analytics.exec({keyword: 'blarg'}, function() {
        stub.calledWith({body: {match: 'blarg'}}).should.eql(true)
      })
    })
  })

  describe("#exec", function() {
    it("executes the query", function(done) {
      var query = {"match_all" : { }}
      var hits = {
        hits: []
      }
      sandbox.stub(this.es, 'search').yields(null, hits)
      this.search.in("analytics")
        .for("click")
        .exec(query, function(err, result) {
          _.isNull(err).should.eql(true)
          result.raw.should.eql(hits)
          done()
        })
    })

    it("allows for additional parameters", function(done) {
      var query = {"match_all" : { }}
      var hits = {
        hits: []
      }
      var stub = sandbox.stub(this.es, 'search').yields(null, hits)
      this.search.exec(query, {ignoreUnavailable: 'true'},
        function() {
        stub.calledWith({
          body: {"match_all": {}},
          ignoreUnavailable: 'true'
        }).should.eql(true)
        done()
      })
    })
  })
})
