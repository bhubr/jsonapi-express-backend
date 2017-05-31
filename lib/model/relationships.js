const _ = require('lodash');

module.exports = function(modelDescriptors) {

  let modelRelationships = {};
   _.forOwn(modelDescriptors, function(value, key) {
    modelRelationships[key] = value.relationships;
  });

   return modelRelationships;
}