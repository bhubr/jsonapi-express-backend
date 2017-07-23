const fs       = require('fs');
const path     = require('path');
const extend   = require('xtend');
const _        = require('lodash');
const eventHub = require('../eventHub');
const winston  = require('winston');

function DataStore(modelsDir) {
  this._models = {};
  this.modelsDir = modelsDir;
  this.scanModels()
  .then(() => this.checkRelationships())
  .then(() => eventHub.emit('store.ready'));
}

DataStore.prototype.checkRelationships = function() {
  console.log('#checkRels', this._models);
  return new Promise((resolve, reject) => {
    try {
      _.forOwn(this._models, this.checkModelRelationships.bind(this));
      resolve(true);
    } catch(e) {
      console.log(e);
      reject(e);
    }
  })
}

DataStore.prototype.checkModelRelationships = function(model, key, models) {
  const { _relationships } = model;
  // console.log(this, _relationships);
  _.forOwn(_relationships, (relationship, key, relationships) => {
    this.checkModelRelationship.call(this, relationship, key, relationships, model, models);
  });
}

DataStore.prototype.checkModelRelationship = function(relationship, key, relationships, model, models) {
  // console.log('\n### ' + key, relationship, relationships, model, models);
  const { relatedModel } = relationship;
  let inverseRelationship;
  let inverseRelationships;
  if(! models[relatedModel]) {
    throw new Error('Could not find related model "' + relatedModel + '" for model "' + model._name + '"');
  }
  const relatedModelRels = models[relatedModel]._relationships;
  // let inverseRelationship = _.find(relatedModelRels, r => (r.inverse === key));
  // let inverseRelationship = _.find(relatedModelRels, r => {
  //   console.log(model._name, key, 'find inverse?', r);
  //   return r.inverse === key;
  // });
  if(relationship.inverse) {
    inverseRelationship = _.find(relatedModelRels, (r, k) => {
      const found = relationship.inverse === k;
      if(! found) {
        return false;
      }
      if(! r.inverse) {
        throw new Error(
          'Inverse relationship "' + relationship.inverse + '" found for ' + model._name +
          '.' + key + ', but the inverse was not explicitally set on ' + models[relatedModel]._name + '.' + k
        )
      }

      return true;
    });
    if(inverseRelationship === undefined) {
      throw new Error(
        'Inverse relationship "' + relationship.inverse + '" has been set on ' +
        model._name + '.' + key + ', but the inverse was not found on ' + models[relatedModel]._name
      )
    }
  }
  else {
    let matchingKeys = [];
    inverseRelationships = _.filter(relatedModelRels, (r, k) => {
      matchingKeys.push(k);
      return r.relatedModel === model._name;
    });
    if(inverseRelationships.length > 1) {
      throw new Error(
        'More than one relationship found for "' + model._name + '" on the same related model "' +
        relationship.relatedModel + '", but no explicit inverses have been specified for key "' + key + '"');
    }
    inverseRelationship = inverseRelationships[0];
    inverseRelationship.inverse = key;
    relationship.inverse = matchingKeys.pop();
  }
  console.log('\n## inverse for', model._name, key, '\n', inverseRelationship)
}


  // return {

  //   strategy: null,

  //   setStrategy: function(strategy) {
  //     this.strategy = strategy;
  //     this.strategy.init();
  //   },

  //   createRecord: function(type, attributes) {
  //     return this.strategy.createRecord(type, attributes);
  //   },

  //   findAll: function(type) {
  //     return this.strategy.findAll(type);
  //   },

  //   findRecord: function(type, id) {
  //     return this.strategy.findRecord(type, id);
  //   },

  //   findRecordsIn: function(type, ids) {
  //     return this.strategy.findRecordsIn(type, ids);
  //   },

  //   findRecordBy: function(type, where, multi) {
  //     return this.strategy.findRecordBy(type, where, multi);
  //   },

  //   updateRecord: function(type, id, attributes) {
  //     return this.strategy.updateRecord(type, id, attributes);
  //   },

  //   deleteRecord: function(type, id) {
  //     return this.strategy.deleteRecord(type, id);
  //   },

  //   getAllRels: function(type) {
  //     return this.strategy.getAllRels(type);
  //   },

  //   findRelatees: function(type, id, relKey) {
  //     return this.strategy.findRelatees(type, id, relKey);
  //   },

  //   findAllRelatees: function(type, id) {
  //     return this.strategy.findAllRelatees(type, id);
  //   },

  //   findAllRelateesMulti: function(type, records) {
  //     return this.strategy.findAllRelateesMulti(type, records);
  //   }
//   };
// }

module.exports = function(modelsDir) {
  return new DataStore(modelsDir)
};