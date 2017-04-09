var express = require('express');
var http = require('http');
var models = require('./models');
var bodyParser = require('body-parser');
var utils = require('./utils');
var api = require('./jsonapi');
var middlewares = require('./jsonapi-middlewares');
var templates = require('./templates');
var port = process.argv.length >= 3 ? parseInt( process.argv[2], 10 ) : 3002;
// var passport = require('./signin');

var { User } = require('./models');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));


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


