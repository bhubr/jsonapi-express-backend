const Promise = require('bluebird');
const bcrypt  = require('bcrypt');

function throwIfFalsy(errorMsg) {
  return value => {
    if(! value) {
      throw new Error(errorMsg);
    }
    return value;
  }
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
  return store.findRecordBy('user', where)
  .then(throwIfFalsy('No account with this ' + fieldToQuery))
  .then(user => bcrypt.compare(password, user.password)
    .then(throwIfFalsy('Wrong password'))
    .then(() => (user))
  );
}

module.exports = findAndMatchPassword;