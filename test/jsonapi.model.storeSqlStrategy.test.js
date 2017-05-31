const utils = require('../lib/utils');
const naming = require('../lib/naming');
const path = require('path');
const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const Promise = require('bluebird');
const chain = require('store-chain');

const configs = require('../resources/config.json');
const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'test';
const config = configs[env];
const models = require('../resources/models');
// const { router, middlewares, queryBuilder, queryAsync } = 
const jsonapi = require('../index')(path.normalize(__dirname + '/../resources'), config, models);

const fakers = require('./fakers');

describe('Test store SQL strategy', () => {

  it('Create user', (done) => {
    jsonapi.model.store.createRecord('user', fakers.user())
    .then(utils.passLog('created user'))
    .then(() => done());
  });

  it('Create users and posts', () => {
    const users = fakers.users(10);
    const postsPerUser = [2, 3, 1, 0, 4, 3, 2, 3, 1, 2];
    const mapRecords = utils.getMapRecords('users');
    return chain(Promise.map(users, user =>
      jsonapi.model.store.createRecord('user', user)
    ))
    .set('users')
    // .then(utils.passLog('created users'))
    .then(users => {
      const userPosts = users.map((user, index) => {
        const numPosts = postsPerUser[index];
        return fakers.posts(user.id, numPosts);
      });
      const promises = [];
      userPosts.forEach(posts => {
        // console.log(posts);
        promises.push(Promise.map(posts, post => 
          jsonapi.model.store.createRecord('post', post)
        ));
      });
      return Promise.all(promises);
    })
    .set('userPosts')
    // .then(utils.passLog('created posts for users'))
    .get(({ users }) => mapRecords(users))
    .then(utils.passLog('mapped users'));
    // .then(() => done());
  });

});
  