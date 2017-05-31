module.exports = function(modelDescriptors) {
  
  return {
    hooks: require('./hooks')(modelDescriptors),
    relationships: require('./relationships')(modelDescriptors),
    store: require('./store')(modelDescriptors),
    descriptors: modelDescriptors
  };

};