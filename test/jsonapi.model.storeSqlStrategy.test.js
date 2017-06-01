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
const { store, descriptors } = jsonapi.model;
const { queryBuilder, queryAsync } = jsonapi;

const fakers = require('./fakers'); //(descriptors);

describe('Test store SQL strategy', () => {

  it.skip('Create user, posts, profile, dummy models', (done) => {
    chain(store.createRecord('user', fakers.user()))
    .set('user')
    // .then(utils.passLog('created user'))
    .then(user => {
      const posts = fakers.posts(user.id, 5);
      const extendedProfile = fakers.extendedProfile(user.id);
      const superDuperModels = fakers.superDuperModels(user.id, 2);
      return Promise.all(
        Promise.map(posts, post =>
          store.createRecord('post', post)
        ),
        store.createRecord('extendedProfile', extendedProfile),
        Promise.map(superDuperModels, superDuperModel =>
          store.createRecord('superDuperModel', superDuperModel)
        )
      )
    })
    .then(utils.passLog('posts'))
    // .get(({ user }) => store.findRelatees('user', user.id, 'posts'))
    .get(({ user }) => store.findAllRelatees('user', user.id))
    .then(utils.passLog('relatees'))
    .then(() => done())
    .catch(err => {
      console.log('## err', err);
      throw err;
    });
  });

  it('Creates user, posts, post meta, comments, tags', () => 
    chain(store.createRecord('user', fakers.user()))
    .set('user')
    .then(user =>
      store.createRecord('post', fakers.post(user.id))
    )
    .set('post')
    // .get(utils.passLog('\n### User and Post'))
    .then(post => {
      const postComments = fakers.postComments(post.id, 3);
      const postMeta = fakers.postMeta(post.id);
      const tags = fakers.tags(4);
      console.log(postComments, postMeta, tags);
      return Promise.all([
        store.createRecord('postMeta', postMeta),
        Promise.map(postComments, postComment =>
          store.createRecord('postComment', postComment)
        ),
        Promise.map(tags, tag =>
          store.createRecord('tag', tag)
        )
      ]);
    })
    .set('relatees')
    .then(utils.passLog('relatees'))
    .then(([postMeta, comments, tags]) => {
      return tags.map(tag => (tag.id));
    })
    .set('tagIds')
    .get(({ post, tagIds }) => (
      tagIds.map(tagId => queryBuilder.insert('post_tag_tags', { postId: post.id, tagId }))
    ))
    .then(queries => Promise.map(queries, query => queryAsync(query)))
    .then(utils.passLog('pivot entries'))
    .get(({ post }) => store.findAllRelatees('post', post))
    .then(utils.passLog('all post relatees'))

    // .then(() => done())
    .catch(err => {
      console.log('## err', err);
      throw err;
    })
  );

  it.skip('Create users and posts', () => {
    const users = fakers.users(10);
    const postsPerUser = [2, 3, 1, 0, 4, 3, 2, 3, 1, 2];
    const mapRecords = utils.getMapRecords('users');
    return chain(Promise.map(users, user =>
      store.createRecord('user', user)
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
          store.createRecord('post', post)
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
  