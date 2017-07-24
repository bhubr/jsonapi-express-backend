module.exports = function(modelDescriptors) {
  
  return {
    check: require('./check')(modelDescriptors),
    extract: require('./extract')
  };

};