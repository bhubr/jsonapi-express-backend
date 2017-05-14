const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect;
// const request = require('supertest');
let api;
// let app;

describe('JSON API requests', () => {

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(function () {
    process.env.NODE_ENV = 'test';
    const app = require('../resources/test-server.js');
    api = require('./apiRequest')(app);
  });
	
  it('creates a user #2', () => {
    return api.post('/api/v1/users', {
      type: 'users',
      attributes: {
        email: 'joe@example.com',
        password: 'foobar'
      }
    })
    .expect(200)
    .then(res => {
      const { data } = res.body;
      const { id, type, attributes } = data;
      expect(data).to.not.be.undefined;
      expect(attributes).to.not.be.undefined;
      expect(type).to.equal('users');
      expect(attributes.email).to.equal('joe@example.com');
      expect(Number.isInteger(id)).to.be.true;
    });
  });

});