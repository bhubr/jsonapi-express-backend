const fs            = require('fs');
const path          = require('path');
const extend        = require('xtend');
const _             = require('lodash');
const eventHub      = require('../eventHub');
const winston       = require('winston');
const modelFinder   = require('./modelFinder');
const relationships = require('./relationships/index');
let store = null;

let models;

function DataStore(modelsDir) {
  models = modelFinder.findInDir(modelsDir);
  relationships.setup(models);
  // .then(relationships.setupExtract)
  // .then(_models => {
  //   models = _models;
  //   eventHub.emit('store.ready', models);
  // });
}

DataStore.prototype.getModels = function() {
  return models;
};

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
  if(! store) {
    store = new DataStore(modelsDir);
  }
  return store;
};