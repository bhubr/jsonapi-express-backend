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
  return _.map(records.models, model => {
    const id = model.attributes.id;
    delete model.attributes.id;
    const attributes = kebabAttributes(model.attributes);
    return Object.assign({}, { id, type }, { attributes });
  });
}

module.exports = {
  lowerCamelAttributes, snakeAttributes, kebabAttributes, mapRecords
}