require('test_helper')
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
  describe("#terms", function() {
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
                  count: { value: 120 },
                  rate: { value: 0.56 }
                }
              },
              {
                key: "Bob",
                doc_count: 200,
                transaction_count: { value: 230 },
                conversionRate: { value: 0.78 },
                transactions: {
                  count: { value: 230 },
                  rate: { value: 0.78 }
                }
              }
            ]
          }
        }
      }
    })

    it("simplifies bucket/value structure", function() {
      var response = new Response(this.esresponse)
      response.aggs.terms('name').should.eql([
        { name: "Alice", total: 300 },
        { name: "Bob", total: 200 },
      ])
    })

    it("takes a customizable doc_count field", function() {
      var response = new Response(this.esresponse)
      response.aggs.terms('name', {doc_count: 'clicks'}).should.eql([
        { name: "Alice", clicks: 300 },
        { name: "Bob", clicks: 200 },
      ])
    })

    it("resolves simple sub aggregations", function() {
      var response = new Response(this.esresponse)
      response.aggs.terms('name', {with: 'transaction_count conversionRate'})
      .should.match([
        { name: "Alice", transaction_count: 120, conversionRate: 0.56 },
        { name: "Bob", transaction_count: 230, conversionRate: 0.78 }
      ])
    })

    it("handles sub aggregation with dot notations", function() {
      var response = new Response(this.esresponse)
      response.aggs.terms('name', {
        with: 'transactions.count transactions.rate'
      }).should.match([
        { name: "Alice", transactions: { count: 120, rate: 0.56 } },
        { name: "Bob", transactions: {count: 230, rate: 0.78 } }
      ])
    })
  })

  describe("#filter", function() {
    it("returns total", function() {
      var esresponse = { aggregations: { onlyGoodOnes: { doc_count: 4200 } } }
      var response = new Response(esresponse)
      response.aggs.filter('onlyGoodOnes').should.eql({total: 4200})
    })
  })

  describe("#avg", function() {
    it("returns value", function() {
      var esresponse = { aggregations: { rate: { value: 0.85 } } }
      var response = new Response(esresponse)
      response.aggs.avg('rate').should.eql({rate: 0.85})
    })

    it("accepts dot notations", function() {
      var esresponse = {
        aggregations: {
          filter: { rate: { value: 0.85 } }
        }
      }
      var response = new Response(esresponse)
      response.aggs.avg('filter.rate')
        .should.eql({filter: {rate: 0.85}})
    })
  })
})

