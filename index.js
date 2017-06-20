#!/usr/bin/env node

var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');

var program = require('commander');
var fury = require('fury');
var apibParser = require('fury-adapter-apib-parser');
var apibIncludeDirective = require('apib-include-directive');

var apibData = '',
	includeDir	
;

fury.use(apibParser);

program
	.option('-i, --input [filepath]', 'API Blueprint file')
	.option('-t, --expand-tabs', "Expand tabs to spaces (Linux and OSX only)")
	.option('-p, --pretty-print', "Enable pretty printing")
	.option('--requests-only', "Include schemas only for requests")
	.parse(process.argv)
;

includeDir = program.input ? path.dirname(program.input) : process.cwd();

(program.input ? fs.createReadStream(program.input) : process.stdin)
	.on('data', function(chunk) {
		apibData += chunk;
	})
	.on('end', function() {
		var data, spaces;

		try {
			apibData = apibIncludeDirective.includeDirective(includeDir, apibData);
		} catch (err) {
			console.error(err.toString());
			return;
		}

		if (! program.expandTabs) {
			parseApib(apibData, print);
		} else {
			expandTabs(apibData, function(err, data) {
				if (err) {
					console.error(err.toString());
				} else {
					parseApib(data, print);	
				}
			});
		}
	})
;

function print(data) {
	spaces = program.prettyPrint ? 2 : null;
	console.log(JSON.stringify(data, null, spaces));
}

function getContents(data, href, transaction) {
	var responsesDef,
		request = transaction.request,
		response = transaction.response,
		method = request.method.toLowerCase()
	;

	href = request.href ? request.href : href;
	
	// replace parameters from endpoint spec
	href = href.replace(/\{\?.+\}/, '');

	if (! data.hasOwnProperty(href)) {
		data[href] = {};
	}

	if (! data[href].hasOwnProperty(method)) {
		data[href][method] = {
			'body': buildBody(request),
		};
	}

	if (! program.requestsOnly) {
		responsesDef = data[href][method]['responses'] = {};
		buildResponses(responsesDef, response);
	}

	return data;
}

function buildResponses(responsesDef, response) {
	if (! response.messageBodySchema) {
		responsesDef[response.statusCode] = {};
		return responsesDef;
	}
	responsesDef[response.statusCode] = {
		body: {
			schema: parseSchemaContent(response.messageBodySchema.content)
		}
	};

	return responsesDef;
}

function buildBody(request) {
	if (! request.messageBodySchema) {
		return {};
	}
	return {
		schema: parseSchemaContent(request.messageBodySchema.content)
	}
}

function parseSchemaContent(content) {
	if (typeof content == 'string') {
		content = JSON.parse(content);
	}
	return content;	
}

function parseApib(source, callback) {
	var data = {};

	fury.parse({source}, function(err, result) {
		var api = result.api,
			href = ''
		;

		if (err) {
			console.error(err.toString() +
				" Try using -t to convert tabs to spaces if you're on Linux or OSX");
			throw err;

		} else {
			api.resourceGroups.forEach(function(resourceGroup) {
				resourceGroup.resources.forEach(function(resource) {
					href = resource.href;
			 
					resource.transitions.forEach(function(transition) {
						href = transition.href ? transition.href : href;

						transition.transactions.forEach(function(transaction) {
							data = getContents(data, href, transaction);
						});
					});
				});
			});	
			callback(data);
		}
		
	});
}

function expandTabs(apibData, callback) {
	var expand = spawn('expand', ['-t', '4']);

	expand.stdin.write(apibData);
	expand.stdin.end();

	apibData = '';

	expand.stdout.on('data', function(data) {
		apibData += data;
	});
	expand.stderr.on('data', function(data) {
		console.error(data.toString());
	});
	expand.on('close', function(code) {
		var err = null;

		if (code > 0) {
			err = new Error('expand failed with error code ' + code);	
		}
		callback(err, apibData);
	});
}
