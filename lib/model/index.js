const lineLogger = require('console-line-logger');
const _ = require('lodash');

module.exports = function(modelsDir, config) {

  // const relationships = require('./relationships')(modelDescriptors)
  const store = require('./store')(modelsDir, config.db);
  const descriptors = store.getModels();
  const hooks = require('./hooks')(descriptors);
  let modelRelationships = {};
   _.forOwn(descriptors, function(value, key) {
    modelRelationships[key] = value.relationships;
  });
// lineLogger(modelRelationships);
  return {
    hooks,
    relationships: require('./relationships/index'),
    modelRelationships,
    descriptors,
    store
  };

};