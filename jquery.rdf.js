/*
 * jQuery RDF @VERSION
 * 
 * Copyright (c) 2008 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *	jquery.uri.js
 *  jquery.xmlns.js
 *  jquery.datatype.js
 *  jquery.curie.js
 */
/*global jQuery */
(function ($) {

	var 
		memResource = {},
		memBlank = {},
		memLiteral = {},
		memTriple = {},
		xsdNs = "http://www.w3.org/2001/XMLSchema#",
		rdfNs = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
		uriRegex = /^<(([^>]|\\>)*)>$/,
		literalRegex = /^("""((\\"|[^"])*)"""|"((\\"|[^"])*)")(@([a-z]+(-[a-z0-9]+)*)|\^\^(.+))?$/,
		tripleRegex = /(("""((\\"|[^"])*)""")|("(\\"|[^"]|)*")|(<(\\>|[^>])*>)|\S)+/g,
		
		blankNodeSeed = new Date().getTime() % 1000,
		blankNodeID = function () {
			blankNodeSeed += 1;
			return 'b' + blankNodeSeed.toString(16);
		},
		
		subject = function (subject, opts) {
			if (typeof subject === 'string') {
				try {
					return $.rdf.resource(subject, opts);
				} catch (e) {
					try {
						return $.rdf.blank(subject, opts);
					} catch (f) {
						throw {
							name: "BadTriple",
							message: "Subject " + subject + " is not a resource: " + f.message
						};
					}
				}
			} else {
				return subject;
			}
		},
		
		property = function (property, opts) {
			if (property === 'a') {
				return $.rdf.type;
			} else if (typeof property === 'string') {
				try {
					return $.rdf.resource(property, opts);
				} catch (e) {
					throw {
						name: "BadTriple",
						message: "Property " + property + " is not a resource: " + e.message
					};
				}
			} else {
				return property;
			}
		},
		
		object = function (object, opts) {
			if (typeof object === 'string') {
				try {
					return $.rdf.resource(object, opts);
				} catch (e) {
					try {
						return $.rdf.blank(object, opts);
					} catch (f) {
						try {
							return $.rdf.literal(object, opts);
						} catch (g) {
							throw {
								name: "BadTriple",
								message: "Object " + object + " is not a resource or a literal: " + g.message
							};
						}
					}
				}
			} else {
				return object;
			}
		},
		
		parseFilter = function (filter, options) {
			var
			 	s, p, o,
				m = filter.match(tripleRegex);
			if (m.length === 3 || (m.length === 4) && m[3] === '.') {
				s = m[0];
				p = m[1];
				o = m[2];
				s = s.substring(0, 1) === '?' ? s.substring(1) : subject(s, options);
				p = p.substring(0, 1) === '?' ? p.substring(1) : property(p, options);
				o = o.substring(0, 1) === '?' ? o.substring(1) : object(o, options);
				return { subject: s, property: p, object: o };
			} else {
				throw {
					name: "MalformedFilter",
					message: "The filter " + filter + " is not legal"
				};
			}
		},
		
		fillFilter = function (filter, bindings) {
			if (typeof filter.subject === 'string' &&
			    bindings[filter.subject]) {
				filter.subject = bindings[filter.subject];
			}
			if (typeof filter.property === 'string' &&
			    bindings[filter.property]) {
				filter.property = bindings[filter.property];
			}
			if (typeof filter.object === 'string' &&
			    bindings[filter.object]) {
				filter.object = bindings[filter.object];
			}
			return filter;
		},
		
		testResource = function (resource, filter, existing) {
			if (typeof filter === 'string') {
				if (existing[filter] && existing[filter] !== resource) {
					return null;
				} else {
					existing[filter] = resource;
					return existing;
				}
			} else if (filter === resource) {
				return existing;
			} else {
				return null;
			}
		},
		
		testTriple = function (triple, filter) {
			var binding = {};
			binding = testResource(triple.subject, filter.subject, binding);
			if (binding === null) {
				return null;
			}
			binding = testResource(triple.property, filter.property, binding);
			if (binding === null) {
				return null;
			}
			binding = testResource(triple.object, filter.object, binding);
			return binding;
		},
		
		findTriples = function (triples, filter) {
			var matches = [];
			$.each(triples, function (i, triple) {
				var bindings = testTriple(triple, filter);
				if (bindings !== null) {
					matches.push({ bindings: bindings, triples: [triple] });
				}
			});
			return matches;
		},
		
		mergeMatches = function (existingMs, newMs) {
			var matches = [];
			if (existingMs.length === 0) {
				return newMs;
			}
			$.each(existingMs, function (i, existingM) {
				$.each(newMs, function (j, newM) {
					// For newM to be compatible with existingM, all the bindings
					// in newM must either be the same as in existingM, or not
					// exist in existingM
					var isCompatible = true;
					$.each(newM.bindings, function (k, b) {
						if (!(existingM.bindings[k] === undefined ||
							    existingM.bindings[k] === b)) {
							isCompatible = false;
							return false;
						}
					});
					if (isCompatible) {
						matches.push({ 
							bindings: $.extend({}, existingM.bindings, newM.bindings), 
							triples: $.unique(existingM.triples.concat(newM.triples))
						});	
					}
				});
			});
			return matches;
		};
		
	$.typedValue.types['http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral'] = {
		regex: /^.*$/,
		strip: false,
		value: function (v) {
			return v;
		}
	};

	// Trying to follow jQuery's general pattern, to get the same effect
	$.rdf = function (triples, options) {
		return new $.rdf.fn.init(triples, options);
	};

	$.rdf.fn = $.rdf.prototype = {		
		init: function (triples, options) {
			var i = 0;
			this.length = 0;
			this.tripleStore = [];
			this.filters = [];
			triples = triples || [];
			for (; i < triples.length; i += 1) {
				this.add(triples[i], options);
			}
			return this;
		},
	
		size: function () {
			return this.length;
		},
		
		add: function (triple, options) {
			var 
				tripleStore = this.tripleStore,
				filters = this.filters, 
				matches = [];
			if (typeof triple === 'string') {
				triple = $.rdf.triple(triple, options);
			}
			this.tripleStore.push(triple);
			$.each(filters, function (i, filter) {
				var bindings, triples, otherFilters, f, m;
				bindings = testTriple(triple, filter);
				if (bindings !== null) {
					triples = [triple];
					otherFilters = filters;
					otherFilters.splice(i, 1); // remove the matching filter from the set of filters
					while (otherFilters.length > 0) {
						f = fillFilter(otherFilters[0], bindings);
						m = findTriples(tripleStore, f);
						if (m.length === 0) {
							break; // break out of the while loop, not having added anything
						}
						bindings = $.extend(bindings, m.bindings);
						triples.push(m.triples);
						otherFilters.splice(0, 1);
					}
					if (otherFilters.length === 0) {
						matches.push({ bindings: bindings, triples: triples });
					}
				}
			});
			Array.prototype.push.apply(this, matches);
			return this;
		},
		
		get: function (num) {
			return (num === undefined) ? $.makeArray(this) : this[num];
		},
		
		each: function (callback, args) {
			return $.each(this, callback, args);
		},
		
		bindings: function () {
			var bindings = [];
			$.each(this, function (i, match) {
				bindings.push(match.bindings);
			});
			return bindings;
		},
		
		triples: function () {
			var i, triples = [];
			for (i = 0; i < this.length; i += 1) {
				triples.push(this[i].triples);
			}
			return triples;
		},
		
		where: function (filter, options) {
			var matches = [];
			filter = parseFilter(filter, options);
			this.filters.push(filter);
			matches = findTriples(this.tripleStore, filter);
			matches = mergeMatches(this, matches);
			this.length = 0;
			Array.prototype.push.apply(this, matches);
			return this;
		},
		
		filter: function (binding, condition) {
			var func, matches = [];
			if (typeof binding === 'string') {
				if (condition.constructor === RegExp) {
					func = function (bindings) {
						return condition.test(bindings[binding].value);
					};
				} else {
					func = function (bindings) {
						return bindings[binding].value === condition;
					};
				}
			} else {
				func = binding;
			}
			$.each(this, function (i, match) {
				if (func(match.bindings)) {
					matches.push(match);
				}
			});
			this.length = 0;
			Array.prototype.push.apply(this, matches);
			return this;
		}
	};

	$.rdf.fn.init.prototype = $.rdf.fn;

	$.rdf.gleaners = [];

	$.fn.rdf = function () {
		var i, j, match, triples = [];
		for (i = 0; i < $(this).length; i += 1) {
			match = $(this).eq(i);
			for (j = 0; j < $.rdf.gleaners.length; j += 1) {
				triples = triples.concat($.rdf.gleaners[j].call(match))
			}
		}
		return $.rdf(triples);
	};

/*
 * Triples
 */

	$.rdf.triple = function (subject, property, object, options) {
		var triple, m;
		// using a two-argument version; first argument is a Turtle statement string
		if (object === undefined) { 
			options = property;
			m = $.trim(subject).match(tripleRegex);
			if (m.length === 3 || (m.length === 4 && m[3] === '.')) {
				subject = m[0];
				property = m[1];
				object = m[2];
			} else {
				throw {
					name: "BadTriple",
					message: "Couldn't parse string: " + subject
				};
			}
		}
		if (memTriple[subject] && memTriple[subject][property] && memTriple[subject][property][object]) {
			return memTriple[subject][property][object];
		}
		triple = new $.rdf.triple.fn.init(subject, property, object, options);
		if (memTriple[triple.subject] && 
			  memTriple[triple.subject][triple.property] && 
			  memTriple[triple.subject][triple.property][triple.object]) {
			return memTriple[triple.subject][triple.property][triple.object];
		} else {
			if (memTriple[triple.subject] === undefined) {
				memTriple[triple.subject] = {};
			}
			if (memTriple[triple.subject][triple.property] === undefined) {
				memTriple[triple.subject][triple.property] = {};
			}
			memTriple[triple.subject][triple.property][triple.object] = triple;
			return triple;
		}
	};

	$.rdf.triple.fn = $.rdf.triple.prototype = {
		subject: undefined,
		property: undefined,
		object: undefined,
		
		init: function (s, p, o, options) {
			var opts, m;
			opts = $.extend({}, $.rdf.triple.defaults, options);
			this.subject = subject(s, opts);
			this.property = property(p, opts);
			this.object = object(o, opts);
			return this;
		},
		
		toString: function () {
			return this.subject + ' ' + this.property + ' ' + this.object + ' .';
		}
	};

	$.rdf.triple.fn.init.prototype = $.rdf.triple.fn;
	
	$.rdf.triple.defaults = {
		base: $.uri.base(),
		namespaces: {}
	};

/*
 * Resources
 */ 

	$.rdf.resource = function (value, options) {
		var resource;
		if (memResource[value]) {
			return memResource[value];
		}
		resource = new $.rdf.resource.fn.init(value, options);
		if (memResource[resource]) {
			return memResource[resource];
		} else {
			memResource[resource] = resource;
			return resource;
		}
	};

	$.rdf.resource.fn = $.rdf.resource.prototype = {
		resource: true,
		uri: undefined,
		blank: false,
		
		init: function (value, options) {
			var m, prefix, uri, opts;
			if (typeof value === 'string') {
				m = uriRegex.exec(value);
				opts = $.extend({}, $.rdf.resource.defaults, options);
				if (m !== null) {
					this.uri = $.uri.resolve(m[1].replace(/\\>/g, '>'), opts.base);
				} else if (value.substring(0, 1) === ':') {
					uri = opts.namespaces[''];
					if (uri === undefined) {
						throw {
							name: "MalformedResource",
							message: "No namespace binding for default namespace"
						};
					} else {
						this.uri = $.uri.resolve(uri + value.substring(1));
					}
				} else if (value.substring(value.length - 1) === ':') {
					prefix = value.substring(0, value.length - 1);
					uri = opts.namespaces[prefix];
					if (uri === undefined) {
						throw {
							name: "MalformedResource",
							message: "No namespace binding for prefix " + prefix
						};
					} else {
						this.uri = $.uri.resolve(uri);
					}
				} else {
					try {
						this.uri = $.curie(value, { namespaces: opts.namespaces });
					} catch (e) {
						throw {
							name: "MalformedResource",
							message: "Bad format for resource: " + e.message
						};
					}
				}
			} else {
				this.uri = value;
			}
			return this;
		}, // end init
		
		toString: function () {
			return '<' + this.uri + '>';
		}
	};

	$.rdf.resource.fn.init.prototype = $.rdf.resource.fn;
	
	$.rdf.resource.defaults = {
		base: $.uri.base(),
		namespaces: {}
	};

	$.rdf.type = $.rdf.resource('<' + rdfNs + 'type' + '>');

	$.rdf.blank = function (value, options) {
		var blank;
		if (memBlank[value]) {
			return memBlank[value];
		}
		blank = new $.rdf.blank.fn.init(value, options);
		if (memBlank[blank]) {
			return memBlank[blank];
		} else {
			memBlank[blank] = blank;
			return blank;
		}
	};
	
	$.rdf.blank.fn = $.rdf.blank.prototype = {
		resource: true,
		blank: true,
		id: undefined,
		
		init: function (value, options) {
			if (value === '[]') {
				this.id = blankNodeID();
			} else if (value.substring(0, 2) === '_:') {
				this.id = value.substring(2);
			} else {
				throw {
					name: 'MalformedBlankNode',
					message: value + " is not a legal format for a blank node"
				};
			}
			return this;
		},
		
		toString: function () {
			return '_:' + this.id;
		}
	};

	$.rdf.blank.fn.init.prototype = $.rdf.blank.fn;

	$.rdf.literal = function (value, options) {
		var literal;
		if (memLiteral[value]) {
			return memLiteral[value];
		}
		literal = new $.rdf.literal.fn.init(value, options);
		if (memLiteral[literal]) {
			return memLiteral[literal];
		} else {
			memLiteral[literal] = literal;
			return literal;
		}
	};

	$.rdf.literal.fn = $.rdf.literal.prototype = {
		resource: false,
		blank: false,
		value: undefined,
		lang: undefined,
		datatype: undefined,
		
		init: function (value, options) {
			var 
				m, datatype,
				opts = $.extend({}, $.rdf.literal.defaults, options);
			if (opts.lang !== undefined && opts.datatype !== undefined) {
				throw {
					name: "MalformedLiteral",
					message: "Cannot define both a language and a datatype for a literal"
				};
			}
			if (opts.datatype !== undefined) {
				datatype = $.safeCurie(opts.datatype, { namespaces: opts.namespaces });
				$.extend(this, $.typedValue(value.toString(), datatype));
			} else if (opts.lang !== undefined) {
				this.value = value.toString();
				this.lang = opts.lang;
			} else if (typeof value === 'boolean') {
				$.extend(this, $.typedValue(value.toString(), xsdNs + 'boolean'));
			} else if (typeof value === 'number') {
				$.extend(this, $.typedValue(value.toString(), xsdNs + 'double'));
			} else if (value === 'true' || value === 'false') {
				$.extend(this, $.typedValue(value, xsdNs + 'boolean'));
			} else if ($.typedValue.valid(value, xsdNs + 'integer')) {
				$.extend(this, $.typedValue(value, xsdNs + 'integer'));
			} else if ($.typedValue.valid(value, xsdNs + 'decimal')) {
				$.extend(this, $.typedValue(value, xsdNs + 'decimal'));
			} else if ($.typedValue.valid(value, xsdNs + 'double') &&
			           !/^\s*([\-\+]?INF|NaN)\s*$/.test(value)) {  // INF, -INF and NaN aren't valid literals in Turtle
				$.extend(this, $.typedValue(value, xsdNs + 'double'));
			} else {
				m = literalRegex.exec(value);
				if (m !== null) {
					this.value = (m[2] || m[4]).replace(/\\"/g, '"');
					if (m[9]) {
						datatype = $.rdf.resource(m[9], opts);
						$.extend(this, $.typedValue(this.value, datatype.uri));
					} else if (m[7]) {
						this.lang = m[7];
					}
				} else {
					throw {
						name: "MalformedLiteral",
						message: "Couldn't recognise the value " + value
					};
				}
			}
			return this;
		}, // end init
		
		toString: function () {
			var val = '"' + this.value + '"';
			if (this.lang !== undefined) {
				val += '@' + this.lang;
			} else if (this.datatype !== undefined) {
				val += '^^<' + this.datatype + '>';
			}
			return val;
		}
	};

	$.rdf.literal.fn.init.prototype = $.rdf.literal.fn;
	
	$.rdf.literal.defaults = {
		base: $.uri.base(),
		namespaces: {},
		datatype: undefined,
		lang: undefined
	};

})(jQuery);
