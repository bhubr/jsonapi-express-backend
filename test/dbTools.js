const lineLogger = require('console-line-logger');
const path       = require('path');
const mysql      = require('mysql');
const Promise    = require('bluebird');
const configs    = require(path.normalize(__dirname + '/../resources/config.json'));
const env        = process.env.NODE_ENV ? process.env.NODE_ENV : 'test';
const config     = configs[env];
const dbSettings = config.db;
const wrapper = require('jsonapi-express-backend-query')(dbSettings);
// const connection = mysql.createConnection({
//   host     : dbSettings.host,
//   user     : dbSettings.username,
//   password : dbSettings.password,
//   database : dbSettings.database
// });
// connection.connect();
const queryAsync = wrapper.query;
const queryBuilder = require('../lib/queryBuilder');
const SALT_WORK_FACTOR = 10;
const bcrypt = Promise.promisifyAll(require('bcrypt'));
const Chance = require('chance');
const chance = new Chance();
const utils = require('../lib/utils');


function hashPasswordAsync(password) {
  return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
  .then(salt => bcrypt.hashAsync(password, salt));
}

function createAdmin() {
  const attrs = {
    email: chance.email(),
    password: 'foobar'
  };
  lineLogger(attrs);
  return hashPasswordAsync(attrs.password)
  // .then(utils.passLog('hashed passwd'))
  .then(hash => queryBuilder.insert('users', {
    email: attrs.email, password: hash, roleId: 1
  }))
  // .then(utils.passLog('admin query'))
  .then(queryAsync)
  // .then(utils.passLog('admin'))
  .then(result => (attrs));
}
//   var query = queryBuilder.insert('invitation_codes', { code });
//   queryAsync(query)
//   .then(res => {
//     lineLogger('query succeeded!', res);
//     process.exit();
//   })
//   .catch(err => {
//     console.error('query failed!', err);
//     process.exit();
//   })
// });

module.exports = { createAdmin };