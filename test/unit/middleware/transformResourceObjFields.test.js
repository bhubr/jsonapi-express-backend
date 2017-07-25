const chai        = require('chai');
const should      = chai.should();
const assert      = chai.assert;
const _           = require('lodash');
const appRootDir  = require('app-root-dir').get();
const rewire      = require('rewire');

const { REQ_DATA_KEY }           = require(appRootDir + '/lib/constants');
const caseTransforms             = { fields: 'lcamel' };
const transformModule            = rewire(appRootDir + '/lib/middleware/transformResourceObjFields');
const transformResourceObjFields = transformModule(caseTransforms);
const setTransformFunc           = transformModule.__get__('setTransformFunc');
const mockRequestAndResponse     = require('../../tools/mockRequestAndResponse');

const body = { data: {
  type: 'my-models',
  attributes: {
    'my-first-attr': 'Lorem ipsum dolor',
    'my-second-attr': 667
  },
  relationships: {
    'owner-model': {
      data: { type: 'users', id: 1 }
    },
    'owned-models': {
      data: [
        { type: 'bars', id: 1 }, { type: 'bars', id: 2 }
      ]
    }
  }
} };
describe('converts provided attributes and relationships keys', () => {


  // lower camel case transform

  describe('with lower camel case transform', () => {

    it('with complex attr names', done => {

      // We have to do that otherwise the tests fail because of interference
      setTransformFunc('lcamel');
      const { req, res } = mockRequestAndResponse(
        'POST', '/api/v1/my-models', { kebabPlural: 'my-models' }, body
      );
      req[REQ_DATA_KEY] = {};
      transformResourceObjFields(req, res, err => {
        assert.deepEqual(req[REQ_DATA_KEY].attributes, {
          myFirstAttr: 'Lorem ipsum dolor',
          mySecondAttr: 667
        });
        assert.deepEqual(req[REQ_DATA_KEY].relationships, {
          ownerModel: {
            data: { type: 'users', id: 1 }
          },
          ownedModels: {
            data: [
              { type: 'bars', id: 1 }, { type: 'bars', id: 2 }
            ]
          }
        });
        done();
      });
    });
  });


  // snake case transform

  describe('with snake case transform', () => {

    it('with complex attr names', done => {
      setTransformFunc('snake');
      const { req, res } = mockRequestAndResponse(
        'POST', '/api/v1/my-models', { kebabPlural: 'my-models' }, body
      );
      req[REQ_DATA_KEY] = {};
      transformResourceObjFields(req, res, err => {
        assert.deepEqual(req[REQ_DATA_KEY].attributes, {
          my_first_attr: 'Lorem ipsum dolor',
          my_second_attr: 667
        });
        assert.deepEqual(req[REQ_DATA_KEY].relationships, {
          owner_model: {
            data: { type: 'users', id: 1 }
          },
          owned_models: {
            data: [
              { type: 'bars', id: 1 }, { type: 'bars', id: 2 }
            ]
          }
        });
        done();
      });
    });
  });

});