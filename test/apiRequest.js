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
   * Generate fake user payload
   */
  function getUserPayload() {
    return {
      type: 'users',
      attributes: {
        email: chance.email(),
        password: 'foobar'
      },
      relationships: {}
    };
  }

 function getPostPayload(userId) {
    return {
      type: 'posts',
      attributes: {
        title: chance.sentence({ words: 3 }),
        slug: chance.guid(),
        content: chance.paragraph({ sentences: 2 })
      },
      relationships: {
        author: { data: {
          type: 'users', id: userId
        } }
      }
    };
  }

  function getProfilePayload(userId) {
    return {
      type: 'extended-profiles',
      attributes: {
        'twitter-url': 'https://twitter.com/' + chance.twitter(),
        'facebook-url': 'https://www.facebook.com/profile.php?id=' + chance.fbid(),
        'linkedin-url': chance.url(),
        address: chance.address(),
        phone: chance.phone()
      },
      relationships: {
        user: {
          data: {
            type: 'users', id: userId
          }
        }
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

  function login(credentials) {
    const { email, password } = credentials;
    return post('/api/v1/signin', {
      attributes: { email, password }
    })
    .then(res => (res.body.data));
  }

  return { post, put, get, 'delete': _delete, getUserPayload, getPostPayload, getProfilePayload, signupAndLogin, login };
};