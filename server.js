var express = require('express');
var http = require('http');
var models = require('./models');
var bodyParser = require('body-parser');
var utils = require('./utils');
var api = require('./jsonapi');
var templates = require('./templates');
var port = process.argv.length >= 3 ? parseInt( process.argv[2], 10 ) : 3001;




/**
 * Setup Express
 */
var app = express();
app.use(express.static('public'));
app.use(bodyParser.json({ type: 'application/json' }));
app.use(function(req, res, next) {
  res.jsonApi = function(data) {
    res.set({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    return res.send(JSON.stringify({ data }));
  };
  next();
});

app.use('/api/v1', api);

app.get('/', (req, res) => {
  res.send(templates.index());
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});


