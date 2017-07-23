const chai          = require('chai');
const assert        = chai.assert;
const rewire        = require('rewire');
const _             = require('lodash');
const modelFinder   = require('../../../lib/model/modelFinder');
const setup         = require('../../../lib/model/relationships/setup');
const setupExtract  = rewire('../../../lib/model/relationships/setupExtract');

const extractBelongsToBelongsTo = setupExtract.__get__("extractBelongsToBelongsTo");

describe('relationships', () => {

  it('finds relationships in simple models', () =>
    modelFinder.findInDir(__dirname + '/_resources/models')
    .then(setup)
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

  it('finds one-to-one in user models and fakes failure because of no isOwner', () =>
    modelFinder.findInDir(__dirname + '/_resources/modelsUser')
    .then(models => {
      models.user._relationships.passport.isOwner = false;
      // console.log(models.user._relationships.passport, models.passport._relationships.owner.isOwner)
      return models;
    })
    .then(setup)
    .then(anything => {
      throw new Error('there should be an error!')
    })
    .catch(err => {
      assert.equal(err.message, 'No member of the 1-to-1 relationship passport-user has isOwner=true');
    })
  );

  it('finds one-to-one in user models and fakes failure because of both isOwner', () =>
    modelFinder.findInDir(__dirname + '/_resources/modelsUser')
    .then(models => {
      // console.log(models.user._relationships.passport)
      models.passport._relationships.owner.isOwner = true;
      return models;
    })
    .then(setup)
    .then(anything => {
      throw new Error('there should be an error!')
    })
    .catch(err => {
      assert.equal(err.message, 'Only one member of the 1-to-1 relationship passport-user should have isOwner=true')
    })
  );

  it('sets up extract function for belongsTo/belongsTo', () => {
    const func = extractBelongsToBelongsTo('post');
    // console.log(func.toString())
    const payload = { type: 'posts', id: 1 };
    func(payload);
  });

});