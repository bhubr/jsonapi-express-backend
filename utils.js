var _ = require('lodash');

function lowerCamelAttributes(attributes) {
  var newAttrs = {};
  for(var a in attributes) {
    var lowerCamelAttrKey = _.lowerFirst( _.camelCase(a));
    newAttrs[lowerCamelAttrKey] = attributes[a];
  }
  return newAttrs;
}

function snakeAttributes(attributes) {
  var newAttrs = {};
  for(var a in attributes) {
    var snakedAttrKey = _.snakeCase(a);
    newAttrs[snakedAttrKey] = attributes[a];
  }
  return newAttrs;
}

function kebabAttributes(attributes) {
  var newAttrs = {};
  for(var a in attributes) {
  var snakedAttrKey = _.kebabCase(a);
  newAttrs[snakedAttrKey] = attributes[a];
  }
  return newAttrs;
}

function mapRecords(records, type) {
  return _.map(records, model => {
    const id = model.dataValues.id;
    delete model.dataValues.id;
    const attributes = kebabAttributes(model.dataValues);
    return Object.assign({}, { id, type }, { attributes });
  });
}

module.exports = {
  lowerCamelAttributes, snakeAttributes, kebabAttributes, mapRecords
}