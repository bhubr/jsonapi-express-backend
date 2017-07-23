const fs       = require('fs');
const path     = require('path');
const _        = require('lodash');
const naming   = require('../naming');
const extend   = require('xtend');

if(! fs.readdirAsync) {
  require('bluebird').promisifyAll(fs);
}

const defaultAttrOptions = {
  required: false,
  validator: null,
  readable: true,
  writable: true
};
const acceptedAttrOptions = ['required', 'validator', 'readable', 'writable', 'defaultValue'];
const defaultRelationshipOptions = {
  inverse: null
};
const acceptedRelationshipOptions = ['relatedModel', 'type', 'inverse', 'isOwner'];
const defaultModelOptions = {
  _primaryKey: 'id',
  _timestamps: true
};
const acceptedModelOptions = ['_primaryKey', '_tableName', '_timestamps'];


function findInDir(modelsDir) {
  return fs.readdirAsync(modelsDir)
  .then(modelFiles => _.reduce(modelFiles, (carry, filename) => {
    const { name, model } = registerModel(modelsDir, filename);
    carry[name] = model;
    return carry;
  }, {}))
  .catch(err => {
    // console.log(err);
    if(err.code === 'ENOENT') {
      throw new Error('Could not find models folder: ' + modelsDir);
    }
    if(err.name === 'SyntaxError') {
      throw err;
    }
    const message = 'Unknown error during models scan: ' + err.message;
    throw new Error(message);
  });
}

 function registerModel(modelsDir, filename) {
  const basename = path.basename(filename, '.js');
  const name = naming.toLowerCamel(basename);
  let model = {
    _name: name,
    meta: {},
    attributes: {},
    _relationships: {}
  };
  let modelInitializing;
  let modelFile = modelsDir + '/' + filename;
  try {
    modelInitializing = require(modelFile)({ attr, meta, belongsTo, hasMany });
  } catch(err) {
    if(err.name === 'SyntaxError') {
      err.message = 'Syntax error in model: ' + modelFile;
    }
    // throw new Error('Unknown error in model: ' + modelFile + ' (' + err.message + ')');
    throw err;
  }
  _.forOwn(modelInitializing, (hash, key) => {
    switch(hash.__type__) {
      case 'attr':
        model.attributes[key] = _.pick(hash, acceptedAttrOptions.concat('type'));
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

function meta(value) {
  const __type__ = 'meta';
  return { __type__, value };
}

function attr(type, options) {
  const __type__ = 'attr';
  options = _.pick(options || {}, acceptedAttrOptions);
  // console.log(extend(defaultAttrOptions, { __type__, type }, options))
  return extend(defaultAttrOptions, { __type__, type }, options);
}

 function belongsTo(relatedModel, options) {
  return relationship(relatedModel, options, 'belongsTo');
}

function hasMany(relatedModel, options) {
  return relationship(relatedModel, options, 'hasMany');
}

function relationship(relatedModel, options, relType) {
  const __type__ = 'rel';
  const __rel_type__ = relType;
  options = _.pick(options || {}, acceptedRelationshipOptions);
  return extend(defaultRelationshipOptions, { __type__, __rel_type__, relatedModel }, options);
}

module.exports = { findInDir };