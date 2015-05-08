var _ = require('lodash')

// expression = {subAgg}
// subAgg = [type:]name[buckets]
// buckets = "["expression"]"

// REGEX PATTERN: ([a-zA-Z]+:)?([^\[\] ]+)(\[(.+)\])?
//   type: ([a-zA-Z]+:)?
//     Optional alphabetical string followed by colon
//
//   name: ([^\[\] ]+)
//     One or more characters that are not space, or square brackets
//
//   buckets: (\[(.+)\])?
//     Optional expression encased in square brackets

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
