module.exports = function(store) {

  const modelDescriptors = store.getModels();

  return {
    checkPayloadDataAttr: require('./checkPayloadDataAttr'),
    checkModelExists: require('./checkModelExists')(modelDescriptors),
    checkPayloadModelFields: require('./checkPayloadModelFields')(modelDescriptors),
    // extract: require('./extract')
  };

};