const _ = require('lodash');
const naming = require('./naming');
const winston = require('winston');

function extract(req) {
  let output = {};
  let id;
  const { kebabPlural } = req.params;
  if(req.params.kebabPlural === undefined) {
    throw new Error('kebabPlural param is undefined');
  }
  if(req.params.id !== undefined) {
    if(isNaN(req.params.id)) {
      throw new Error('id ' + req.params.id + ' is NaN');
    }
    output.id = parseInt(req.params.id, 10);
  }
  output.camelSingular = naming.toCamelSingular(kebabPlural);
  output.tableName = naming.toTableName(kebabPlural);
  output.kebabPlural = kebabPlural;
  // winston.info(req.method, req.url, output);
  return output;
}

module.exports = { extract };