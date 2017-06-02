module.exports = function(modelDescriptors) {
  
  return {
    check: require('./check')(modelDescriptors)
  };

};