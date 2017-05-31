const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect;
const chain = require('store-chain');
const Promise = require('bluebird');
// const request = require('supertest');
let api;
const db = require('./dbTools');
// let app;
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
	
  it.skip('creates a user', () => {
    const payload = api.getUserPayload();
    const { email } = payload.attributes;
    return api.post('/api/v1/users', payload)
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

  
  it.skip('creates a user then signs in', () => {
    const payload = api.getUserPayload();
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

  it.skip('creates a user, and attempts to modify it', () => {
    return api.signupAndLogin()
    .then(data => api.put(
      '/api/v1/users/' + data.userId,
      { id: data.userId, type: 'users', attributes: { email: 'modified.email' + ts() + '@example.com' } },
      data.jwt
    ).expect(200));
  });

  it.skip('creates two users, first attempts to modify second but *fails*', () => {
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

  it.skip('creates a user, then a post', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => api.getPostPayload(userId))
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

  it.skip('creates a user, then a post', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => api.getPostPayload(userId))
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

  it('creates a user, then an extended profile', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => api.getProfilePayload(userId))
    .set('payload')
    .get(({ credentials, payload}) =>
      api.post('/api/v1/extended_profiles', payload, credentials.jwt)
      .then(res => { console.log(res.body) })
      // .expect(200)
    )
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });


});