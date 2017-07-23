const request = require('supertest');
const Promise = require('bluebird');
const fakers = require('./fakers');
const utils = require('../lib/utils');

module.exports = function(app) {

  /**
   * POST to backend
   */
  function send(method, url, data, jwt) {
    if(['post', 'put', 'patch'].indexOf(method) === -1) {
      return Promise.reject(new Error('Unknown method ' + method));
    }
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if(jwt) {
      headers.Authorization = 'Bearer ' + jwt
    }
    return request(app)[method](url)
      .set(headers)
      .send({ data });
  }

  function post(url, data, jwt) {
    return send('post', url, data, jwt);
  }

  /**
   * PUT to backend
   */
  function put(url, data, jwt) {
    return send('put', url, data, jwt);
  }

  function noSend(method, url, jwt) {
    if(['get', 'delete'].indexOf(method) === -1) {
      return Promise.reject(new Error('Unknown method ' + method));
    }
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if(jwt) {
      headers.Authorization = 'Bearer ' + jwt
    }
    return request(app)
      [method](url)
      .set(headers);
  }

  /**
   * GET from backend
   */
  function get(url, jwt) {
    return noSend('get', url, jwt);
  }

  /**
   * DELETE from backend
   */
  function _delete(url, jwt) {
    return noSend('delete', url, jwt);
  }


  /**
   * Signup then login a fake user
   */
  function signupAndLogin() {
    const user = fakers.getUserPayload();
    return post('/api/v1/users', user)
    // .then(utils.passLog('after signup'))
    .then(() => post('/api/v1/signin', user).expect(200))
    // .then(utils.passLog('after signin'))
    .then(res => (res.body.data));
  }

  function login(credentials) {
    const { email, password } = credentials;
    return post('/api/v1/signin', {
      attributes: { email, password }
    })
    .then(res => (res.body.data));
  }

  return { post, put, get, 'delete': _delete, signupAndLogin, login };
};