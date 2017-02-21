var express = require('express');
var http = require('http');
var models = require('./models');
var bodyParser = require('body-parser');
var utils = require('./utils');
var api = require('./jsonapi');
var port = process.argv.length >= 3 ? parseInt( process.argv[2], 10 ) : 3001;


/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};


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
  var html ='<html><head><script src="https://code.jquery.com/jquery-3.1.1.min.js"></script></head>' +
  '<form action=""><input name="email" /><input name="password" /><input type="submit" value="go" /></form>' +
  '<script>(function($) { $(document).ready(() => { $("form").on("submit", e => { e.preventDefault(); const attributes = {email: $(\'input[name="email"]\').val(), password: $(\'input[name="password"]\').val()}; const data = JSON.stringify({ data: { type: "users", attributes }}); $.ajax({type: "POST", url: "/api/v1/users", data, success: data => { console.log(data); }, contentType: "application/json; charset=utf-8", dataType: "json"});}) }); })(jQuery);</script></html>';
  res.send(html);
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});


