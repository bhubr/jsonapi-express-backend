const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect;
const chain = require('store-chain');
const Promise = require('bluebird');
// const request = require('supertest');
let api;
// let app;
const ts = ((new Date()).getTime()).toString(36);

describe('JSON API requests', () => {

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(function () {
    process.env.NODE_ENV = 'test';
    const app = require('../resources/test-server.js');
    api = require('./apiRequest')(app);
  });
	
  it('creates a user', () => {
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

  
  it('creates a user then signs in', () => {
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

  it('creates two users and attempt to modify second with first', () => {
    return Promise.all([
      api.signupAndLogin(),
      api.signupAndLogin()
    ])
    .then(([data1, data2]) => api.put(
      '/api/v1/users/' + data2.userId,
      { id: data2.userId, type: 'users', attributes: { email: 'hacked.email' + ts + '@example.com' } },
      data1.jwt
    // ))
    ).expect(200))
    // .then(res => {
    //   console.log(res.body)
    // })
    ;
  });

});