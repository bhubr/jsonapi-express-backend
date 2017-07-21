const chai       = require('chai');
const assert     = chai.assert;
const bcrypt     = require('bcrypt');
const Promise    = require('bluebird');
const _          = require('lodash');
const saltRounds = 10;
const salt       = bcrypt.genSaltSync(saltRounds);
const dummyJwt   = require('./dummy-jwt.json').jwt;
const signin     = require('../../../lib/auth/signin');
const findAndMatchPassword = require('../../../lib/auth/findAndMatchPassword');

const store = (function() {
  const password = bcrypt.hashSync('Foo#App1', salt);
  const users = [
    { id: 1, username: 'foo', email: 'foo@example.com', password }
  ];
  function findRecordBy(model, query) {
    const record = _.find(users, query);
    return Promise.resolve(
      record ? record : null
    );
  }
  return {
    findRecordBy
  };
})();

function getEmptyPermissions(user) {
  return Promise.resolve([]);
}

function generateDummyJwt(user, permissions) {
  return Promise.resolve(dummyJwt);
}

describe('user sign in', () => {

  describe('find and match password', () => {

    it('correct username&password', () => 
      findAndMatchPassword(store, 'foo', 'Foo#App1')
      .then(user => {
        assert.equal(user.username, 'foo');
        assert.equal(user.email, 'foo@example.com');
      })
    );

    it('unkwown username', () =>
      findAndMatchPassword(store, 'fooz', 'Foo#App1')
      .then(result => {
        throw new Error('then called when catch was expected');
      })
      .catch(err => {
        assert.equal(err.message, 'No account with this username');
      })
    );

    it('correct username&wrong password', () =>
      findAndMatchPassword(store, 'foo', 'Foo#App2')
      .then(result => {
        throw new Error('then called when catch was expected');
      })
      .catch(err => {
        assert.equal(err.message, 'Wrong password');
      })
    );

    it('correct email&password', () =>
      findAndMatchPassword(store, 'foo@example.com', 'Foo#App1')
      .then(user => {
        assert.equal(user.username, 'foo');
        assert.equal(user.email, 'foo@example.com');
      })
    );

    it('unkwown email', () =>
      findAndMatchPassword(store, 'fooz@example.com', 'Foo#App1')
      .then(result => {
        console.log('result', result);
        throw new Error('then called when catch was expected');
      })
      .catch(err => {
        assert.equal(err.message, 'No account with this email');
      })
    );

    it('correct email&wrong password', () =>
      findAndMatchPassword(store, 'foo@example.com', 'Foo#App2')
      .then(result => {
        throw new Error('then called when catch was expected');
      })
      .catch(err => {
        assert.equal(err.message, 'Wrong password');
      })
    );

  });

  describe('sign in', () => {
    it('correct username&password', () => 
      signin(store, getEmptyPermissions, generateDummyJwt, 'foo', 'Foo#App1')
      .then(({ user, jwt }) => {
        assert.equal(user.username, 'foo');
        assert.equal(user.email, 'foo@example.com');
        assert.equal(jwt, dummyJwt);
      })
    );

    it('unknown username', () => 
      signin(store, getEmptyPermissions, generateDummyJwt, 'fooz', 'Foo#App1')
      .then(result => {
        throw new Error('then called when catch was expected');
      })
      .catch(err => {
        assert.equal(err.message, 'No account with this username');
      })
    );

  });

});