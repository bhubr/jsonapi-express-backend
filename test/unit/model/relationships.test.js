const chai          = require('chai');
const assert        = chai.assert;
const rewire        = require('rewire');
const _             = require('lodash');
const modelFinder   = require('../../../lib/model/modelFinder');
const setup         = require('../../../lib/model/relationships/setup');
const setupExtract  = rewire('../../../lib/model/relationships/setupExtract');
const extractBelongsToBelongsTo = setupExtract.__get__("extractBelongsToBelongsTo");

function fakeStore() {
  const models = {
    post: [{ id: 1, title: 'Blob', passportId: 1 }, { id: 2, title: 'Blah', passportId: 20 }],
    user: [{ id: 1, name: 'Joe' }, { id: 5, name: 'Jane' }],
    passport: [{ id: 1, serial: 'A01', ownerId: 1 }, { id: 20, serial: 'A02', ownerId: 2 }],
  };
  return {
    findRecord: function(model, id) {
      // console.log(model, id, _.find(models[model], { id }));
      return Promise.resolve(_.find(models[model], { id }));
    }
  }  
}

setupExtract.setStore(fakeStore());

describe('relationships', () => {

  it('finds relationships in simple models', done => {
    const models = modelFinder.findInDir(__dirname + '/_resources/models');
    setup(models);
    // console.log(models);
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
    done();
  });

  it('finds one-to-one in user models and fakes failure because of no isOwner', done => {
    const models = modelFinder.findInDir(__dirname + '/_resources/modelsUser');
    models.user._relationships.passport.isOwner = false;
    try {
      setup(models);
    } catch(err) {
      assert.equal(err.message, 'No member of the 1-to-1 relationship passport-user has isOwner=true');
      return done();
    }
    done(new Error('there should be an error!'));
  });

  it('finds one-to-one in user models and fakes failure because of both isOwner', done => {
    const models = modelFinder.findInDir(__dirname + '/_resources/modelsUser')
    models.passport._relationships.owner.isOwner = true;
    try {
      setup(models);
    } catch(err) {
      assert.equal(err.message, 'Only one member of the 1-to-1 relationship passport-user should have isOwner=true');
      return done();
    }
    done(new Error('there should be an error!'));
  });

  it('extract function for belongsTo/belongsTo should fail if relatee not found', () => {
    const func = extractBelongsToBelongsTo({ relatedModel: 'passport', isOwner: true }, { relatedModel: 'user' });
    // console.log(func.toString())
    const payload = { type: 'passports', id: 3 };
    func(payload)
    .catch(err => {
      assert.equal(err.message, 'no record found for "passport" with id 3');
    });
  });

  // Update a user by assinging him a new passport
  // 
  it('sets up extract function for belongsTo/belongsTo', () => {
    const func = extractBelongsToBelongsTo({ relatedModel: 'passport', isOwner: true }, { relatedModel: 'user', column: 'ownerId' });
    // console.log(func.toString())
    const payload = { type: 'passports', id: 20 };
    func(payload);
  });

});