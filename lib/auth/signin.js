const findAndMatchPassword = require('./findAndMatchPassword');

function signin(store, getPermissions, generateJwt, identifier, password) {
  return findAndMatchPassword(store, identifier, password)
  .then(user => getPermissions(user)
    .then(permissions => generateJwt(user, permissions))
    .then(jwt => ({ user, jwt }))
  );
}

module.exports = signin;