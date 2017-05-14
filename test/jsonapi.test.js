const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect();
const request = require('supertest');
let app;

describe('JSON API requests', () => {

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(function () {
    process.env.NODE_ENV = 'test';
    app = require('../resources/test-server.js');
  });
	
	it('creates a user', () => {
    return request(app)
      .post('/api/v1/users')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ data: {
        type: 'users',
        attributes: {
          email: 'joe@example.com',
          password: 'foobar'
        }
      } })
      .then(response => {
        // console.log(response);
      })
      // .expect('Content-Type', /json/)
      // .expect('Content-Length', '15')
      // .expect(200);
	});

});