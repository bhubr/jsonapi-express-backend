const chai          = require('chai');
const assert        = chai.assert;
const _             = require('lodash');
const modelFinder   = require('../../../lib/model/modelFinder');
const relationships = require('../../../lib/model/relationships');

describe('relationships', () => {

  it('finds relationships in simple models', () =>
    modelFinder.findInDir(__dirname + '/_resources/models')
    .then(relationships.check)
    .then(models => {
      let relationships = {};
      _.forOwn(models, (model, key) => {
        relationships[key] = model.relationships;
      });
      const expected = {
        foo: {
          bars: {
            relatedModel: 'bar',
            type: 'hasMany',
            inverse: 'foo'
          }
        },
        bar: {
          foo: {
            relatedModel: 'foo',
            type: 'belongsTo',
            inverse: 'bars'
          }
        },
        dummyModel: {}
      }
      assert.deepEqual(relationships, expected);
    })
  );
});