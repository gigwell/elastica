var Agg = function(aggs) {
  function getRequestedAggs(name) {
    return _.get(aggs, name)
  }

  function totalOnlyAgg(name) {
    return { total: getRequestedAggs(name).doc_count }
  }

  function leafAgg(name) {
    return _.set({}, name, getRequestedAggs(name).value)
  }

  this.filter = this.nested = totalOnlyAgg
  this.avg = this.sum = this.max = this.min = this.leaf = leafAgg

  this.terms = function(name, options) {
    options = options || {}
    var totalName = options.doc_count || 'total'
    var agg = getRequestedAggs(name + ".buckets")

    var nested = options.with ? options.with.split(" ") : []
    return _.map(agg, function(b) {
      var obj = _.zipObject([name, totalName], [b.key, b.doc_count])

      return _.transform(nested, function(memo, field) {
        return _.merge(memo, new Agg(b).leaf(field))
      }, obj)
    })
  }
}

module.exports = function(response) {
  this.hits = function() {
    return response.hits.hits
  }

  this.aggs = new Agg(response.aggregations)

  this.raw = _.clone(response)
}

