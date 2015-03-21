# Introduction #

This project is for plugins for [jQuery](http://jquery.com/) that enable you to generate and manipulate [RDF](http://www.w3.org/TR/REC-rdf-syntax/) within web pages. There are two main aims of this project:

  * to provide a way of querying and manipulating RDF triples within Javascript that is as intuitive as jQuery is for querying and manipulating a DOM
  * to provide a way of gleaning RDF from elements within a web page, whether that RDF is represented as [RDFa](http://www.w3.org/TR/xhtml-rdfa-primer/) or with a [microformat](http://microformats.org).

If you want to get an idea of what rdfQuery can help you with read this description of [using rdfQuery for progressive enhancement of web pages](http://www.jenitennison.com/blog/node/94) and take a look at the [markup demo](http://rdfquery.googlecode.com/svn/trunk/demos/markup/markup.html) that it describes.

# The Plugins #

Processing RDF embedded within web pages involves using a large number of other technologies that aren't particularly well supported in Javascript or jQuery. Some of these plugins may be useful even if you're not using RDF. The plugins are:

  * [jquery.uri.js](URIPlugin.md) for parsing and resolving URIs
  * [jquery.xmlns.js](XmlnsPlugin.md) for resolving namespaces within HTML pages
  * [jquery.datatype.js](DatatypePlugin.md) for defining and validating values of different datatypes
  * [jquery.curie.js](CuriePlugin.md) for processing [CURIEs](http://www.w3.org/TR/curie/)
  * [jquery.rdf.js](RdfPlugin.md) for storing and querying RDF triples
  * [jquery.rdfa.js](RdfaPlugin.md) for generating RDF triples from RDFa
  * [jquery.rules.js](RdfRulesPlugin.md) for defining rules and reasoning over databanks