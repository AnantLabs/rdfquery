# jQuery.rules.js #

The purpose of the RDF Rules Plugin is to allow you to create rules that can be used to reason over a set of triples stored within an databank object or exposed in a query.

# Rules #

The rules supported by this plugin are simple rules that comprise a query over the databank and a resulting set of actions.

The most common kind of rules are rules that map from one triple to another, for example between different vocabularies that define similar concepts:

```
rule = $.rdf.rule('?person a eg:Employee', 
                  '?person a foaf:Person',
                  { namespaces: { eg: 'http://www.example.com/', 
                                  foaf: 'http://xmlns.com/foaf/0.1/' }});
```

The `$.rdf.rule()` function takes three arguments. The first is the left-hand side (condition) of the rule and the second is the right-hand side (consequence) of the rule. The third, optional, argument is an object representing options that are used to interpret the rule, with the properties `namespaces` (used to resolve prefixes in qualified names) and `base` (used to resolve URIs).

The simplest kind of rule has a left-hand side that's comprised of a single pattern. If you reason with the rule (see blow), then whenever there's a match for that pattern within the data, the right-hand side will be run. If the right-hand side is also a pattern, then that pattern is used to create a new triple within the dataset. In the example above, whenever the databank contains a triple that states that someone is an `eg:Employee`, a new triple will be created to say they are also a `foaf:Person`.

The left-hand and right-hand sides can both be arrays of patterns. The patterns on the left-hand side must all match a set of triples for the rule to activate. If the right-hand side is an array, then all the triples indicated by the items in the array are created. For example

```
rule = $.rdf.rule(['?son a eg:Man', '?son eg:parent ?parent'],
                  ['?parent eg:son ?son', '?parent a foaf:Person'],
                  options);
```

says that if a person is a `eg:Man` and there's a `eg:parent` relationship to some parent, then the parent must have a `eg:son` relationship to the person and the parent must be a `foaf:Person`.

The patterns on the right-hand side can include references to blank nodes, in which case a new blank node is created. If several of the patterns refer to the same blank node, the same blank node is used in each of the generated triples. So you can do things like:

```
rule = $.rdf.rule('?person a foaf:Person',
                  ['?person eg:mother _:mother', '_:mother a foaf:Person'],
                  options);
```

which says that every person must have a mother, who is also a person. Different blank nodes for the mother are created for each matching rule. (Executing this rule will cause a loop; see below for how to limit how many times the loop runs.)

If the left-hand side is an array, then as well as patterns it can contain:

  * a two-item array; the first is the name of the wildcard and the second is a regular expression or string against which the value of the wildcard will be matched. The rules for this array are the same as those for the rdfQuery `filter()` method.
  * a function; `this` is an object representing the set of wildcard bindings and it should return `true` if there's a match and `false` if not. This function works in exactly the same way as a function passed to the rdfQuery `filter()` method.

For example:

```
rule = $.rdf.rule(['?child eg:parent ?father',
                   '?father eg:gender ?gender',
                   ['gender', 'male']],
                  '?child eg:father ?father',
                  options);
```

The right-hand side can also have a function as one of the items in the array, in which case this function is called whenever the rule is activated. Within the function, `this` refers to the bindings of the wildcards, and the arguments are:

  * the index number of the match (starting from 0)
  * an object representing the bindings (the same as `this`)
  * an array of the matching triples

# Rule Sets #

Usually instead of individual rules you'll want to create a larger rule set. A rule set essentially comprises multiple rules, but they're easier to define than individual rules primarily because they can share options. Rule sets work a lot like databanks and rdfQuery objects, in that you can set prefixes and a base URI using methods, and then use `.add()` to add rules as desired. For example:

```
rules = $.rdf.ruleset()
  .prefix('eg', 'http://www.example.com/')
  .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
  .add('?person a eg:Employee', 
       '?person a foaf:Person')
  .add(['?son a eg:Man', '?son eg:parent ?parent'],
       ['?parent eg:son ?son', '?parent a foaf:Person'])
  .add('?person a foaf:Person',
       ['?person eg:mother _:mother', '_:mother a foaf:Person']);
```

As you can see, the `.add()` method takes the left-hand side and right-hand side of the rule as arguments, and these work in exactly the same way as the arguments to `$.rdf.rule()` described above.

# Reasoning #

There are four ways to reason with the rules that you've declared:

  * use the `.run()` method on a rule object, passing in a databank object as the argument
  * use the `.run()` method on a ruleset object, passing in a databank object as the argument
  * use the `.reason()` method on a databank object, passing in a rule or ruleset as the argument
  * use the `.reason()` method on a rdfQuery object, passing in a rule or ruleset as the argument

The latter two both return the databank or rdfQuery object itself, so you can do method chaining such as:

```
rdf = $('#content').rdfa()
  .reason(rules)
  .where('?person a foaf:Person')
  ...
```

There are three small complexities that you might be worrying about so I'll mention them:

  * It's impossible for the same triple to be added to a databank more than once; you won't get duplicate triples through reasoning.
  * If you reason over a databank, and then add some more triples manually, then reason again, then all the rules that fire the second time will be ones matching the new triples; the same rules don't get fired twice over a particular databank, so you won't get multiple blank nodes being created, for example.
  * If you have rules that lead to infinite loops, such as the one that stated that every person has a mother (who is a person) as above, it will iterate 50 times by default. You have control over this limit through a second argument to the `.reason()` and `.run()` methods, for example:

```
rdf = $('#content').rdfa()
  .reason(rules, { limit: 100 })
  .where('?person a foaf:Person')
  ...
```