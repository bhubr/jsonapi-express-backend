const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const configs = require(__dirname + '/config.json');
const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'test';
const config = configs[env];
const models = require('./models');
const { router, middlewares, queryBuilder, queryAsync } = require('../index')(__dirname, config, models);

const port = config.port || 3333;

/**
 * Setup Express
 */
const app = express();
// app.use(morgan('tiny'));
app.use(express.static('public'));
app.use(bodyParser.json({ type: 'application/json' }));
app.use('/api/v1', middlewares.checkJwt);
app.use('/api/v1', middlewares.jsonApi);
app.use('/api/v1', router);

app.listen(port);
module.exports = app;