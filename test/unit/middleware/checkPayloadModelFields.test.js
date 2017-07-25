const chai        = require('chai');
const should      = chai.should();
const assert      = chai.assert;
const _           = require('lodash');
const appRootDir  = require('app-root-dir').get();

const modelFinder             = require(appRootDir + '/lib/model/modelFinder');
const models                  = modelFinder(appRootDir + '/test/unit/model/_resources/models')
const checkPayloadModelFields = require(appRootDir + '/lib/middleware/checkPayloadModelFields')(models);
const { REQ_DATA_KEY }        = require(appRootDir + '/lib/constants');
const mockRequestAndResponse  = require('../../tools/mockRequestAndResponse');

describe('checks payload fields (attributes&relationships: checkPayloadModelFields', () => {

  it('no attributes: fails because one is required', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {} }
    );
    // simulate that we have:
    // 1. checked model existence
    // 2. converted attrs with transformResourceObjFields
    req[REQ_DATA_KEY] = {
      modelName: 'dummyModel',
      attributes: {},
      relationships: {}
    }
    checkPayloadModelFields(req, res, err => {
      assert.equal(err.name, 'MissingFieldError', 'error type should be `MissingFieldError`');
      assert.equal(err.message, 'Required field `dummy` not found in payload');
      done();
    });
  });

  it('required attr is provided', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }, { data: {} }
    );
    // simulate that we have:
    // 1. checked model existence
    // 2. converted attrs with transformResourceObjFields
    req[REQ_DATA_KEY] = {
      modelName: 'dummyModel',
      attributes: {
        dummy: 'dummy'
      },
      relationships: {}
    }
    checkPayloadModelFields(req, res, err => {
      assert.equal(err, undefined);
      done();
    });
  });

});