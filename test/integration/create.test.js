const lineLogger = require('console-line-logger');
const chai = require('chai');
const httpMocks = require('node-mocks-http');
const assert = chai.assert;
const expect = chai.expect;
const chain = require('store-chain');
const Promise = require('bluebird');
const _ = require('lodash');
const utils = require('../../lib/utils');
let api;
const fakers = require('../fakers');
const db = require('../dbTools');
const request = require('supertest');

const { app, eventHub } = require('../../resources/test-server.js');

function ts() {
  return ((new Date()).getTime()).toString(36)
    + (Math.ceil(100000 * Math.random())).toString(36); 
}

describe('JSON API requests', () => {
  let userCredentials;
  let userId;
  let userJwt;

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(done => {
    process.env.NODE_ENV = 'test';
    api = require('../apiRequest')(app);
    done();
  });
  

  // Payload format errors

  it('send an empty body', () => {
    request(app).post('/api/v1/users')
    .set({
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    })
    .send(undefined)
    // .expect(400)
    .then(res => {
      console.log(res.body);
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        error: '[PayloadFormatError] => payload body not found or empty'
      });
    });
  });

  it('send body with no data attr', done => {
    request(app).post('/api/v1/users')
    .set({
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    })
    .send({ yo: 'Yo server' })
    .expect(400)
    .then(res => {
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        error: '[PayloadFormatError] => `data` attribute not found on payload'
      });
      done();
    })
    .catch(done);
  });

  it('body with data, but nothing in it (missing `type`)', done => {
    api.post('/api/v1/users', {})
    .expect(400)
    .then(res => {
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        error: '[PayloadFormatError] => `data.type` attribute is required for HTTP method `POST`'
      });
      done();
    })
    .catch(done);
  });

  it('body with data, containing type and generated id', done => {
    api.post('/api/v1/users', { type: 'users', id: 'c3166dd6-34ed-4ffe-b2c0-3ec4d4e69639' })
    .expect(403)
    .then(res => {
      assert.equal(res.status, 403);
      assert.deepEqual(res.body, {
        error: '[ForbiddenClientIdError] => Providing a client-generated ID is not supported in this version'
      });
      done();
    })
    .catch(done);
  });
  
  it('body with data, but `data.attributes` is not a POJO', done => {
    api.post('/api/v1/users', { type: 'users', attributes: ['should', 'be', 'POJO'] })
    .expect(400)
    .then(res => {
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        error: '[PayloadFormatError] => `data.attributes` should be an object'
      });
      done();
    })
    .catch(done);
  });

  it('body with data, but `data.relationships` is not a POJO', done => {
    api.post('/api/v1/users', { type: 'users', attributes: {}, relationships: ['should', 'be', 'POJO'] })
    .expect(400)
    .then(res => {
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        error: '[PayloadFormatError] => `data.relationships` should be an object'
      });
      done();
    })
    .catch(done);
  });

  it("body with data, but `data.type` doesn't match url /:kebabPlural segment", done => {
    api.post('/api/v1/users', { type: 'userz' })
    .expect(400)
    .then(res => {
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        error: '[PayloadFormatError] => Type in payload: `userz` does not match type in URL: `users`'
      });
      done();
    })
    .catch(done);
  });


  // 2nd step - does model exist?

  it('attempts to create a non-existent model, fails because is guest', done => {
    api.post(
      '/api/v1/not-found-models',
      { type: 'not-found-models', attributes: { foo: 'bar' } },
      userJwt
    )
    .expect(401)
    .then(res => {
      assert.deepEqual(res.body, {});
      done();
    })
    .catch(done);
  });

  it('creates a user', () => {
    const payload = fakers.getUserPayload();
    userCredentials = payload.attributes;

    return api.post('/api/v1/users', payload)
    .expect(200)
    .then(res => {
      userId = res.body.data.id;
      const attributes = utils.lowerCamelKeys(res.body.data.attributes);
      const { relationships } = res.body.data;
      assert.equal(attributes.email, payload.attributes.email);
      assert.equal(attributes.username, payload.attributes.username);
      assert.deepEqual(relationships, {});
      // lineLogger('## user created!!', res.status, userId, attributes, relationships);

    });
  });

  it('signs in with created user', () => {
    const { email, password } = userCredentials;
    // lineLogger('userCredentials', userCredentials);
    return request(app).post('/api/v1/signin')
    .set({
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    })
    .send({ email, password })
    .expect(200)
    .then(res => {
      lineLogger('## user signed in!!', res.status, res.body);
      ({ data } = res.body);
      assert.equal(data.userId, userId);
      userJwt = data.jwt;
    });
  });

  it('attempts to create a non-existent model, fails with 404', done => {
    api.post(
      '/api/v1/not-found-models',
      { type: 'not-found-models', attributes: { foo: 'bar' } },
      userJwt
    )
    .expect(404)
    .then(res => {
      assert.deepEqual(res.body, {
        error: '[UnknownModelError] => Model `notFoundModel` not found in model definitions (file `not-found-model.js`)'
      });
      done();
    })
    .catch(done);
  });

  it('tries and create extended profile, but provides no `twitter-url`', () => {
    const payload = {
      type: 'extended-profiles',
      attributes: {
        phone: '+33-6-61-51-41-31'
      },
      relationships: {
        owner: { data: { type: 'users', id: userId } }
      }
    };
    return api.post('/api/v1/extended-profiles', payload, userJwt)
    .expect(400)
    .then(res => {
      assert.deepEqual(res.body, {
        error: "[MissingFieldError] => Required attribute `extendedProfile.twitterUrl`: `twitter-url` not found in payload's `attributes`"
      });

    });
  });

  it('tries and create extended profile, but provides no owner (with user id)', () => {
    const payload = {
      type: 'extended-profiles',
      attributes: {
        phone: '+33-6-61-51-41-31',
        'twitter-url': 'https://twitter.com/' + userCredentials.username
      }
    };
    return api.post('/api/v1/extended-profiles', payload, userJwt)
    .expect(400)
    .then(res => {
      assert.deepEqual(res.body, {
        error: "[MissingFieldError] => Required relationship `extendedProfile.owner`: `owner` not found in payload's `relationships`"
      });

    });
  });

  it('tries and create extended profile with required attributes and relationships', () => {
    const attributes = {
      phone: '+33-6-61-51-41-31',
      'twitter-url': 'https://twitter.com/' + userCredentials.username,
      address: "77 Lannister Place, King's Landing",
      'twitter-url': 'https://twitter.com/' + userCredentials.username,
      'facebook-url': 'https://facebook.com/' + userCredentials.username,
      'linkedin-url': 'https://linkedin.com/' + userCredentials.username
    };
    const payload = {
      type: 'extended-profiles',
      attributes,
      relationships: {
        owner: { data: { type: 'users', id: userId } }
      }
    };
    return api.post('/api/v1/extended-profiles', payload, userJwt)
    .expect(200)
    .then(res => {
      const { data } = res.body;
      const { id } = data;
      assert.deepEqual(data, {
        type: 'extended-profiles',
        id,
        attributes: Object.assign(attributes, {
          'created-at': null, 'updated-at': null
        }),
        relationships: {
          owner: { data: { type: 'users', id: userId } }
        }
      });

    });
  });

  it.skip('creates a user', () => {
    const payload = fakers.getUserPayload();
    const { email } = payload.attributes;
    return api.signupAndLogin()
    .then(({ userId, jwt }) => {
      // const { data } = res.body;
      // const { id, type, attributes } = data;
      // expect(data).to.not.be.undefined;
      // expect(attributes).to.not.be.undefined;
      // expect(type).to.equal('users');
      // expect(attributes.email).to.equal(email);
      // expect(Number.isInteger(id)).to.be.true;

      userJwt = jwt;
    });
  });


});