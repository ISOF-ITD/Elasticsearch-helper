var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');
var fs = require('fs');

// I den här script använder vi command line arguments. Olika arguments finns i process.argv[x].
// Command prompt gör man så: "node insertdata.js [index name] [host] [login] [data file]"

// Först kollar vi om vi inte har 6 argumenter, om inte stannar programmet.
if (process.argv.length < 6) {
	console.log('node insertdata.js [index name] [host] [login] [data file]');

	return;
}

// Bygger upp url till Elaticsearch
var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

// Öppnar json fil för att lägga till data.
fs.readFile(process.argv[5], 'utf-8', function(err, fileData) {
	var data = JSON.parse(fileData);

	var bulkBody = [];

	// Kör igenom varje objekt i filen och läggar till bulkBody array som vi sen kommer skicka till Elasticsearch.
 	_.each(data, function(item, index) {

 		// För varje objekt måste vi först lägga till instruktion till bulkBody om vad vi vill göra.
 		// Här vi säger "create" och definierar _type och _id om vi vill. Annars kommer _id skapas automatiskt.
		bulkBody.push({
			create: {
				_index: process.argv[2] || 'uu-isof-taledb-test',
				_type: 'text_document', // Passar på att vi lägger objektet till som text_document dokument typ.
				_id: item.id
			}
		});

		// Sen förberedar vi datan lite gran och lägger det till bulkBody.
		if (item.persons) {
			_.each(item.persons, function(person) {
				if (person.home && person.home.lat && person.home.lng) {
					// Lägger lat/lng till location fältet.
					person.home.location = {
						lat: Number(person.home.lat),
						lon: Number(person.home.lng)
					};
				}
			});
		}

		bulkBody.push(item);
	});

 	// När vi har lagt alla data till bulkBody skickar vi den till Elasticsearch.
	var client = new elasticsearch.Client({
		host: esHost,
		log: 'trace'
	});

	client.bulk({
		body: bulkBody
	}, function() {
		console.log('All done!');
	});
});
