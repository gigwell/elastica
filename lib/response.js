function ParseError(name, body) {
  this.name = "ParseError"
  this.msg = "Error parsing aggregation at: " + name
  this.body = body
}

var Agg = function(aggs) {
  var self = this

  function safeFn(op) {
    return function() {
      try {
        return op.apply(self, arguments)
      } catch(e) {
        throw new ParseError(arguments[0], aggs)
      }
    }
  }

  function getRequestedAggs(name) {
    return _.get(aggs, name)
  }

  function countWithSubsAgg(name) {
    try {
    var key = _.last(name.split('.')) + '.count'
    return _.set({}, key, getRequestedAggs(name).doc_count)
    } catch(e) {
      throw new ParseError(name, aggs)
    }
  }

  function leafAgg(name) {
    try {
    var key = _.last(name.split('.'))
    return _.set({}, key, getRequestedAggs(name).value)
    } catch(e) {
      throw new ParseError(name, aggs)
    }

  }

  function multiAgg(name, options) {
    options = options || {}
    var countName = options.doc_count || 'count'
    var agg = getRequestedAggs(name + ".buckets"),
        nameField = _.last(name.split('.'))

    var subAggs = options.with ? options.with.split(" ") : []
    return _.map(agg, function(b, k) {
      var key = b.key_as_string || b.key || k
      var obj = _.zipObject([nameField, countName], [key, b.doc_count])

      return _.transform(subAggs, function(memo, field) {
        var subAgg = field.split(':'),
            aggType = !!subAgg[1] ? subAgg[0] : 'leaf',
            aggFieldParts = (subAgg[1] || subAgg[0]).split('.'),
            aggField = _.last(aggFieldParts),
            aggPfx = _.take(aggFieldParts, aggFieldParts.length - 1).join('.'),
            aggBody = aggPfx.length > 0 ? _.get(b, aggPfx) : b
            agg = new Agg(aggBody)

        return _.merge(memo, agg[aggType](aggField))
      }, obj)
    })
  }

  this.filter = this.nested = safeFn(countWithSubsAgg)
  this.avg = this.sum = this.max = this.min = this.leaf = safeFn(leafAgg)

  this.ranges = this.geohashGrid =
    this.terms = this.histogram = safeFn(multiAgg)

  this.percentiles = safeFn(function(name) {
    var key = _.last(name.split('.'))
    return _.set({}, key, getRequestedAggs(name + '.values'))
  })
}

module.exports = function(response) {
  this.hits = function() {
    return response.hits.hits
  }

  this.aggs = new Agg(response.aggregations)

  this.raw = _.clone(response)
}

