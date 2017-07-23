const appRootDir = require('app-root-dir');
require('app-root-dir').set(__dirname);
const express    = require('express');
const bodyParser = require('body-parser');
const morgan     = require('morgan');
const configs    = require(__dirname + '/config.json');
const env        = process.env.NODE_ENV ? process.env.NODE_ENV : 'test';
const config     = configs[env];
const models     = require('./models');
const { model, router, middlewares, queryBuilder, queryAsync, eventHub } = require('../index');
const winston    = require('winston');
const port = config.port || 3333;

winston.level = 'silly';

process.on('uncaughtException', function (err) {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
});

/**
 * Setup Express
 */
const app = express();
// app.use(morgan('tiny'));
app.use(express.static('public'));
if(process.env.NODE_ENV === 'test') {
  // console.log('use application/json');
  app.use(bodyParser.json({ type: 'application/json' }));
  app.use('/api/v1', middlewares.checkJwt);
}
else {
  app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
}
app.use('/api/v1', middlewares.jsonApi);
app.use('/api/v1', router);

eventHub.on('store.ready', models => {
  // app.listen(port);
  console.log('yo', models);
})

module.exports = app;