const request = require('supertest');
const Chance = require('chance');
const chance = new Chance();
const Promise = require('bluebird');

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
    return request(app)
      .post(url)
      .set(headers)
      .send({ data });
  }

  function post(url, data, jwt) {
    return send('post', url, data, jwt);
  }

  /**
   * GET from backend
   */
  function get(url) {
    return request(app)
      .get(url)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');
  }

  /**
   * PUT to backend
   */
  function put(url, data, jwt) {
    return request(app)
      .get(url)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');
  }

  /**
   * Generate fake user payload
   */
  function getUserPayload() {
    return {
      type: 'users',
      attributes: {
        email: chance.email(),
        password: 'foobar'
      }
    };
  }

  /**
   * Signup then login a fake user
   */
  function signupAndLogin() {
    const user = getUserPayload();
    return post('/api/v1/users', user)
    .then(() => post('/api/v1/signin', user).expect(200))
    .then(res => (res.body.data));
  }

  return { post, get, getUserPayload, signupAndLogin };
};