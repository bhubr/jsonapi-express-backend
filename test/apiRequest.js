const request = require('supertest');

module.exports = function(app) {
  return {
    post: function(url, data, jwt) {
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
    },
    get: function(url) {
      return request(app)
        .get(url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    },

  }
};