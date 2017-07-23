const fs       = require('fs');
const path     = require('path');
const extend   = require('xtend');
const _        = require('lodash');
const naming   = require('../naming');

const defaultAttrOptions = {
  required: false,
  validator: null,
  readable: true,
  writable: true,
};

const acceptedAttrOptions = ['required', 'validator', 'readable', 'writable', 'defaultValue'];

const defaultModelOptions = {
  _primaryKey: 'id',
  _timestamps: true
};

const acceptedModelOptions = ['_primaryKey', '_tableName', '_timestamps'];

function DataStore(modelsDir) {
  this._models = {};
  this._modelInitializing = '';
  this.modelsDir = modelsDir;
  this.scanModels();
}

DataStore.prototype.scanModels = function() {
  const registerModel = this.registerModel.bind(this);
  fs.readdirAsync(this.modelsDir)
  .then(modelFiles => _.map(modelFiles, registerModel))
  //   modelFiles.forEach(filename => {
  //     this.registerModel(filename)
  //     require(this.modelsDir + '/' + filename)(this);
  //   });
  // })
  // .then(modelFiles => {
  //   modelFiles.forEach(filename => {
  //     this.registerModel(filename)
  //     require(this.modelsDir + '/' + filename)(this);
  //   });
  // })
  .catch(err => {
    console.log('Error during models scan', err);
    throw err;
  })
}


DataStore.prototype.registerModel = function(filename) {
  const basename = path.basename(filename, '.js');
  const lcName = naming.toLowerCamel(basename);
  // this._modelInitializingName = lcName;
  this._registerData = {
    meta: 0,
    attr: 0,
    rel: 0
  }
  let newModel = this._models[lcName] = {
      meta: {},
      attributes: {},
      relationships: {}
    };
  console.log(filename, lcName);
  const modelInitializing = require(this.modelsDir + '/' + filename)(this);
  // const attributes = _.filter(modelInitializing, prop => (prop.startsWith('_attr')));
  // console.log(modelInitializing); //, attributes);
  _.forOwn(modelInitializing, (hash, key) => {
    switch(hash.__type__) {
      case 'attr':
        newModel.attributes[key] = _.pick(hash, acceptedAttrOptions);
        break;
      default:
    }
    // console.log(hash)
    // const [ignored, type, model, num] = hash.__key__.split('_');
  });
  console.log(newModel);
}

DataStore.prototype.attr = function(type, options) {
  const __type__ = 'attr'; // + this._modelInitializingName + '_' + this._registerData.attr;
  this._registerData.attr++;
  options = _.pick(options || {}, acceptedAttrOptions);
  const attr = extend(defaultAttrOptions, { __type__, type }, options);
  console.log(attr);
  return attr;
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