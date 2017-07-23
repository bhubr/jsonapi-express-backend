const findAndMatchPassword = require('./findAndMatchPassword');
const utils = require('../utils');

function signin(store, getPermissions, generateJwt, identifier, password) {
  console.log(store, getPermissions, generateJwt, identifier, password);
  return findAndMatchPassword(store, identifier, password)
  .then(utils.passLog('### findAndMatchPassword ok'))
  .catch(utils.passError('### sfindAndMatchPassword error'))
  .then(user => getPermissions(user)
    .then(permissions => generateJwt(user, permissions))
    .then(jwt => ({ user, jwt }))
  );
}

module.exports = signin;