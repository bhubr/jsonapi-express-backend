const _ = require('lodash');
const Inflector = require('inflector-js');

// let strategy = 'lowerCamel';
/**
 * Convert any to snake case
 * e.g. random-slug => random_slug
 */
// function snakeCase(str) {
//   return _.snakeCase(str);
// }

/**
 * Convert any to snake case
 * e.g. random-slug => random_slug
 */
// function kebabCase(str) {
//   return _.kebabCase(str);
// }

/**
 * Uncapitalize 1st char
 * e.g. RandomString => randomString
 */
function uncapitalizeFirst(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Get lowerCameCased string
 * e.g. random-string => randomString
 */
function toLowerCamel(str) {
  return uncapitalizeFirst(_.camelCase(str));
}

/**
 * Get UpperCameCased string
 * e.g. random-string => RandomString
 */
// function toUpperCamel(str) {
//   return _.camelCase(str);
// }

/**
 * e.g. super-duper-models => super_duper_models
 */
function toTableName(typeFrom, isSingular) {
  typeFrom = isSingular ? Inflector.pluralize(typeFrom) : typeFrom;
  return _.snakeCase(typeFrom);
}

// function getPivotTable(objectKey, objectTable, relateeKey, relateeTable) {
//   const thisFirst = objectTable === relateeTable ?
//     objectKey <= relateeKey : objectTable <= relateeTable;
//   const pivotTable = thisFirst ?
//     objectTable + '_' + relateeTable + '_' + objectKey :
//     relateeTable + '_' + objectTable + '_' + relateeKey;
//   return { pivotTable, thisFirst };
// }
function getPivotTable(model, relKey, rel, rev) {
  // console.log('#getPivotTable', rel, relKey, rev, model)
  const thisFirst = model === rel.model ?
    relKey <= rel.reverse : model <= rel.model;
  const trailingKey = thisFirst ? relKey : rel.reverse;
  const pivotTable = thisFirst ?
    model + '_' + rel.model + '_' + trailingKey :
    rel.model + '_' + model + '_' + trailingKey;
  // console.log('#getPivotTable', pivotTable);
  return { pivotTable, thisFirst };
}

function toCamelSingular(kebabPlural) {
  return toLowerCamel(Inflector.singularize(kebabPlural));
}

function toKebabPlural(camelSingular) {
  return _.kebabCase(Inflector.pluralize(camelSingular));
}

const transformers = {
  // snakeCase,
  // kebabCase,
  toLowerCamel,
  // toUpperCamel,
  toTableName,
  // toPluralType: toLowerCamel,
  toCamelSingular,
  toKebabPlural,
  getPivotTable
};

module.exports = transformers;