const naming = require('../naming');
const { REQ_DATA_KEY } = require('../constants');

let modelDescriptors;

/**
 * Extract model name and table name from provided parameters.
 * NOOOOO! Model existence has already been checked before (middleware.check.existingModel),
 * NOOOOO! therefore no need to check again. 
 */
function extractModelAndTableName(req, res, next) {
  const { kebabPlural } = req.params;
  const camelSingular   = naming.toCamelSingular(kebabPlural);
  const model           = modelDescriptors[camelSingular];
  const tableName       = model._tableName;
  req[REQ_DATA_KEY] = { kebabPlural, camelSingular, tableName };
  next();
}

module.exports = function(_modelDescriptors) {
  modelDescriptors = _modelDescriptors;
  return {
    modelAndTableName: extractModelAndTableName
  };
};