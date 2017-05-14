const request = require('supertest');
const Chance = require('chance');
const chance = new Chance();

module.exports = function(app) {

  /**
   * POST to backend
   */
  function post(url, data, jwt) {
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