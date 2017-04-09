var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var api = require('./jsonapi');
var middlewares = require('./jsonapi-middlewares');

var port = process.argv.length >= 3 ? parseInt( process.argv[2], 10 ) : 3002;

/**
 * Setup Express
 */
var app = express();
app.use(express.static('public'));
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(middlewares.checkJwt);
app.use(middlewares.jsonApi);

app.use('/api/v1', api);

app.get('/', (req, res) => {
  res.send(templates.index());
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});


