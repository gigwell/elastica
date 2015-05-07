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
