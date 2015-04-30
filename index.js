var Elasticsearch = require('elasticsearch'),
  Search = require('./lib/search').Search,
  Update = require('./lib/search').Update,
  Bulk = require('./lib/search').Bulk

module.exports = function(config) {
  var es = new Elasticsearch.Client(config)

  return {
    search: new Search(es),
    update: new Update(es),
    bulk: new Bulk(es)
  }
}
