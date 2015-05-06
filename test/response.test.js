require('test_helper')
var assert = require('assert')
var Response = require("response")

describe("Response", function() {
  describe("#hits", function() {
    it("gets the hits from the elasticsearch response", function() {
      var esresponse = {
        hits: {
          total: 5934,
          hits: [{field: "value"}, {field: "value2"}]
        }
      }
      var response = new Response(esresponse)
      response.hits().should.eql(esresponse.hits.hits)
    })
  })
})


describe("Aggs", function() {
  describe("#multiCount", function() {
    beforeEach(function() {
      this.esresponse = {
        aggregations: {
          name: {
            buckets: [
              {
                key: "Alice",
                doc_count: 300,
                transaction_count: { value: 120 },
                conversionRate: { value: 0.56 },
                transactions: {
                  doc_count: 200,
                  count: { value: 120 },
                  rate: { value: 0.56 }
                },
                salesTotal: {
                  buckets: [
                    {key: '10-20',
                    doc_count: 10,
                    sales: {value: 2}}
                  ]
                }
              },
              {
                key: "Bob",
                doc_count: 200,
                transaction_count: { value: 230 },
                conversionRate: { value: 0.78 },
                transactions: {
                  doc_count: 350,
                  count: { value: 230 },
                  rate: { value: 0.78 }
                },
                salesTotal: {
                  buckets: [
                    {key: '10-20',
                    doc_count: 5,
                    sales: {value: 1}}
                  ]
                }
              }
            ]
          }
        }
      }
    })

    it("handles nested bucket aggs", function() {
      var response = new Response(this.esresponse)
      response.aggs.multiCount('name', {
        with: 'salesTotal[sales]'
      }).should.match([{
        name: "Alice",
        count: 300,
        salesTotals: [{salesTotal: "10-20", count: 10, sales: 2}]
      }, {
        name: "Bob",
        count: 200,
        salesTotals: [{salesTotal: "10-20", count: 5, sales: 1}]}
      ])
    })

    it("simplifies bucket/value structure", function() {
      var response = new Response(this.esresponse)
      response.aggs.multiCount('name').should.eql([
        { name: "Alice", count: 300 },
        { name: "Bob", count: 200 },
      ])
    })

    it("takes a customizable doc_count field", function() {
      var response = new Response(this.esresponse)
      response.aggs.multiCount('name', {doc_count: 'clicks'}).should.eql([
        { name: "Alice", clicks: 300 },
        { name: "Bob", clicks: 200 },
      ])
    })

    it("resolves simple sub aggregations", function() {
      var response = new Response(this.esresponse)
      response.aggs.multiCount('name', {
        with: 'transaction_count conversionRate'
      }).should.match([
        { name: "Alice", transaction_count: 120, conversionRate: 0.56 },
        { name: "Bob", transaction_count: 230, conversionRate: 0.78 }
      ])
    })

    it("handles sub aggregation with dot notations", function() {
      var response = new Response(this.esresponse)
      response.aggs.multiCount('name', {
        with: 'transactions.count transactions.rate'
      }).should.match([
        { name: "Alice", count: 120, rate: 0.56 },
        { name: "Bob", count: 230, rate: 0.78 }
      ])
    })

    it('can specify non leaf subaggregations', function() {
      var response = new Response(this.esresponse)
      response.aggs.multiCount('name', {
        with: 'nested:transactions'
      }).should.match([
        { name: "Alice", transactions: {count: 200} },
        { name: "Bob", transactions: {count: 350} }
      ])
    });
  })

  describe("#count", function() {
    it("returns count", function() {
      var esresponse = { aggregations: { onlyGoodOnes: { doc_count: 4200 } } }
      var response = new Response(esresponse)
      response.aggs.count('onlyGoodOnes').should.eql({
        onlyGoodOnes: { count: 4200 }
      })
    })

    it("takes sub aggs", function() {
      var esresponse = {
        aggregations: {
          onlyGoodOnes: {
            doc_count: 4200,
            rate: { value: 100 }
          }
        }
      }

      var response = new Response(esresponse)
      response.aggs.count('onlyGoodOnes', {with: 'rate'}).should.eql({
        onlyGoodOnes: { count: 4200, rate: 100 }
      })
    })
  })

  describe("#value", function() {
    it("returns value", function() {
      var esresponse = { aggregations: { rate: { value: 0.85 } } }
      var response = new Response(esresponse)
      response.aggs.value('rate').should.eql({rate: 0.85})
    })

    it("accepts dot notations", function() {
      var esresponse = {
        aggregations: {
          filter: { rate: { value: 0.85 } }
        }
      }
      var response = new Response(esresponse)
      response.aggs.value('filter.rate')
        .should.eql({rate: 0.85})
    })
  })

  describe('#multiValue', function() {
    var esresponse = { aggregations: {
      rates: {
        values: {
          '25': 0.20,
          '50': 0.45,
          '99': 0.04
        }
      }
    } }

    it('returns each value', function() {
      var response = new Response(esresponse)
      response.aggs.multiValue('rates').should.eql({
        rates: {
          25: 0.20,
          50: 0.45,
          99: 0.04
        }
      })
    })

    it('returns each value as an array', function() {
      var response = new Response(esresponse)
      response.aggs.multiValue('rates', {asArray: true}).should.eql({
        rates: [
          {key: "25", value: 0.20},
          {key: "50", value: 0.45},
          {key: "99", value: 0.04}
        ]
      })
    })
  })

  describe('Error handling', function() {
    it('throws a Parse error', function() {
      var esresponse = { aggregations: {
        rates: {
          values: {
            '25': 0.20,
            '50': 0.45,
            '99': 0.04
          }
        }
      } }

      var response = new Response(esresponse)
      assert.throws(function() {
        response.aggs.filter('ratios.values.25')
      }, function(err) {
        return /ratios.values/.test(err.msg) && !!err.body.rates
      })
    })
  })
})

