const { REQ_DATA_KEY } = require('../constants');
const utils = require('../utils');
const errors = require('../utils/errors');

const transformers = {
  lcamel: utils.lowerCamelKeys,
  snake: utils.snakeKeys
}
let transformFunc;

function transformResourceObjFields(req, res, next) {
  let { attributes, relationships } = req.body.data;
  attributes = attributes || {};
  relationships = relationships || {};
  req[REQ_DATA_KEY].attributes = transformFunc(attributes);
  req[REQ_DATA_KEY].relationships = transformFunc(relationships);
  next();
}

function setTransformFunc(fieldsTransform) {
  transformFunc = transformers[fieldsTransform];
  if(! transformFunc) {
    const supportedTransforms = Object.keys(transformers).join(', ');
    throw errors.Config(
      'Unsupported value `{{transform}}` for config.db.transforms.case.fields. ' +
      'Possible values: {{supportedTransforms}}',
      { transform: caseTransforms.fields, supportedTransforms }
    );
  }
}

// caseTransforms example: { tables: 'snake', fields: 'lcamel' }
module.exports = function(caseTransforms) {
  setTransformFunc(caseTransforms.fields);
  return transformResourceObjFields;
}