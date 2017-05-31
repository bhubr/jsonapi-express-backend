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

function toCamelSingular(kebabPlural) {
  return toLowerCamel(Inflector.singularize(kebabPlural));
}

const transformers = {
  // snakeCase,
  // kebabCase,
  toLowerCamel,
  // toUpperCamel,
  toTableName,
  // toPluralType: toLowerCamel,
  toCamelSingular
};

module.exports = transformers;