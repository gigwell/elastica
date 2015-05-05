# Elastical
A flexible chaining API for ElasticSearch

Installation
------------

`npm install elastica`

Usage
-----
### Initialization
Pass in the your JS elasticsearch API config. See the [ES docs][]

```javascript
var elastica = require('elastica')(config.elasticsearch)
```

### Search
Chainable interface to make an ES search. The query will be built until exec is called.

```javascript
elastica.search
  .for('type')
  .in('index')
  .compile("{}")
  .exec()
```

#### Methods

##### for

__Arguments__
* type <String> - the document type being queries

##### in
__Arguments__
* index <String> - the indices to query

##### compile
__Arguments__
* queryTemplate <String> - an erb style template containing the body of the query

##### exec
__Arguments__
* queryOptions <Object> - object containing the value to populate the template
* requestOptions <Object> - object containing the options for the ES request
* callback <Function(err, Response)> - The callback will return a Response object


### Update
Chainable interface to update a document. The command will be built until exec is called

```javascript
elastica.update
  .doc('id')
  .in('index')
  .with({field: 'value'})
  .exec()
```

#### Methods

##### for

__Arguments__
* type <String> - the document type being queries

##### in
__Arguments__
* index <String> - the indices to query

##### doc
__Arguments__
* id <String> - The id of the document to update

##### with
__Arguments__
* doc <Object> - The contents of the update

##### withScript
__Arguments__
* script <String> - The script name / contents
* params <Object> - The script params

##### exec
__Argument__
*callback <Function(err, response)> - The callback will return the raw ES reponse

### Bulk
Chainable interface for bulk updates

```javascript
var update = elastica.update.in('index')
var bulk = elastica.bulk
var u1 = update.doc('id').with({field: 'value1'})
var u2 = update.doc('id2').with({field: 'value2'})
bulk.add(u1).add(u2).exec()
```

#### Methods

##### add
__Arguments__
* Elastica Operation <Object> - the Elastica operation to add to the bulk operation

##### exec
__Argument__
*callback <Function(err, response)> - The callback will return the raw ES reponse


