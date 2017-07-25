const lineLogger = require('console-line-logger');
const fs       = require('fs');
const path     = require('path');
const _        = require('lodash');
const naming   = require('../naming');
const extend   = require('xtend');

const defaultAttrOptions = {
  required: false,
  unique: false,
  validator: null,
  readable: true,
  writable: true
};
const acceptedAttrOptions = _.keys(defaultAttrOptions).concat('defaultValue');
const defaultRelationshipOptions = {
  inverse: null
};
const acceptedRelationshipOptions = ['relatedModel', 'type', 'inverse', 'isOwner'];
const defaultModelOptions = {
  _primaryKey: 'id',
  _timestamps: true
};
const acceptedModelOptions = _.keys(defaultModelOptions).concat('_tableName');

let modelsDir;
let dbConfig;
let transforms;
const defaultTransforms = {
  tablePrefix: '',
  pluralize: true,
  case: {
    tables: 'lcamel',
    fields: 'lcamel'
  }
};

function modelFinder(_modelsDir, _dbConfig) {
  let models;
  modelsDir = _modelsDir;
  dbConfig = _dbConfig || {};
  transforms = dbConfig.transforms;
  transforms = transforms ? extend(defaultTransforms, transforms) : defaultTransforms;
  try {
    const modelFiles = fs.readdirSync(modelsDir);
    models = _.reduce(modelFiles, (carry, filename) => {
      const { name, model } = registerModel(filename);
      carry[name] = model;
      return carry;
    }, {});
   } catch(err) {
    lineLogger(err);
    if(err.code === 'ENOENT') {
      throw new Error('Could not find models folder: ' + modelsDir);
    }
    if(err.name === 'SyntaxError') {
      throw err;
    }
    const message = 'Unknown error during models scan: ' + err.message;
    throw new Error(message);
  }
  return models;
}

function readModelFile(filename) {
  const modelFile = modelsDir + '/' + filename;
  let initialModel;
  try {
    initialModel = require(modelFile)({ attr, meta, belongsTo, hasMany });
  } catch(err) {
    if(err.name === 'SyntaxError') {
      err.message = 'Syntax error in model: ' + modelFile;
    }
    throw err;
  }
  return initialModel;
}

function getEmptyModel(filename) {
  const basename = path.basename(filename, '.js');
  const name = naming.toLowerCamel(basename);
  let model = {
    _name: name,
    _timestamps: true,
    _tableName: transformTableName(name),
    _primaryKey: 'id',
    _requiredAttrs: [],
    attributes: {},
    _relationships: {}
  };
  return { name, model };
}

function transformTableName(tableName) {
  const transformer = (transforms.tablePrefix && transforms.case.tables === 'lcamel') ?
      'camel' : transforms.case.tables;
  return transforms.tablePrefix +
    naming.transform(tableName, transformer, transforms.pluralize);
}

function checkAndTransformTimestamps(hasTimestamps) {
  if([true, false].indexOf(hasTimestamps) === -1) {
    throw new Error('_timestamps meta accepts only true or false (boolean)');
  }
  return value;
}

function checkAndTransformTableName(tableName) {
  return transformTableName(tableName);
}

const metaCheckAndTransforms = {
  _timestamps: checkAndTransformTimestamps,
  _tableName: checkAndTransformTableName
};

function checkAndTransformMeta(key, value) {
  const checkAndTransform = metaCheckAndTransforms[key];
  if(! checkAndTransform) {
    return value;
  }
  return checkAndTransform(value);
}

function populateModel(model, initialModel) {
  _.forOwn(initialModel, (hash, key) => {
    switch(hash.__type__) {
      case 'attr':
        model.attributes[key] = _.pick(hash, acceptedAttrOptions.concat('type'));
        if(model.attributes[key].required) {
          model._requiredAttrs.push(key);
        }
        break;
      case 'rel':
        hash.type = hash.__rel_type__;
        model._relationships[key] = _.pick(hash, acceptedRelationshipOptions);
        break;
      case 'meta':
        if(acceptedModelOptions.indexOf(key) !== -1) {
          model[key] = checkAndTransformMeta(key, hash.value);
        }
        break;
      default:
    }
  });
}

function checkConflicts(model) {
  if(model._primaryKey && model.attributes[model._primaryKey] ||
    ! model._primaryKey && model.attributes.id
  ) {
    throw new Error('Conflict: primary key and an attribute key are identical: ' + model.meta._primaryKey);
  }
}

function registerModel(filename) {
  const initialModel = readModelFile(filename);
  let { model, name } = getEmptyModel(filename);
  populateModel(model, initialModel);
  checkConflicts(model);
  return { name, model };
}

function meta(value) {
  const __type__ = 'meta';
  return { __type__, value };
}

function attr(type, options) {
  const __type__ = 'attr';
  options = _.pick(options || {}, acceptedAttrOptions);
  // lineLogger(extend(defaultAttrOptions, { __type__, type }, options))
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

module.exports = modelFinder;