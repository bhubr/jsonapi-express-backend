const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect;
const chain = require('store-chain');
const Promise = require('bluebird');
const _ = require('lodash');
const utils = require('../../lib/utils');
let api;
const fakers = require('../fakers');
const db = require('../dbTools');

function ts() {
  return ((new Date()).getTime()).toString(36)
    + (Math.ceil(100000 * Math.random())).toString(36); 
}

describe('JSON API requests', () => {
  let userJwt;

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(done => {
    process.env.NODE_ENV = 'test';
    const { app, eventHub } = require('../../resources/test-server.js');
    api = require('../apiRequest')(app);
    done();
  });
  
  
  it('creates a user', () => {
    const payload = fakers.getUserPayload();
    const { email } = payload.attributes;
    return api.signupAndLogin()
    .then(({ userId, jwt }) => {
      userJwt = jwt;
    });
  });

  
  it('attempts to create a non-existent model', () => {
    return api.post(
      '/api/v1/not-found-models',
      { type: 'not-found-models', attributes: { foo: 'bar' } },
      userJwt
    )
    .then(res => {
      expect(res.status).to.equal(404);
      console.log(res.body)
      // const { data } = res.body;
      // const { id, type, attributes } = data;
      // expect(data).to.not.be.undefined;
      // expect(attributes).to.not.be.undefined;
      // expect(type).to.equal('users');
      // expect(attributes.email).to.equal(email);
      // expect(Number.isInteger(id)).to.be.true;
    });
  });

});