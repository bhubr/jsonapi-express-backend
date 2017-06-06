const naming = require('../naming');
const _ = require('lodash');

module.exports = function(modelDescriptors) {

  function checkModel(req, res, next) {
    const { camelSingular, kebabPlural } = req.jsonapiData;
    if(naming.toKebabPlural(camelSingular) !== kebabPlural) {
      return res.status(400).json({ error: 'param given in url: "' + naming.toKebabPlural(camelSingular) + '" is wrong' });
    }
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
          attrName = _.kebabCase(requiredAttributes[index]);
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