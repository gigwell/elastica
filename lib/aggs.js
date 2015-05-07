var _ = require('lodash')
var str = require('inflection')

function ParseError(name, body) {
  this.name = "ParseError"
  this.msg = "Error parsing aggregation at: " + name
  this.body = body
}
ParseError.prototype = new Error();
ParseError.prototype.constructor = ParseError;

var Agg = module.exports = function(aggs) {
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
    var tokenizer = /([a-zA-Z]+:)?([^\[\] ]+)(\[(.+)\])?/g,
        matcher   = /([a-zA-Z]+:)?([^\[\] ]+)(\[(.+)\])?/,
        subAggs = expression.match(tokenizer)

    return _.transform(subAggs, function(memo, subAgg) {
      var match = subAgg.match(matcher),
          type = _.trimRight(match[1] || 'value:', ':'),
          nameParts = match[2].split('.'),
          buckets = match[4],
          name = _.last(nameParts),
          prefix = _.take(nameParts, nameParts.length - 1).join('.'),
          aggBody = prefix.length > 0 ? _.get(parent, prefix) : parent,
          agg = new Agg(aggBody)

      if (buckets) {
        var pluralized = str.pluralize(name),
            subs = agg.multiCount(name, {with: buckets}),
            aggResults = _.set({}, pluralized, subs)

        return _.merge(memo, aggResults)
      } else
        return _.merge(memo, agg[type](name))
    }, {})
  }

  function countAgg(name, options) {
    options = options || {}
    var key = _.last(name.split('.')),
        agg = getRequestedAggs(name),
        base = _.set({}, key + '.count', agg.doc_count)

    if (!!options.with)
      _.merge(base[key], attachSubAggs(agg, options.with))

    return base
  }

  function valueAgg(name) {
    var key = _.last(name.split('.'))
    return _.set({}, key, getRequestedAggs(name).value)
  }

  function multiCountAgg(name, options) {
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

  this.count = this.filter = this.nested = safeFn(countAgg)
  this.avg = this.sum = this.max = this.min = this.value = safeFn(valueAgg)

  this.ranges = this.geohashGrid = this.multiCount =
    this.terms = this.histogram = safeFn(multiCountAgg)

  this.multiValue = this.percentiles = safeFn(function(name, options) {
    options = options || {}

    var key = _.last(name.split('.')),
        values = getRequestedAggs(name + '.values')

    var aggResults = options.asArray ?
      _.map(values, function(v, k) { return {key: k, value: v} }) :
      values

    return _.set({}, key, aggResults)
  })

  this.fromExpression = safeFn(_.partial(attachSubAggs, aggs))
}


