const fs       = require('fs');
const path     = require('path');
const extend   = require('xtend');
const _        = require('lodash');
const naming   = require('../naming');
const eventHub = require('../eventHub');
const winston  = require('winston');

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
    inverseRelationships = _.filter(relatedModelRels, r => (r.relatedModel === model._name));
    if(inverseRelationships.length > 1) {
      throw new Error(
        'More than one relationship found for "' + model._name + '" on the same related model "' +
        relationship.relatedModel + '", but no explicit inverses have been specified for key "' + key + '"');
    }
  }
  // console.log('\n## inverses for', model._name, key, '\n', inverseRelationships)
}

DataStore.prototype.scanModels = function() {
  const registerModel = this.registerModel.bind(this);
  return fs.readdirAsync(this.modelsDir)
  .then(modelFiles => _.reduce(modelFiles, (carry, filename) => {
    const { name, model } = registerModel(filename);
    carry[name] = model;
    return carry;
  }, {}))
  .then(models => {
    console.log(models);
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
      _name: name,
      meta: {
      },
      attributes: {},
      _relationships: {}
    };
  const modelInitializing = require(this.modelsDir + '/' + filename)(this);
  _.forOwn(modelInitializing, (hash, key) => {
    switch(hash.__type__) {
      case 'attr':
        model.attributes[key] = _.pick(hash, acceptedAttrOptions);
        break;
      case 'rel':
        hash.type = hash.__rel_type__;
        model._relationships[key] = _.pick(hash, acceptedRelationshipOptions);
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
  return this.relationship(relatedModel, options, 'belongsTo');
}

DataStore.prototype.hasMany = function(relatedModel, options) {
  return this.relationship(relatedModel, options, 'hasMany');
}

DataStore.prototype.relationship = function(relatedModel, options, relType) {
  const __type__ = 'rel';
  const __rel_type__ = relType;
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