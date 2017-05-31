module.exports = function(modelDescriptors) {
  
  const hooks = require('./hooks')(modelDescriptors);
  const relationships = require('./relationships')(modelDescriptors)
  const store = require('./store')(modelDescriptors);
  return {
    hooks,
    relationships,
    descriptors: modelDescriptors,
    store
  };

};