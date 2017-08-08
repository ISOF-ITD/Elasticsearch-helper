var _ = require('underscore');
var elasticsearch = require('elasticsearch');

if (process.argv.length < 5) {
	console.log('node createIndex.js [index name] [host] [login]');

	return;
}

var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

var client = new elasticsearch.Client({
	host: esHost
});

client.indices.create({
	index: process.argv[2] || 'uu-isof-taledb-test',
	body: {
		mappings: {
			textentry: { // 
				properties: {
					date: {
						type: 'date'
					},
					title: {
						type: 'text',
						analyzer: 'swedish'
					},
					text: {
						type: 'text',
						analyzer: 'swedish',
						term_vector: 'with_positions_offsets'
					},
					page: {
						properties: {
							number: {
								type: 'integer'
							}
						}
					},
					type: {
						type: 'text',
						fielddata: 'true'
					},
					persons: {
						type: 'nested',
						properties: {
							id: {
								type: 'string',
								index: 'not_analyzed'
							},
							name: {
								type: 'string',
								index: 'not_analyzed'
							},
							gender: {
								type: 'string',
								index: 'not_analyzed'
							},
							birth_year: {
								type: 'date'
							}
						}
					}
				}
			}
		}
	}
}, function(err) {
	if (err) {
		console.log(err);
	}

	client.indices.close({
		index: process.argv[2] || 'uu-isof-taledb-test',
	}, function() {	
		client.indices.putSettings({
			index: process.argv[2] || 'uu-isof-taledb-test',
			body: {

				"analysis": {

					"filter": {
						"swedish_stop": {
							"type": "stop",
							"stopwords": "_swedish_" 
						},
						"swedish_stemmer": {
							"type": "stemmer",
							"language": "swedish"
						}
					},

					"analyzer": {
						"swedish": {
							"tokenizer": "standard",
							"filter": [
								"lowercase",
								"swedish_stop",
								"swedish_stemmer"
							],
							"char_filter": [
								"html_strip"
							]
						}
					}

				}

			}
		}, function(settingsErr) {
			if (settingsErr) {
				console.log(settingsErr);
			}
			client.indices.open({
				index: process.argv[2] || 'uu-isof-taledb-test'
			})
		});
	})
});
