# jQuery.rdf.js #

The purpose of the RDF Plugin is to allow you to create, store and query RDF triples in a jQuery-like way.

First, you have to create a databank: a store for RDF triples. You can do this in two ways: create it by hand or create it by gleaning information from the web page.

# Creating a Databank by Hand #

You can create a databank by hand using the syntax:

```
$.rdf.databank(array[, options])
```

The array that you pass to `$.rdf.databank()` can be an array of strings or an array of `$.rdf.triple` objects. For example, you can do:

```
$.rdf.databank([
    '<photo1.jpg> dc:creator <http://www.blogger.com/profile/1109404> .',
    '<http://www.blogger.com/profile/1109404> foaf:img <photo1.jpg> .'
  ], 
  { base: 'http://www.example.org/',
    namespaces: { 
      dc: 'http://purl.org/dc/elements/1.1/', 
      foaf: 'http://xmlns.com/foaf/0.1/' } })
```

The strings in the array use a simplified version of the [Turtle](http://www.dajobe.org/2004/01/turtle/) statement syntax.
In the above case, the triples that are generated will be:

```
<http://www.example.org/photo1.jpg> <http://purl.org/dc/elements/1.1/creator> <http://www.blogger.com/profile/1109404> .
<http://www.blogger.com/profile/1109404> <http://xmlns.com/foaf/0.1/img> <http://www.example.org/photo1.jpg> .
```

The base URI for resolving any relative URIs in those statements is provided by the `base` option, and defaults to the base URI of the source document (which may be specified using the `<base>` element in the document's `<head>`). The namespace bindings for resolving the prefixes used in those statements are provided by the `namespaces` option. If you supply a second argument when creating the triple store, the base URI and prefix bindings that you specify will be stored and can be used later on when you query the triple store.

The `prefix()` method can be used to bind a prefix prior to using that prefix, and the `base()` method can also be used for setting the base URI used to interpret relative URIs. The `add()` method can be used to add triples individually, so the above could also be done with:

```
$.rdf.databank()
  .base('http://www.example.org/')
  .prefix('dc', 'http://purl.org/dc/elements/1.1/')
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .add('<photo1.jpg> dc:creator <http://www.blogger.com/profile/1109404> .')
  .add('<http://www.blogger.com/profile/1109404> foaf:img <photo1.jpg> .')
```

which follows a more jQuery-like pattern.

If you're creating triples programmatically, you might find it easier to pass those triples in more directly. You can do:

```
$.rdf.databank([
  $.rdf.triple('_:book1 dc:title "SPARQL Tutorial" .', {
    namespaces: { dc: 'http://purl.org/dc/elements/1.1/' }
  }),
  $.rdf.triple('_:book1  ns:price  42 .', {
    namespaces: { ns: 'http://www.example.org/ns/' }
  })])
```

This will produce the triples:

```
_:book1 <http://purl.org/dc/elements/1.1/title> "SPARQL Tutorial" .
_:book1 <http://www.example.org/ns/price> 42 .
```

In this case, the subject of both triples is a blank node with the id `book1`. The object of the first triple is a plain literal and the object of the second triple is the integer 42.

There are two ways of calling `$.rdf.triple()`. You can use the syntax:

```
$.rdf.triple(string[, options])
```

or the syntax:

```
$.rdf.triple(subject, property, object[, options])
```

In the latter case, the subject, property and object can be strings or you can create resources, blank nodes and literal values directly. For example, the triple:

```
_:book1 <http://www.example.org/ns/price> 42 .
```

could be created using:

```
$.rdf.triple(
  $.rdf.blank('_:book1'), 
  $.rdf.resource('ns:price', { namespaces: { ns: 'http://www.example.org/ns/' }}),
  $.rdf.literal(42))
```

The three kinds of values that you can use for subjects, properties and objects are shown in the following table. Every value has a `type` and a `value` property:

| **kind** | `type` | `value` | **example** |
|:---------|:-------|:--------|:------------|
| resource | `uri` | URI | `"http://example.org/ns/price"` |
| literal | `literal` | string value | `"42"` |
| blank node | `bnode` | QName | `"_:book1"` |

Literal values can also have extra properties: `datatype` (which is a URI) or `lang`.

# Creating a Triple Store From HTML #

Triple stores can be created based on elements in the page using "gleaners". To create a triple store based on an element, you can use the `rdf()` method on a jQuery object. Gleaners are functions that operate on jQuery objects and generate triples. An example is the RDFa gleaner, which interprets the RDFa that is embedded within a web page. For example, if you are using the RDFa gleaner and your page contains:

```
<p id="info">This paper was written by <span rel="dc:creator" resource="#me"><span property="foaf:name">Ben Adida</span>.</span></p>
```

you could do:

```
$('#info').rdf()
```

to create a triple store that contains the triples:

```
<> dc:creator <#me> .
<#me> foaf:name "Ben Adida" .
```

Gleaners can be added on an adhoc basis within plugins. For example, to add RDFa processing to the normal `rdf()` method, the RDFa plugin contains the line:

```
$.rdf.gleaners.push(rdfa);
```

where `rdfa` is a reference to a function that does the gleaning. Have a look at `jquery.rdfa.js` to see this in more detail. Additional gleaners have been written for microformats, for example.

# Querying RDF #

Once you have a databank, you can create query objects over it. The parallel aims here are:

  * to provide a similar, simple interface for querying RDF as that jQuery gives you for querying the HTML DOM
  * to support the same level of querying of RDF within Javascript as that offered by SPARQL

This is probably easiest demonstrated using an example. Say that you wanted to find out all the people that have been mentioned within a particular section of your page, and that those people had (through RDFa or microformats) been marked as `foaf:Person` and some people also had depictions on the page. You could create a list of people's images using:

```
$('#list').empty();
$('#content')
  .rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .where('?person a foaf:Person')
  .where('?person foaf:depiction ?picture')
  .optional('?person foaf:name ?name')
  .each(function () {
    var 
      person = this.person.value,
      picture = this.picture.value,
      name = this.name === undefined ? '' : this.name.value;
    $('#list')
      .append('<li><a href="' + person + '"><img alt="' + name + '" src="' + picture + '" /></a></li>');
  });
```

Just as jQuery objects hold elements, an rdfQuery object holds objects that it creates based on queries over the databank that it works over. Using the `rdf()` method on a jQuery object actually creates a new databank, and returns a new top-level query over that object. You can create an rdfQuery object more directly with:

```
$.rdf(options)
```

The options that the `$.rdf()` function accepts include `databank`, to provide a databank directly; `triples` to provide a set of triples for a new databank; `base`, which sets the base URI on the databank; and `namespaces` which provides a set of namespace bindings. You can also populate the databank that a query runs over as if you were working over the databank itself. So you can do:

```
$.rdf()
  .base('http://www.example.org/')
  .prefix('dc', 'http://purl.org/dc/elements/1.1/')
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .add('<photo1.jpg> dc:creator <http://www.blogger.com/profile/1109404> .')
  .add('<http://www.blogger.com/profile/1109404> foaf:img <photo1.jpg> .')
```

rdfQuery objects generally hold collections of objects representing the results of a query. A top-level query doesn't hold any such objects, but the query methods `about()`, `where()`, `optional()` and `filter()` can be used to create, add properties to, or filter out these objects.

The `about()` method creates a set of objects with `property` and `value` properties, one for each piece of data known about the resource that's passed as the argument. For example, if you have:

```
<p id="content" about="[dbpedia:The_Beatles]"><span property="p:name">The Beatles</span> comprised <span rel="p:currentMembers" resource="[dbpedia:John_Lennon]">John</span>, <span rel="p:currentMembers" resource="[dbpedia:Paul_McCartney]">Paul</span>, <span rel="p:currentMembers" resource="[dbpedia:George_Harrison]">George</span> and <span rel="p:currentMembers" resource="[dbpedia:Ringo_Starr]">Ringo</span>.</p>
```

and you do:

```
$('#content')
  .rdf()
  .prefix('dbpedia', 'http://dbpedia.org/resource/')
  .about('dbpedia:The_Beatles')
```

the resulting rdfQuery object will hold five objects, one of whose `property` property is `p:name`, and others whose `property` property is `p:currentMembers`.

The `where()` method creates objects whose properties are named after the variables used in the query and that have values based on the information in the databank. The `optional()` method works in a similar way, but is used for properties that are optional in the query result. In the example

```
$('#content')
  .rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .where('?person a foaf:Person')
  .where('?person foaf:depiction ?picture')
  .optional('?person foaf:name ?name')
```

the result objects have `person` and `picture` properties, and some may have `name` properties.

The matches can be chained, as shown above, and can be filtered with the `filter()` method. There are three patterns of use of the `filter()` method. The first is to filter the matches based on a value:

```
$('#content')
  .rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .where('?person foaf:surname ?surname')
  .filter('surname', 'Jones')
  .each(...);
```

The second also filters by value according to a regular expression. For example:

```
$('#content')
  .rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .where('?person foaf:surname ?surname')
  .filter('surname', /^Ma?c/)
  .each(...);
```

finds people with typically Scottish surnames such as `McFee` or `Macdonald`.

The third way of filtering is with a function that returns true for those matches you want to keep, based on the existing object properties. For example:

```
$('#content')
  .rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .where('?person foaf:surname ?surname')
  .filter(function () {
    return this.person.blank;
  })
  .each(...)
```

finds those people that are represented by a blank node within the RDF.

The callback function you pass to the `filter()` method can have three arguments: the index of the object being filtered, the object itself, and an array of triples that contributed to the object. `this` is always bound to the result object itself.

If you want to "rewind" any `where()`, `optional()` or `filter()` filters, you can do so with `end()`, which works in a similar way to `jQuery.end()`. So you can do:

```
$('#content')
  .rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .where('?person foaf:surname ?surname')
    .filter('surname', /^Ma?c/)
      .each(function () { alert('Scottish: ' + this.surname.value); })
    .end()
    .filter('surname', /^O'/)
      .each(function () { alert('Irish: ' + this.surname.value); })
    .end();
```

which will alert you to Scottish-looking surnames, and then Irish-looking surnames.

If you want to get back to the top-level rdfQuery object, essentially removing all the filters that you've applied to it, you can use the `reset()` method.

Note that adding triples to an rdfQuery object may actually change the number of matches that it contains. For example:

```
$.rdf()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .add('<photo1.jpg> dc:creator <http://www.blogger.com/profile/1109404> .')
  .add('<http://www.blogger.com/profile/1109404> foaf:img <photo1.jpg> .')
  .where('?photo dc:creator <http://www.blogger.com/profile/1109404>') // rdfQuery object has one match
  .add('<photo2.jpg> dc:creator <http://www.blogger.com/profile/1109404> .') // rdfQuery object now has two matches
  .each(...);
```

If you want to perform two parallel queries on a set of triples, create a top-level query first, and use that as the basis of your subsequent queries::

```
var rdf = $.rdf()
  .prefix('dc10', 'http://purl.org/dc/elements/1.0/')
  .prefix('dc11', 'http://purl.org/dc/elements/1.1/>')
  .add('_:a  dc10:title     "SPARQL Query Language Tutorial" .')
  .add('_:a  dc10:creator   "Alice" .')
  .add('_:b  dc11:title     "SPARQL Protocol Tutorial" .')
  .add('_:b  dc11:creator   "Bob" .')
  .add('_:c  dc10:title     "SPARQL" .')
  .add('_:c  dc11:title     "SPARQL (updated)" .');
var rdfA = rdf.where('?book dc10:title ?title');
var rdfB = rdf.where('?book dc11:title ?title');
```

If you've performed two queries and want to union them together, you can simply add one to the other with the `add()` method:

```
rdf = rdfA.add(rdfB);
```

You can then filter the resulting union:

```
rdf.where('?book dc10:creator ?author');
```

and you would get back a single match for the book `_:a` with the title "SPARQL Query Language Tutorial" and the author Alice. Additions to the union also carry through to the unioned rdfQuery objects, so if you then do:

```
rdf.add('_:c dc10:creator "Claire" .');
```

The result is:

| **book** | **title** | **author** |
|:---------|:----------|:-----------|
| `_:a` | SPARQL Query Language Tutorial | Alice |
| `_:c` | SPARQL | Claire |
| `_:c` | SPARQL (updated) | Claire |

# Doing Things with Matches #

Once you've got your collection of matches, you can do things with it. Say you did:

```
rdf = 
  $('#content')
    .rdf()
    .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
    .where('?person a foaf:Person')
    .where('?photo foaf:depicts ?person');
```

The rdfQuery object behaves in a similar way to a jQuery object. You can access it like an array: `rdf.length` will give you the number of resulting objects, while `rdf[0]` will give you the first resulting object. You can do these two operations with functions if you prefer: `rdf.size()` will give you the number of results and `rdf.get(0)` will give you the first result.

You can create new triples based on the results that you've found by passing a template to the `add()` method. For example, you can do:

```
rdf
  .add('?person foaf:depiction ?photo')
  .add('?photo a foaf:Image');
```

This will add triples for every photo, saying that it is a depiction of the given person (based on the fact that `foaf:depiction` is the inverse of `foaf:depicts`) and that it is a `foaf:Image` (based on the fact that the range of `foaf:depicts` is `foaf:Image`). This facility allows you to do basic reasoning with rdfQuery.

You can get hold of the triples that were used to create the result objects directly using `rdf.sources()`, which returns a jQuery object wrapped around the array of arrays of triples. For example, you can do:

```
photos = rdf.sources().map(function () { return this.subject; });
```

You can operate on each of the result objects in turn using `each()` and `map()`. Like the equivalent jQuery methods, `each()` performs a given callback function on each of the results within the rdfQuery object, while `map()` creates a jQuery object that wraps an array generated by applying the callback function to each query result in turn and concatenating the results. For example, you could do:

```
photos = rdf.map(function () { return this.photo.value; });
```

The callback functions for `each()` and `map()` take three arguments: the position of the result amongst the other results, the result object itself, and an array of the triples that were used to create the result object. `this` is always bound to the result object itself. (These arguments are the same as those used in the `filter()` callback function.)

Finally, you can simply generate a jQuery object based on the rdfQuery object, using `rdf.jquery()`. The full set of jQuery methods are then available to you.

# Exporting #

If you get hold of an array of triples, for example through the `sources()` method on an rdfQuery object or the `triples()` method on a databank, you can dump them as [RDF/JSON](http://n2.talis.com/wiki/RDF_JSON_Specification) using the `$.rdf.dump()` function. Databanks can also be dumped using the `dump()` method.

For example, if you have:

```
var books = $.rdf.databank()
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .prefix('dc', 'http://purl.org/dc/elements/1.1/')
  .prefix('dct', 'http://purl.org/dc/terms/')
  .prefix('xsd', 'http://www.w3.org/2001/XMLSchema#')
  .add('<http://example.com/aReallyGreatBook> dc:title "A Really Great Book" .')
  .add('<http://example.com/aReallyGreatBook> dc:creator _:creator .')
  .add('_:creator a foaf:Person .')
  .add('_:creator foaf:name "John Doe" .')
  .add('<http://example.com/aReallyGreatBook> dct:issued "2004-01-19"^^xsd:date .')
```

then you can do:

```
var json = books.dump();
```

and `json` will hold the object:

```
{
  'http://example.com/aReallyGreatBook': {
    'http://purl.org/dc/elements/1.1/title': [ { type: 'literal', value: 'A Really Great Book' } ],
    'http://purl.org/dc/elements/1.1/creator': [ { type: 'bnode', value: '_:creator' } ],
    'http://purl.org/dc/terms/issued': [ { type: 'literal', value: '2004-01-19', 
                                           datatype: 'http://www.w3.org/2001/XMLSchema#date } ]
  },
  '_:creator': {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [ { type: 'uri', value: 'http://xmlns.com/foaf/0.1/Person' } ],
    'http://xmlns.com/foaf/0.1/name': [ { type: 'literal', value: 'John Doe' } ]
  }
}
```

This isn't actually JSON, but a Javascript object that you can turn into JSON using something like [jquery-json's](http://code.google.com/p/jquery-json/) `$.toJSON()` function, and then submit it using:

```
$.ajax({
  type: 'POST',
  url: 'http://www.example.com/books/',
  processData: false,
  contentType: 'application/json',
  data: $.toJSON(books.dump())
});
```

The `dump()` method can take an options argument which is an object with the following properties:

  * format: the format of the dump as a mime type. Possible values are `'application/json'` (the default) and `'application/rdf+xml'`.
  * namespaces: an object defining the namespace bindings that will be used in the dump. This is only relevant for XML-based formats. The prefix `rdf` is always bound to the RDF syntax namespace.

For XML-based formats, the `dump()` method actually returns a DOM document rather than a string.

Another way of getting hold of a set of triples is the `describe()` method which, in technical terms, gives a [Symmetric Concise Bounded Description](http://n2.talis.com/wiki/Bounded_Descriptions_in_RDF#Symmetric_Concise_Bounded_Description) of a set of resources. On a databank object, you can use `describe()` to provide triples for particular resource objects (or strings using the normal syntax for resources). On an rdfQuery object, `describe()` can also name particular variables. For example, if you did:

```
var bookQuery = $.rdf({ databank: books })
  .where('?book dc:creator ?author');
var triples = $.rdf.dump(bookQuery.describe('?author'));
```

then `triples` would hold:

```
{
  'http://example.com/aReallyGreatBook': {
    'http://purl.org/dc/elements/1.1/creator': [ { type: 'bnode', value: '_:creator' } ],
  },
  '_:creator': {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [ { type: 'uri', value: 'http://xmlns.com/foaf/0.1/Person' } ],
    'http://xmlns.com/foaf/0.1/name': [ { type: 'literal', value: 'John Doe' } ]
  }
}
```

The `select()` method on an rdfQuery object returns an array that contains objects representing the query bindings as Javascript objects. For example, given:

```
var bookQuery = $.rdf({ databank: books })
  .where('?book dc:creator ?author');
var bindings = bookQuery.select();
```

the `bindings` variable contains:

```
[
  {
    'book': { type: 'uri', value: 'http://example.com/aReallyGreatBook' },
    'author': { type: 'bnode', value: '_:creator' }
  }
]
```

The names of the bindings that should be included can be passed in an array. For example:

```
var bindings = bookQuery.select(['author']);
```