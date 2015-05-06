var _ = require('lodash')
var str = require('inflection')

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

  // expression = {subAgg}
  // subAgg = [type:]name[buckets]
  // buckets = "["expression"]"

  function attachSubAggs(parent, expression) {
    var subAggs = expression.split(' ')
    var matcher = /^(.*:)?(.+?)(\[.+?\])?$/

    return _.transform(subAggs, function(memo, subAgg) {
      var match = subAgg.match(matcher),
          type = _.trimRight(match[1] || 'leaf:', ':'),
          nameParts = match[2].split('.'),
          buckets = _.trim(match[3], /\[|\]/),
          name = _.last(nameParts),
          prefix = _.take(nameParts, nameParts.length - 1).join('.'),
          aggBody = prefix.length > 0 ? _.get(parent, prefix) : parent,
          agg = new Agg(aggBody)

      if (buckets) {
        var pluralized = str.pluralize(name),
            subs = agg.buckets(name, {with: buckets}),
            aggResults = _.set({}, pluralized, subs)

        return _.merge(memo, aggResults)
      } else
        return _.merge(memo, agg[type](name))
    }, {})
  }

  function countWithSubsAgg(name, options) {
    options = options || {}
    var key = _.last(name.split('.')),
        agg = getRequestedAggs(name),
        base = _.set({}, key + '.count', agg.doc_count)

    if (!!options.with)
      _.merge(base[key], attachSubAggs(agg, options.with))

    return base
  }

  function leafAgg(name) {
    var key = _.last(name.split('.'))
    return _.set({}, key, getRequestedAggs(name).value)
  }

  function multiAgg(name, options) {
    options = options || {}
    var countName = options.doc_count || 'count'
    var agg = getRequestedAggs(name + ".buckets"),
        nameField = str.singularize(_.last(name.split('.')))

    return _.map(agg, function(b, k) {
      var key = b.key_as_string || b.key || k
      var obj = _.zipObject([nameField, countName], [key, b.doc_count])

      return !!options.with ?
        _.merge(obj, attachSubAggs(b, options.with)) :
        obj
    })
  }

  this.filter = this.nested = safeFn(countWithSubsAgg)
  this.avg = this.sum = this.max = this.min = this.leaf = safeFn(leafAgg)

  this.ranges = this.geohashGrid = this.buckets =
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

