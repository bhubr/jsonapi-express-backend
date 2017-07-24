const chai        = require('chai');
const should      = chai.should();
const assert      = chai.assert;
const httpMocks   = require('node-mocks-http');
const appRootDir  = require('app-root-dir').get();
const modelFinder = require(appRootDir + '/lib/model/modelFinder');
const models      = modelFinder(appRootDir + '/test/unit/model/_resources/models')
const checkMws    = require(appRootDir + '/lib/middleware/check')(models);

function getReqAndRes(method, url, params, body) {
  const req = httpMocks.createRequest({
    method, url, params, body
  });
  const res = httpMocks.createResponse();
  return { req, res };
}


describe('pre-check middlewares', () => {

  describe('checks payload format: check.payloadAttributes', () => {

    it('empty body', done => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
        assert.equal(err.message, 'payload body not found or empty');
        done();
      });
    });

    it('no body.data', done => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { dummy: {} }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
        assert.equal(err.message, '`data` attribute not found on payload');
        done();
      });
    });

    it('missing type', done => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {} }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
        assert.equal(err.message, '`data.type` attribute is required for HTTP method `POST`');
        done();
      });
    });

    it('missing id (PATCH)', done => {
      const { req, res } = getReqAndRes(
        'PATCH', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
          type: 'dummy-models'
        } }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
        assert.equal(err.message, '`data.id` attribute is required for HTTP method `PATCH`');
        done();
      });
    });

    it('URL and payload types mismatch', done => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
          type: 'smart-models'
        } }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
        assert.equal(
          err.message,
          'Type in payload: `smart-models` does not match type in URL: `dummy-models`'
        );
        done();
      });
    });

    it('has type (POST)', done => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
          type: 'dummy-models'
        } }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err, undefined);
        done();
      });
    });

    it('has type and id (PATCH)', done => {
      const { req, res } = getReqAndRes(
        'PATCH', '/api/v1/dummy-models/33', { kebabPlural: 'dummy-models' }, { data: {
          type: 'dummy-models', id: '33'
        } }
      );
      checkMws.payloadAttributes(req, res, err => {
        assert.equal(err, undefined);
        done();
      });
    });

  });

  describe('checks that model provided in URL exists', done => {

    it('model does not exists', () => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/unknown-models', { kebabPlural: 'unknown-models' }, { data: {
          type: 'unknown-models'
        } }
      );
      checkMws.existingModel(_req, _res, err => {
        assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
        assert.equal(
          err.message,
          'Type in payload: `smart-models` does not match type in URL: `dummy-models`'
        );
        done();
      });
    });


  });


  it.skip('extractTableAndTypePostOrPatch', () => {
    it('checks payload format', done => {
      const { req, res } = getReqAndRes(
        'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {} }
      );
      checkMws.payloadAttributes(req, res, err => {
        console.log(err);
        done();
      });
      // middleware.extractTableAndTypePostOrPatch(req, res, function(err) {
      //   req.body.data.should.deep.equal({ table: 'carmakes', type: 'dummy-models' });
      // });

    });

  });

  it.skip('extractTableAndTypeGet', () => {
    const req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/v1/dummy-models',
        params: {
          table: 'dummy-models'
        },
        body: { data: {} }
    });
    const res = httpMocks.createResponse();
    middlewares.extractTableAndTypeGet(req, res, function(err) {
      req.body.should.deep.equal({ table: 'carmakes', type: 'dummy-models' });
    });
  });

});
	