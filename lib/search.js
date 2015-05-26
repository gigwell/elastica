var _ = require('lodash'),
    util = require("util"),
    Response = require("./response")


function SearchError(err) {
  this.name = "SearchError"
  this.message = err.msg
}

function error(err) {
  return !!err ? new SearchError(err) : null
}

SearchError.prototype = new Error()
SearchError.prototype.constructor = SearchError;

var BaseRequest = function() {
  this.request = {}
  this.bulkRequest = []

  this.in = function(index) {
    var clone = _.cloneDeep(this)
    if(index) clone.request.index = index
    return clone
  }

  this.for = function(type) {
    var clone = _.cloneDeep(this)
    clone.request.type = type
    return clone
  }
}

var Bulk = function(es) {
  this.transactions = []

  this.add = function(transactions) {
    var clone = _.cloneDeep(this)
    clone.transactions = clone.transactions.concat(transactions)
    return clone
  }

  this.exec = function(cb) {
    var transactions =
      _.transform(this.transactions, function(res, t) {
        var doc = t.request.body.doc ?
          {doc: t.request.body.doc} : null
        var script = t.request.body.script ?
          t.request.body : null
        var update = {update: _.transform(_.omit(t.request, 'body'),
          function(res, val, key) {
            res['_'+key] = val
            return res
        })}
        res.push(update)
        if(doc) res.push(doc)
        else if (script) res.push(script)
        return res
      })
    es.bulk({body: transactions}, cb)
  }
}

var Update = function(es) {
  BaseRequest.call(this)

  this.doc = function(id) {
    var clone = _.cloneDeep(this)
    clone.request.id = id
    return clone
  }

  this.with = function(doc) {
    var clone = _.cloneDeep(this)
    clone.request.body = {doc: doc}
    if(!clone.request.id && doc.id) clone.request.id = doc.id
    return clone
  }

  this.withScript = function(script, params) {
    var clone = _.cloneDeep(this)
    clone.request.body = {
      script: script,
      params: params
    }
    return clone
  }

  this.exec = function(cb) {
    es.update(this.request, cb)
  }
}

var Search = function(es) {
  BaseRequest.call(this)

  this.compile = function(template) {
    var clone = _.cloneDeep(this)
    clone.template = _.template(template)
    return clone
  }

  this.exec = function(query, options, cb) {
    if(_.isFunction(options)){
      cb = options; options = {}
    }

    var clone = _.cloneDeep(this)
    _.extend(clone.request, options)
    clone.request.body = clone.template ?
      JSON.parse(clone.template(query)) : query
    es.search(clone.request, function(err, response) {
      cb(error(err), new Response(response))
    })
  }
}

util.inherits(Search, BaseRequest)
util.inherits(Update, BaseRequest)

exports.Search = Search
exports.Update = Update
exports.Bulk = Bulk
