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

const defaultRelationshipOptions = {
  inverse: null
};
const acceptedRelationshipOptions = ['relatedModel', 'type', 'inverse'];

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
  .then(modelFiles => _.reduce(modelFiles, (carry, filename) => {
    const { name, model } = registerModel(filename);
    carry[name] = model;
    return carry;
  }, {}))
  .then(models => {
    this._models = models;
  })
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
  const name = naming.toLowerCamel(basename);
  let model = {
      meta: {},
      attributes: {},
      relationships: {}
    };
  const modelInitializing = require(this.modelsDir + '/' + filename)(this);
  _.forOwn(modelInitializing, (hash, key) => {
    switch(hash.__type__) {
      case 'attr':
        model.attributes[key] = _.pick(hash, acceptedAttrOptions);
        break;
      case 'rel':
        hash.type = hash.__rel_type__;
        model.relationships[key] = _.pick(hash, acceptedRelationshipOptions);
        break;
      case 'meta':
        if(acceptedModelOptions.indexOf(key) !== -1) {
          model.meta[key] = hash.value;
        }
        break;
      default:
    }
  });
  return { name, model };
}

DataStore.prototype.meta = function(value) {
  const __type__ = 'meta';
  return { __type__, value };
}

DataStore.prototype.attr = function(type, options) {
  const __type__ = 'attr';
  options = _.pick(options || {}, acceptedAttrOptions);
  return extend(defaultAttrOptions, { __type__, type }, options);
}

DataStore.prototype.belongsTo = function(relatedModel, options) {
  const __type__ = 'rel';
  const __rel_type__ = 'belongsTo';
  options = _.pick(options || {}, acceptedRelationshipOptions);
  return extend(defaultRelationshipOptions, { __type__, __rel_type__, relatedModel }, options);
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