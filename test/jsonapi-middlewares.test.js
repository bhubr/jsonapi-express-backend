const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const httpMocks = require('node-mocks-http');
const middlewares = require('../jsonapi-middlewares');

describe('JSON API middlewares', () => {

  it('extractTableAndTypePostOrPatch', () => {
    const req = httpMocks.createRequest({
        method: 'POST',
        url: '/api/v1/car-makes',
        params: {
          table: 'car-makes'
        },
        body: { data: {} }
    });
    const res = httpMocks.createResponse();
    middlewares.extractTableAndTypePostOrPatch(req, res, function(err) {
      req.body.data.should.deep.equal({ table: 'carmakes', type: 'car-makes' });
    });
  });

  it('extractTableAndTypeGet', () => {
    const req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/v1/car-makes',
        params: {
          table: 'car-makes'
        },
        body: { data: {} }
    });
    const res = httpMocks.createResponse();
    middlewares.extractTableAndTypeGet(req, res, function(err) {
      req.body.should.deep.equal({ table: 'carmakes', type: 'car-makes' });
    });
  });

});
	