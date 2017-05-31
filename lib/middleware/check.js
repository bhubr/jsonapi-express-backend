module.exports = function(modelDescriptors) {

  function checkModel(req, res, next) {
    const type = req.body.data.type;
    if(! modelDescriptors[type]) {
      return res.status(400).json({ error: 'Model "' + type + '"" is not defined in models definition file' });
    }
    return next();
  }

  function checkAttributes(req, res, next) {
    const type = req.body.data.type;
    const { requiredAttributes } = modelDescriptors[type];
    if(requiredAttributes) {
      const attrNames = Object.keys(req.body.data.attributes);

      for (var index in requiredAttributes) {
        attrName = requiredAttributes[index];
        if(attrNames.indexOf(attrName) === -1) {
          return res.status(400).json({ error: 'Required field "' + attrName + '" not found in payload' });
        }
      }
    }
    return next();
  }

  return {
    model: checkModel,
    attributes: checkAttributes
  };
}