var _ = require('underscore');
var elasticsearch = require('elasticsearch');

// I den här script använder vi command line arguments. Olika arguments finns i process.argv[x].
// Command prompt gör man så: "node createIndex.js [index name] [host] [login] [data file]"

// Först kollar vi om vi inte har 5 argumenter, om inte stannar programmet.
if (process.argv.length < 5) {
	console.log('node createIndex.js [index name] [host] [login]');

	return;
}

// Bygger upp url till Elaticsearch
var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

// Skapar ny Elasticsearch JavaScript client
var client = new elasticsearch.Client({
	host: esHost
});

/*
client.indices.create lägger till mapping för dokument-typ "textentry".

Följande exempel dokument kan läggas till den här indexen:
{
	"date": "1942-12-01",
	"title": "Kyrkobygge",
	"text": "Det var några sockenmän, som kivades om var de skulle bygga kyrkan [...]",
	"page": {
		"number": 3
	},
	"type": "legend",
	"persons": [
		{
			"id": "3",
			"name": "Ragnar Nilsson",
			"gender": "m",
			"birth_year": "1893"
		}
	]
}
*/
client.indices.create({
	index: process.argv[2] || 'uu-isof-taledb-test',
	body: {
		mappings: {
			text_document: { // Namnet på vår dokument-typ.
				properties: {
					id: { // id kommer sparas som string eftersom vi kommer inte hantera det som en siffra.
						type: 'string',
						index: 'not_analyzed'
					},
					date: { // Date fältet kommer sparas som "date" datatyp. Detta gör att vi kan söka efter datum eller period.
						type: 'date'
					},
					title: { // Title och text sparas som text och är analyserad som svensk text.
						type: 'text',
						analyzer: 'swedish'
					},
					text: {
						type: 'text',
						analyzer: 'swedish'
					},
					page: { // Exempel hur man kan lägga till mappings för objects.
						properties: {
							number: { // page.number är hanterad som en siffra.
								type: 'integer'
							}
						}
					},
					document_type: { // Document_type är inte analyserad.
						type: 'text',
						fielddata: 'true'
					},
					persons: { // Persons kan innehålla "nested field" som kan innehålla flera dokumenter i en array. Mer här: https://www.elastic.co/guide/en/elasticsearch/guide/current/nested-objects.html och https://www.elastic.co/guide/en/elasticsearch/reference/current/nested.html
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
							},
							home: { // home innehåller socken namn samt härad, landskap, län och geografiska koordinator
								properties: {
									location: {
										type: 'geo_point'
									},
									id: {
										type: 'string',
										index: 'not_analyzed'
									},
									name: {
										type: 'string',
										index: 'not_analyzed'
									},
									harad: {
										type: 'string',
										index: 'not_analyzed'
									},
									landskap: {
										type: 'string',
										index: 'not_analyzed'
									},
									county: {
										type: 'string',
										index: 'not_analyzed'
									}
								}
							}
						}
					}
				}
			}
		}
	}
}, function(err) { // Function som körs när vi har lagt till mappings
	if (err) {
		console.log(err);
	}

	// För att att möjliggöra svensk analysering måste vi köra client.indices.close, client.indices.putSettings och client.indices.open i turordning 
	client.indices.close({
		index: process.argv[2] || 'uu-isof-taledb-test',
	}, function() {	
		client.indices.putSettings({
			index: process.argv[2] || 'uu-isof-taledb-test',
			body: {

				"analysis": {

					// Lägger till rätt filters och analysers för svensk analysering
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
