const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect;
const chain = require('store-chain');
const Promise = require('bluebird');
const _ = require('lodash');

let api;
const fakers = require('./fakers');
const utils = require('../lib/utils');
const db = require('./dbTools');

function ts() {
  return ((new Date()).getTime()).toString(36)
    + (Math.ceil(100000 * Math.random())).toString(36); 
}

describe('JSON API requests', () => {

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(function () {
    process.env.NODE_ENV = 'test';
    const app = require('../resources/test-server.js');
    api = require('./apiRequest')(app);
  });
	
  it('creates a user', () => {
    const payload = fakers.getUserPayload();
    const { email } = payload.attributes;
    return api.post('/api/v1/users', payload)
    // .then(res => { console.log(res.body) })
    .expect(200)
    .then(res => {
      const { data } = res.body;
      const { id, type, attributes } = data;
      expect(data).to.not.be.undefined;
      expect(attributes).to.not.be.undefined;
      expect(type).to.equal('users');
      expect(attributes.email).to.equal(email);
      expect(Number.isInteger(id)).to.be.true;
    });
  });

  
  it('creates a user then signs in', () => {
    const payload = fakers.getUserPayload();
    const { email } = payload.attributes;
    return chain(api.post('/api/v1/users', payload))
    .then(res => (res.body.data.id))
    .set('userId')
    .then(() => api.post('/api/v1/signin', payload))
    .then(res => {
      const { data } = res.body;
      const { id, type, attributes } = data;
      expect(data).to.not.be.undefined;
      return data;
    })
    .set('data')
    .get(({ userId, data}) => {
      expect(data.userId).to.equal(userId);
      expect(data.jwt).to.not.be.undefined;
    });
  });

  it('creates a user, and attempts to modify it', () => {
    let userId;
    let email;
    return api.signupAndLogin()
    .then(data => {
      userId = data.userId;
      email = 'modified.email' + ts() + '@example.com';
      return api.put(
        '/api/v1/users/' + data.userId,
        { id: data.userId, type: 'users', attributes: { email } },
        data.jwt
      ).expect(200);
    })
    .then(() => api.get('/api/v1/users/' + userId).expect(200))
    .then(res => {
      const { attributes } = res.body.data;
      expect(attributes.email).to.equal(email);
    });
  });

  it('creates two users, first attempts to modify second but *fails*', () => {
    return Promise.all([
      api.signupAndLogin(),
      api.signupAndLogin()
    ])
    .then(([data1, data2]) => api.put(
      '/api/v1/users/' + data2.userId,
      { id: data2.userId, type: 'users', attributes: { email: 'hacked.email' + ts() + '@example.com' } },
      data1.jwt
    ).expect(403));
  });

  it('creates a user, then a post', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getPostPayload(userId))
    .set('payload')
    .get(({ credentials, payload}) =>
      api.post('/api/v1/posts', payload, credentials.jwt)
      .expect(200)
    )
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });

  it('creates a user, then a post', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getPostPayload(userId))
    .set('payload')
    .get(({ credentials, payload}) =>
      api.post('/api/v1/posts', payload, credentials.jwt)
      .expect(200)
    )
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });

  it('creates a user, then a post, then post meta, comments, tags', () => {
    let userId;
    let jwt;
    const comments = [
      { commentText: 'Lorem ipsum blah blah', authorEmail: 'dummy@example.com' },
      { commentText: 'Another dummy comment', authorEmail: 'foobar@example.com' },
      { commentText: 'Yet another dumb comment', authorEmail: 'johndoe@example.com' }
    ];
    const tags = [
      { name: 'jsonapi', color: '#fff' },
      { name: 'nodejs', color: '#abc' },
      { name: 'javascript', color: '#dd7' }
    ];
    const postMeta = {
      'meta-value': JSON.stringify({ some: 'data', foo: 'bar'})
    };
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getPostPayload(userId))
    .set('payload')
    .get(({ credentials }) => {
      userId = credentials.userId;
      jwt = credentials.jwt;
    })
    .get(({ credentials, payload}) =>
      api.post('/api/v1/posts', payload, credentials.jwt)
      .expect(200)
    )
    .then(res => {
      // console.log(res.body)
      const { relationships, attributes, id, type } = res.body.data;
      expect(type).to.equal('posts');
      expect(relationships.author.data.id).to.equal(userId);
      return id;
      // expect(attributes.email).to.equal(email);
    })
    .set('postId')
    .then(postId => _.map(comments, attrs => fakers.mapToPayload(
      'post-comments', attrs, [{ key: 'post', type: 'posts', id: postId }]
    )))
    .then(payloads => Promise.map(payloads,
      payload => api.post('/api/v1/post-comments', payload, jwt)
      .expect(200)
    ))
    .then(results => _.map(results, 'body.data'))
    .then(datas => {
      datas.forEach((data, index) => {
        const relData = data.relationships.post.data;
        expect(Number.isInteger(data.id)).to.be.true;
        expect(data.type).to.equal('post-comments');
        expect(data.attributes['comment-text']).to.equal(comments[index].commentText);
        expect(data.attributes['author-email']).to.equal(comments[index].authorEmail);
        expect(Number.isInteger(relData.id)).to.be.true;
        expect(relData.type).to.equal('posts');
      })
      return _.map(datas, 'id');
    })
    .set('commentIds')
    // .then(console.log)
    .get(({ postId }) => _.map(tags, attrs => fakers.mapToPayload(
      'tags', attrs, [{ key: 'posts', type: 'posts', id: [postId] }]
    )))
    .then(payloads => {
      console.log(_.map(payloads, 'relationships.posts.data'));
      return payloads;
    })
    .then(payloads => Promise.map(payloads,
      payload => api.post('/api/v1/tags', payload, jwt)
      .expect(200)
    ))
    .then(results => _.map(results, 'body.data'))
    .then(datas => {
      datas.forEach((data, index) => {
        expect(Number.isInteger(data.id)).to.be.true;
        expect(data.type).to.equal('tags');
        expect(data.attributes.name).to.equal(tags[index].name);
        expect(data.attributes.color).to.equal(tags[index].color);
      })
      return _.map(datas, 'id');
    })
    .get(({ postId }) => fakers.mapToPayload(
      'post-metas', postMeta, [{ key: 'post', type: 'posts', id: postId }])
    )
    .then(payload => api.post('/api/v1/post-metas', payload, jwt).expect(200))
    .then(res => (res.body.data))
    .then(data => {
      expect(Number.isInteger(data.id)).to.be.true;
      expect(data.type).to.equal('post-metas');
      expect(data.attributes['meta-value']).to.equal(postMeta['meta-value']);
    })
    .get(({ postId }) => api.get('/api/v1/posts/' + postId, jwt).expect(200))
    .then(res => (res.body.data))
    .then(data => {
      console.log(data.relationships);
    })
    // .then(console.log)
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });

  it('creates a user, then an extended profile', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getProfilePayload(userId))
    .set('payload')
    .get(({ credentials, payload}) =>
      api.post('/api/v1/extended-profiles', payload, credentials.jwt)
      .expect(200)
    )
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });


});