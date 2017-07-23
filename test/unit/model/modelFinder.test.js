const chai        = require('chai');
const assert      = chai.assert;
const modelFinder = require('../../../lib/model/modelFinder');

describe('model finder', () => {

  it('tries to find models in non-existing folder', () =>
    modelFinder.findInDir(__dirname + '/wrongpath')
    .catch(err => {
      assert.equal(err.message, 'Could not find models folder: ' + __dirname + '/wrongpath');
    })
  );

  it('finds no models in empty models folder', () =>
    modelFinder.findInDir(__dirname + '/_resources/modelsEmpty')
    .then(models => {
      assert.deepEqual(models, {}, 'returned models should be an empty object');
    })
  );

  it('finds two models in models folder', () =>
    modelFinder.findInDir(__dirname + '/_resources/models')
    .then(models => {
      const expected = {
        foo: {
          _name: 'foo',
          meta: {
            _primaryKey: 'ID'
          },
          attributes: {
            foo: {
              required: false,
              validator: null,
              readable: true,
              writable: true,
              type: 'string'
            }
          },
          _relationships: {
            bars: {
              relatedModel: 'bar',
              type: 'hasMany',
              inverse: null
            }
          }
        },
        bar: {
          _name: 'bar',
          meta: {
            _primaryKey: 'ID'
          },
          attributes: {
            bar: {
              required: false,
              validator: null,
              readable: false,
              writable: false,
              type: 'string'
            }
          },
          _relationships: {
            foo: {
              relatedModel: 'foo',
              type: 'belongsTo',
              inverse: null
            }
          }
        },
        dummyModel: {
          _name: 'dummyModel',
          meta: {
            _tableName: 'dummy_models'
          },
          attributes: {
            dummy: {
              required: true,
              validator: null,
              readable: true,
              writable: true,
              type: 'string'
            }
          },
          _relationships: {}
        }
      };
      assert.deepEqual(models, expected, 'returned models should be an empty object');
    })
  );

});