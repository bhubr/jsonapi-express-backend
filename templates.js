var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');
var Handlebars = require('handlebars');
var watcher = chokidar.watch(__dirname + '/templates', {
  persistent: true
});

var templates = {};

// Something to use when events are received.
var log = console.log.bind(console);

function readTemplate(filepath) {
  var basename = path.basename(filepath, '.hbs.html');
  fs.readFile(filepath, (err, buffer) => {
  	templates[basename] = Handlebars.compile(buffer.toString());
  });
}
// Add event listeners.
watcher
  .on('add', readTemplate)
  .on('change', readTemplate)
  .on('unlink', path => log(`File ${path} has been removed`));

module.exports = templates;