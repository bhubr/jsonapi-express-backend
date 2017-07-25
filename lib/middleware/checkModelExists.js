const _      = require('lodash');
const naming = require('../naming');
const errors = require('../utils/errors');
const { REQ_DATA_KEY } = require('../constants');

let modelDescriptors;

/**
 * Check that model has been registered in model store
 */
function checkModelExists(req, res, next) {
  const { kebabPlural } = req.params;
  const camelSingular   = naming.toCamelSingular(kebabPlural);

  if(! modelDescriptors[camelSingular]) {
    return next(errors.UnknownModel(
      'Model `{{camelSingular}}` not found in model definitions (file `{{kebabPlural}}.js`)',
      { camelSingular, kebabPlural }
    ));
  }

  // Save model name for later
  req[REQ_DATA_KEY].modelName = camelSingular;
  return next();
}

module.exports = function(_modelDescriptors) {
  modelDescriptors = _modelDescriptors;
  return checkModelExists;
}