module.exports = function(store, config) {

  const modelDescriptors = store.getModels();

  return {
    checkPayloadDataAttr: require('./checkPayloadDataAttr'),
    checkModelExists: require('./checkModelExists')(modelDescriptors),
    checkPayloadModelFields: require('./checkPayloadModelFields')(modelDescriptors),
    transformResourceObjFields: require('./transformResourceObjFields')(config.db.transforms.case),
    errorHandler: require('./errorHandler')
    // extract: require('./extract')
  };

};