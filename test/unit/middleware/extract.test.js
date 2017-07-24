const chai        = require('chai');
const should      = chai.should();
const assert      = chai.assert;
const httpMocks   = require('node-mocks-http');
const appRootDir  = require('app-root-dir').get();
const modelFinder = require(appRootDir + '/lib/model/modelFinder');
const { REQ_DATA_KEY } = require(appRootDir + '/lib/constants');
const models      = modelFinder(appRootDir + '/test/unit/model/_resources/models', {
  transforms: { tablePrefix: 'fake' }
});
const extractMws  = require(appRootDir + '/lib/middleware/extract')(models);

function getReqAndRes(method, url, params, body) {
  const req = httpMocks.createRequest({
    method, url, params, body
  });
  const res = httpMocks.createResponse();
  return { req, res };
}


describe('extract middlewares', () => {

  it('extracts model and table name from url param', done => {
    const { req, res } = getReqAndRes(
      'POST', '/api/v1/dummy-models', { kebabPlural: 'dummy-models' }
    );
    extractMws.modelAndTableName(req, res, err => {
      assert.equal(err, undefined);
      assert.notEqual(req[REQ_DATA_KEY], undefined);
      assert.deepEqual(req[REQ_DATA_KEY], {
        kebabPlural: 'dummy-models',
        camelSingular: 'dummyModel',
        tableName: 'fakeDummies' // table name has been overridden in model definition
      });
      done();
    });

  });

});