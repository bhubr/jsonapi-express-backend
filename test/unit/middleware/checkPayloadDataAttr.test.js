const chai        = require('chai');
const should      = chai.should();
const assert      = chai.assert;
const _           = require('lodash');
const appRootDir  = require('app-root-dir').get();

const checkPayloadDataAttr   = require(appRootDir + '/lib/middleware/checkPayloadDataAttr');
const { REQ_DATA_KEY }       = require(appRootDir + '/lib/constants');
const mockRequestAndResponse = require('../../tools/mockRequestAndResponse');

describe('checks payload format: checkPayloadDataAttr', () => {

  it('empty body', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(err.message, 'payload body not found or empty');
      done();
    });
  });

  it('no body.data', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { dummy: {} }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(err.message, '`data` attribute not found on payload');
      done();
    });
  });

  it('missing type', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {} }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(err.message, '`data.type` attribute is required for HTTP method `POST`');
      done();
    });
  });

  it('missing id (PATCH)', done => {
    const { req, res } = mockRequestAndResponse(
      'PATCH', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
        type: 'dummy-models'
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(err.message, '`data.id` attribute is required for HTTP method `PATCH`');
      done();
    });
  });

  it('URL and payload types mismatch', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
        type: 'smart-models'
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(
        err.message,
        'Type in payload: `smart-models` does not match type in URL: `dummy-models`'
      );
      done();
    });
  });

  it('fails because has type and client-generated ID (POST)', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
        type: 'dummy-models',
        id: '5d732701-c5e2-4e02-a2ac-20ada881de47'
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'ForbiddenClientIdError', 'error type should be `ForbiddenClientIdError`');
      assert.equal(
        err.message,
        'Providing a client-generated ID is not supported in this version'
      );
      done();
    });
  });

  it('fails because has non-object attributes', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
        type: 'dummy-models',
        attributes: ['string']
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(
        err.message,
        '`data.attributes` should be an object'
      );
      done();
    });
  });

  it('fails because has non-object relationships', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
        type: 'dummy-models',
        relationships: ['string']
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err.name, 'PayloadFormatError', 'error type should be `PayloadFormatError`');
      assert.equal(
        err.message,
        '`data.relationships` should be an object'
      );
      done();
    });
  });
  it('has only type (POST)', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {
        type: 'dummy-models'
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err, undefined);
      assert.ok(_.isPlainObject(req[REQ_DATA_KEY]), 'req.' + REQ_DATA_KEY + ' should be initialized');
      done();
    });
  });

  it('has type and id (PATCH)', done => {
    const { req, res } = mockRequestAndResponse(
      'PATCH', '/api/v1/dummy-models/33', { kebabPlural: 'dummy-models' }, { data: {
        type: 'dummy-models', id: '33'
      } }
    );
    checkPayloadDataAttr(req, res, err => {
      assert.equal(err, undefined);
      assert.ok(_.isPlainObject(req[REQ_DATA_KEY]), 'req.' + REQ_DATA_KEY + ' should be initialized');
      done();
    });
  });

});

