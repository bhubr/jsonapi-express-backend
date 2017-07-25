const chai        = require('chai');
const should      = chai.should();
const assert      = chai.assert;
const appRootDir  = require('app-root-dir').get();
const modelFinder = require(appRootDir + '/lib/model/modelFinder');
const models      = modelFinder(appRootDir + '/test/unit/model/_resources/models')
const checkModelExists    = require(appRootDir + '/lib/middleware/checkModelExists')(models);
const mockRequestAndResponse = require('../../tools/mockRequestAndResponse');

describe('checks model existence: checkModelExists', done => {

  it('model does not exists', done => {
    const { req, res } = mockRequestAndResponse(
      'POST', '/api/v1/unknown-models', { kebabPlural: 'unknown-models' }, { data: {
        type: 'unknown-models'
      } }
    );
    checkModelExists(req, res, err => {
      assert.equal(err.name, 'UnknownModelError', 'error type should be `UnknownModelError`');
      assert.equal(
        err.message,
        'Model `unknownModel` not found in model definitions (file `unknown-models.js`)'
      );
      done();
    });
  });

});