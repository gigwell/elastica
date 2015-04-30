var Elasticsearch = require('elasticsearch'),
  Search = require('search').Search,
  Update = require('search').Update,
  Bulk = require('search').Bulk

module.exports = function(config) {
  var es = new Elasticsearch.Client(config)

  return {
    search: new Search(es),
    update: new Update(es),
    bulk: new Bulk(es)
  }
}
