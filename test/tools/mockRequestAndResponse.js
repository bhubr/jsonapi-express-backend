const httpMocks   = require('node-mocks-http');

function mockRequestAndResponse(method, url, params, body) {
  const req = httpMocks.createRequest({
    method, url, params, body
  });
  const res = httpMocks.createResponse();
  return { req, res };
}

module.exports = mockRequestAndResponse;