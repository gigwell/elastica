var _ = require('lodash'),
    str = require('inflection'),
    expressionParser = require('./expression_parser.js')

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

  function attachSubAggs(parent, expression) {
    var subAggs = expressionParser.tokenize(expression)

    return _.transform(subAggs, function(memo, subAgg) {
      var parsed = expressionParser.parseSubAgg(subAgg),
          aggBody = _.get(parent, parsed.namePrefix) || parent,
          agg = new Agg(aggBody)

      if (parsed.buckets) {
        var pluralized = str.pluralize(parsed.name),
            subs = agg.multiCount(parsed.name, {with: parsed.buckets}),
            aggResults = _.set({}, pluralized, subs)

        return _.merge(memo, aggResults)
      } else
        return _.merge(memo, agg[parsed.type](parsed.name))
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


