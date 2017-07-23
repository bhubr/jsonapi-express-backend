const _ = require('lodash');

module.exports = function(modelsDir, config) {
  console.log(modelsDir, config);


  // const modelScanner = require('./modelScanner')(modelsDir);
  // const relationships = require('./relationships')(modelDescriptors)
  const store = require('./store')(modelsDir);
  const descriptors = store.getModels();
  const hooks = require('./hooks')(descriptors);
  let modelRelationships = {};
   _.forOwn(descriptors, function(value, key) {
    modelRelationships[key] = value.relationships;
  });
console.log(modelRelationships);
  return {
    hooks,
    relationships: require('./relationships/index'),
    modelRelationships,
    descriptors,
    store
  };

};