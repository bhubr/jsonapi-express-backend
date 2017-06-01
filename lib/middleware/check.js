module.exports = function(modelDescriptors) {

  function checkModel(req, res, next) {
    const { camelSingular } = req.jsonapiData;
    if(! modelDescriptors[camelSingular]) {
      return res.status(400).json({ error: 'Model "' + camelSingular + '"" is not defined in models definition file' });
    }
    return next();
  }

  function checkAttributes(req, res, next) {
    try {
      const { camelSingular } = req.jsonapiData;
      const { requiredAttributes } = modelDescriptors[camelSingular];
      if(requiredAttributes) {
        const attrNames = Object.keys(req.body.data.attributes);

        for (var index in requiredAttributes) {
          attrName = requiredAttributes[index];
          if(attrNames.indexOf(attrName) === -1) {
            return res.status(400).json({ error: 'Required field "' + attrName + '" not found in payload' });
          }
        }
      }
    } catch(e) {
      console.log(e);
      return res.status(500).json({ error: e.message });
    }
    return next();
  }

  return {
    model: checkModel,
    attributes: checkAttributes
  };
}