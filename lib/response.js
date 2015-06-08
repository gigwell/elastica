var Agg = function(aggs) {
  function getRequestedAggs(name) {
    return _.get(aggs, name)
  }

  function totalOnlyAgg(name) {
    try {
    var key = name + '.total'
    return _.set({}, key, getRequestedAggs(name).doc_count)
    } catch(e) {
      return {}
    }
  }

  function leafAgg(name) {
    try {
    return _.set({}, name, getRequestedAggs(name).value)
    } catch(e) {
      return {}
    }

  }

  function multiAgg(name, options) {
    options = options || {}
    var totalName = options.doc_count || 'total'
    var agg = getRequestedAggs(name + ".buckets")

    var subAggs = options.with ? options.with.split(" ") : []
    return _.map(agg, function(b, k) {
      var key = b.key_as_string || b.key || k
      var obj = _.zipObject([name, totalName], [key, b.doc_count])

      return _.transform(subAggs, function(memo, field) {
        var subAgg = field.split(':'),
            aggType = !!subAgg[1] ? subAgg[0] : 'leaf',
            aggField = subAgg[1] || subAgg[0],
            agg = new Agg(b)

        return _.merge(memo, agg[aggType](aggField))
      }, obj)
    })
  }

  this.filter = this.nested = totalOnlyAgg
  this.avg = this.sum = this.max = this.min = this.leaf = leafAgg
  this.ranges = this.geohashGrid = this.terms = this.histogram = multiAgg
  this.percentiles = function(name) {
    return getRequestedAggs(name + '.values')
  }
}

module.exports = function(response) {
  this.hits = function() {
    return response.hits.hits
  }

  this.aggs = new Agg(response.aggregations)

  this.raw = _.clone(response)
}

