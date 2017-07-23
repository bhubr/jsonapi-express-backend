module.exports = function(modelsDir, config) {
  console.log(modelsDir, config);


  // const modelScanner = require('./modelScanner')(modelsDir);
  // const hooks = require('./hooks')(modelDescriptors);
  // const relationships = require('./relationships')(modelDescriptors)
  const store = require('./store')(modelsDir);
  return {
    // hooks,
    relationships: require('./relationships/index'),
    // descriptors: modelDescriptors,
    // store
  };

};