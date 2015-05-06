# Elastica
A flexible chaining API for ElasticSearch

Raison D'être 
--------------
Elasticsearch is an amazing tool. However, we find that its request/response payloads to be a little bloated. It is hard to maintain a clean layer to handle your ES requests. This library aims to make it easier to send requests and marshall responses from ES. The current version focuses primarily on querying and marshalling aggregations but we'd like to quickly add more features as we or the community needs them.

Contents
---------
## Request

* [Search](#search)
* [Update](#update)
* [Bulk](#bulk)

## Response

* [Raw](#raw)
* [Hits](#hits)
* [Value Aggregation](#valueAgg)
* [Multi Value Aggregation](#multiValueAgg)
* [Count Aggregation](#countAgg)
* [Multi Count Aggregation](#multiCountAgg)


Installation
------------

`npm install elastica`

Usage
-----

### Initialization

Initialize Elastica with the config you'd typically use in the [ES Javascript API](http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html).

```{javascript}
var elastica = require('elastica')(config.es)
```

### Requests

Elastica uses a chained interface to simplify the creation of requests. Every function call returns a new request object. These objects are immutable, and can be saved and reused for convienience. Subsequent method calls will not change their state.

<a name="search" />
#### Search

Used to make search queries. All search callbacks pass an [Elastica Response Object](#raw).

##### Examples

__Simple Search__

The simple search uses *for* to describe the document type and *in* to describe the index range the search takes place in.

```{javascript}
var query = '{"filter": { "term": { "field": "searchValue"} } }'

elastica.search
  .for('myDocType')
  .in('myIndex1,myIndex2')
  .exec(query, function(err, response) {
  })
```

__Search With Compile__

Compiled templates use erb syntax to build the search query.

```{javascript}
var template = '{"filter": { "term": { "field": "<%= myField %>"} } }'

elastica.search
  .for('myDocType')
  .in('myIndex1,myIndex2')
  .compile(template)
  .exec({myField: 'searchValue'},function(err, response) {
  })
```

__Request Reuse__

```{javascript}
var template = '{"filter": { "term": { "field": "<%= myField %>"} } }'

var search = elastica.search.for('myDocType').compile(template)
  
search.in('myIndex1').exec({myField: 'searchValue1'},function(err, response) {})
search.in('myIndex2').exec({myField: 'searchValue2'},function(err, response) {})
```

__Search Options__

Search takes an optional parameter that is passed to [ES API](http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search), in order to qualify the search. In the following example we pass *search_type* and *ignore_unavailable* optional parameters to Elasticsearch.

```{javascript}
var template = '{"filter": { "term": { "field": "<%= myField %>"} } }'

elastica.search
  .for('myDocType')
  .in('myIndex1,myIndex2')
  .compile(template)
  .exec({myField: 'searchValue'}, {search_type: 'count', ignore_unavailable: true}, function(err, response) {
  })
```

<a name="update" />
#### Update

Update works very much like search with three additional operations: *doc*, *with*, and *withScript*. Update's callback returns the raw elasticsearch reponse.

##### Examples

__Document Update__

```{javascript}
elastica.update
  .for('myDocType')
  .in('myIndex1')
  .doc('documentId')
  .with({updateField: 'updateValue'})
  .exec(function(err, response) {})
```


__Script Update__

```{javascript}
elastica.update
  .for('myDocType')
  .in('myIndex1')
  .doc('documentId')
  .withScript('scriptNameOrContents', {scriptParam1: 'scriptValue1'})
  .exec(function(err, response) {})
```

<a name="bulk" />
#### Bulk

Bulk's only operation is *add*, which takes Elastica operations. Currently, only update operations are supported. Its callback also returns the raw elasticsearch response.

###### Examples

```{javascript}
var update = elastica.update.for('myDocType').in('myIndex1')
elastica.bulk
  .add(update.doc('document1').with({update: 'value1'}))
  .add(update.doc('document2').with({update: 'value2'}))
  .exec(function(err, response) {})

// *Add* can also take an array of operations.
// The code below is equivalent to the code above.

elastica.bulk
  .add([
    update.doc('document1').with({update: 'value1'}), 
    update.doc('document2').with({update: 'value2'})
  ]).exec(function(err, response) {})
```

### Responses

The Elastica response object exists primarily to marshall relevant values from the elastic search response. It has the following properties:

<a name="raw" />
#### Raw

A field containing the raw response from elasticsearch.

```{javascript}
elastica.search.exec(query, function(err, res) {
  console.dir(res.raw) // This will print the unmodified response body.
})
```

<a name="hits" />
#### Hits

A function that returns the array of documents retrieved.
```{javascript}
elastica.search.exec(query, function(err, res) {
  console.dir(res.hits()) // This will print the documents returned.
})
```

#### Aggs 

Aggs is an object that provides functions to pull relevant data from the aggregations portion of the Elasticsearch response. There are four types of Elastica aggregations which map to ES aggregations. 

<a name="valueAgg" />
__Value Aggregations__

Value aggregations map to the *avg*, *sum*, *max*, and *min* elasticsearch aggregations. The return value will be a key/value pair where the key is the aggregation name and the value is the aggregation value.

```{javascript}
// Elasticsearch response is: 
// { aggregations: { totalSales: { value: 400 } } }

console.dir(res.aggs.sum('totalSales')) //Prints { totalSales: 400 }
```

<a name="multiValueAgg" />
__Multi Value Aggregations__

Multi value aggregations map to the *percentiles* elasticsearch aggregation. 

```{javascript}
// Elasticsearch response is: 
// { aggregations: { salesPercentages: { values: { 25: 100, 50: 350, 75: 450 } } } }

console.dir(res.aggs.percentiles('salesPercentages')) 
// Prints { salesPercentages: { 25: 100, 50: 350, 75: 450 } }

console.dir(res.aggs.percentiles('salesPercentages', {asArray: true})) 
// Prints { salesPercentages: [{key: 25, value: 100}, {key: 50, value: 350}, {key: 75, value: 450}] }
```

<a name="countAgg" />
__Count Aggregations__

Count aggregations map to the *nested* and *filtered* elasticsearch aggregations.

```{javascript}
// Elasticsearch response is: 
// { aggregations: { highValuedSales: { doc_count: 500 } }

console.dir(res.aggs.filter('highValuedSales')) 
// Prints { highValuedSales: { count: 500 } }
```

<a name="multiCountAgg" />
__Multi Count Aggregations__

Count aggregations map to the *ranges*, *terms*, *histogram*, and *geohashGrid* elasticsearch aggregations.

```{javascript}
// Elasticsearch response is: 
// { aggregations: { name: { buckets: [{key: 'Alice', doc_count: 100}, {key: 'Bob', doc_count: 200}] } }

console.dir(res.aggs.terms('name')) 
// Prints [{name: 'Alice', count: 100}, {name: 'Bob', count: 200}]
```


aggs.terms('artists', {with: 'range[transactions.revenue sales]'}

__Dot notation__

If you have deeply nested single count aggregations, you can use dot notation to access deeply nested child values.

```{javascript}
// Elasticsearch response is: 
// { 
//   aggregations: { 
//     successfulTransactions: { 
//       doc_count: 500,  highValued:  { doc_count: 100, grossRevenue: {value: 1000000 } } 
//     } 
//   } 
// }

console.dir(res.aggs.sum('successfulTransactions.highValued.grossRevenue')) 
// Prints { grossRevenue: 10000000 }
```

__Subaggregations (The *with* option)__

Count and Multicount aggregations support accessing child aggregations with a space separated subaggregations expressions. Subaggregation expressions follow the [EBNF](http://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_Form) grammar below: 

buckets = "["{subagg}"]"
subagg = [type:]name[buckets]
expression = {subagg}

```{javascript}
// Elasticsearch response is: 
// aggregations: {                                                                                                  
//   name: {                                                                                                        
//     buckets: [                                                                                                   
//       {                                                                                                          
//         key: "Alice",                                                                                            
//         doc_count: 300,                                                                                        
//         conversionRate: { value: 0.56 },                                                                         
//         transactions: {                                                                                          
//           doc_count: 200,                                                                                        
//         }                                                                                                        
//       },                                                                                                         
//       {                                                                                                          
//         key: "Bob",                                                                                              
//         doc_count: 200,                                                                                          
//         conversionRate: { value: 0.78 },                                                                         
//         transactions: {                                                                                          
//           doc_count: 350,                                                                                        
//         }                                                                                                        
//       }                                                                                                          
//     ]                                                                                                            
//   }                                                                                                              
// }

console.dir(res.aggs.terms('name', {with: 'nested:transactions conversionRate'})) 
// Prints [{name: "Alice", total: 300, conversionRate: 0.56, transactions: {total: 200}},
//         {name: "Bob", total: 200, conversionRate: 0.78, transactions: {total: 350}}]
```

### What's next?

* Interface for building queries.
* Support for add operations
* Support for delete operations
