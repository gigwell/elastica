var Elasticsearch = require('elasticsearch'),
  Search = require('./lib/search').Search,
  Update = require('./lib/search').Update,
  Bulk = require('./lib/search').Bulk,
  Delete = require('./lib/search').Delete,
  Index = require('./lib/search').Index

module.exports = function(config) {
  var es = new Elasticsearch.Client(config)

  return {
    search: new Search(es),
    update: new Update(es),
    del: new Delete(es),
    bulk: new Bulk(es),
    index: new Index(es)
  }
}
