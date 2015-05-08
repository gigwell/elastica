var _ = require('lodash')

// expression = {subAgg}
// subAgg = [type:]name[buckets]
// buckets = "["expression"]"

// REGEX PATTERN: ([a-zA-Z]+:)?([^\[\] ]+)(\[(.+)\])?

exports.tokenize = function(expression) {
  return expression.match(/([a-zA-Z]+:)?([^\[\] ]+)(\[(.+)\])?/g)
}

exports.parseSubAgg = function(subAgg) {
  var matcher = /([a-zA-Z]+:)?([^\[\] ]+)(\[(.+)\])?/,
      parts = subAgg.match(matcher),
      nameParts = parts[2].split('.')

  return {
    type: _.trimRight(parts[1] || 'value:', ':'),
    buckets: parts[4],
    namePrefix: _.take(nameParts, nameParts.length - 1).join('.'),
    name: _.last(nameParts)
  }
}
