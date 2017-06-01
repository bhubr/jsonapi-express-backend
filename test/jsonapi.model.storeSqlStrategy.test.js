const utils = require('../lib/utils');
const naming = require('../lib/naming');
const path = require('path');
const chai = require('chai');
const _ = require('lodash');
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

function createPostWithRelatees() {
  let postId;
  let post;
  return store.createRecord('user', fakers.user())
  .then(user =>
    store.createRecord('post', fakers.post(user.id))
  )
  // .get(utils.passLog('\n### User and Post'))
  .then(_post => {
    postId = _post.id;
    post = _post;
    const postComments = fakers.postComments(_post.id, 3);
    const postMeta = fakers.postMeta(_post.id);
    const tags = fakers.tags(4);
    // console.log(postComments, postMeta, tags);
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
  .then(([postMeta, comments, tags]) => {
    // console.log(postMeta);
    return {
      metaId: postMeta.id,
      tagIds: tags.map(tag => (tag.id))
    };
  })
  .then(({metaId, tagIds}) => Promise.all([
    store.updateRecord('post', postId, { metaId }),
    Promise.map(
      tagIds.map(tagId => queryBuilder.insert('post_tag_tags', { postId, tagId })),
      query => queryAsync(query)
    )
  ]))
  .then(([_post, tags]) => {
    post = _post;
  })
  .then(() => store.findAllRelatees('post', post))
  .then(relatees => ({ post, relatees }))
}

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
    .get(({ user }) => store.findAllRelatees('user', user))
    .then(utils.passLog('relatees'))
    .then(() => done())
    .catch(err => {
      console.log('## err', err);
      throw err;
    });
  });

  it.skip('Creates user, one post with post meta, comments, tags', () => 
    createPostWithRelatees()
    .then(utils.passLog('post and relatees'))
    .catch(err => {
      console.log('## err', err);
      throw err;
    })
  );

  it('Creates three users, one post for each with post meta, comments, tags', () => 
    Promise.all([
      createPostWithRelatees(),
      createPostWithRelatees(),
      createPostWithRelatees()
    ])
    // .then(utils.passLog('post and relatees'))
    .then(entries => (entries.map(entry => (entry.post))))
    // .then(utils.passLog('posts only'))
    .then(posts => store.findAllRelateesMulti('post', posts))
    // .then(utils.passLog('posts relatees'))
    .then(relatees => { console.log(_.map(relatees, 'meta')); })
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
  