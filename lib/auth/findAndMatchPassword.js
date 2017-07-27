const lineLogger = require('console-line-logger');
const Promise = require('bluebird');
const bcrypt  = require('bcrypt');
const utils = require('../utils');

function throwIfFalsy(errorMsg) {
  return value => {
    if(! value) {
      throw new Error(errorMsg);
    }
    return value;
  };
}

function findAndMatchPassword(store, identifier, password) {
  if(
    typeof store.findRecordBy !== 'function'
  ) {
    return Promise.reject(new Error('store should have a findRecordBy method'));
  }
  if(
    typeof identifier !== 'string' ||
    typeof password !== 'string'
  ) {
    return Promise.reject('wrong parameters type');
  }
  const fieldToQuery = identifier.includes('@') ? 'email' : 'username';
  const where = { [fieldToQuery]: identifier };
  lineLogger(where);
  return store.findRecordBy('user', where)
  .then(utils.passLog('### found user record ok'))
  .catch(utils.passError('### find user record error'))
  .then(throwIfFalsy('No account with this ' + fieldToQuery))
  .then(user => bcrypt.compare(password, user.password)
    .then(throwIfFalsy('Wrong password'))
    .then(() => (user))
  );
}

module.exports = findAndMatchPassword;