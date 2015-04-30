require('test_helper')

var Agg = function(aggs, results) {
  this.terms = function(name, options) {
    options = options || {}
    var totalName = options.doc_count || 'total'
    var agg = _.result(aggs, name + '.buckets')

    var results = _.map(agg, function(b) {
      return _.zipObject([name, totalName], [b.key, b.doc_count])
    })

    return new Agg(aggs, results)
  }

  this.val = function() {
    return results
  }
}

var Result = function(response) {
  this.hits = function() {
    return response.hits.hits
  }

  this.aggs = new Agg(response.aggregations)
}

describe("Response", function() {
  describe("#hits", function() {
    it("gets the hits from the elasticsearch response", function() {
      var esresult = {
        hits: {
          total: 5934,
          hits: [{field: "value"}, {field: "value2"}]
        }
      }
      var result = new Result(esresult)
      result.hits().should.eql(esresult.hits.hits)
    })
  })

  describe("#aggs", function() {
    describe("term aggregations", function() {
      beforeEach(function(done) {
        this.esresult = {
          aggregations: {
            name: {
              buckets: [
                {key: "Alice", doc_count: 300},
                {key: "Bob", doc_count: 200}
              ]
            }
          }
        }
        done()
      })

      it("simplifies bucket/value structure", function() {
        var result = new Result(this.esresult)
        result.aggs.terms('name')
        .val().should.eql([
          { name: "Alice", total: 300 },
          { name: "Bob", total: 200 },
        ])
      })

      it("takes a customizable doc_count field", function() {
        var result = new Result(this.esresult)
        result.aggs.terms('name', {doc_count: 'clicks'})
        .val().should.eql([
          { name: "Alice", clicks: 300 },
          { name: "Bob", clicks: 200 },
        ])
      })
    })
  })
})
