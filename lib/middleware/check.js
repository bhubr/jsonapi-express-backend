const _      = require('lodash');
const naming = require('../naming');
const errors = require('../utils/errors');
const { REQ_DATA_KEY } = require('../constants');

// http://jsonapi.org/format/#document-resource-objects
// Only type is REQUIRED for POST.
const requiredKeysPerMethod = {
  post: ['type'],
  // put: ['id', 'type'],
  patch: ['id', 'type'],
}
let modelDescriptors;

function checkRequiredPayloadAttributes(req, res, next) {
  if(! req.body || Object.keys(req.body).length === 0) {
    return next(errors.PayloadFormat('payload body not found or empty'));
  }
  else if (! req.body.data) {
    return next(errors.PayloadFormat('`data` attribute not found on payload'));
  }
  const requiredKeys = requiredKeysPerMethod[req.method.toLowerCase()];
  const { data } = req.body;
  const keys = Object.keys(data);
  // const providedType = naming.toCamelSingular(data.kebabPlural);
  for(k = 0 ; k < requiredKeys.length ; k++) {
    const key = requiredKeys[k];
    if(keys.indexOf(key) === -1) {
      let err = errors.PayloadFormat(
        '`data.{{key}}` attribute is required for HTTP method `{{method}}`',
        { key, method: req.method }
      );
      return next(err);
    }
  }
  const urlType = req.params.kebabPlural;
  const payloadType = req.body.data.type;
  if(payloadType !== urlType) {
    let err = errors.PayloadFormat(
      'Type in payload: `{{payloadType}}` does not match type in URL: `{{urlType}}`',
      { payloadType, urlType }
    );
    return next(err);
  }
  return next();
}


function checkExistingModel(req, res, next) {
  const { camelSingular, kebabPlural } = req[REQ_DATA_KEY];
  if(naming.toKebabPlural(camelSingular) !== kebabPlural) {
    return res.status(400).json({ error: 'param given in url: "' + naming.toKebabPlural(camelSingular) + '" is wrong' });
  }
  if(! modelDescriptors[camelSingular]) {
    return res.status(404).json({ error: 'Model "' + camelSingular + '"" is not defined in models definition file' });
  }
  return next();
}

function checkModelAttributes(req, res, next) {
  try {
    const { camelSingular } = req[REQ_DATA_KEY];
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

module.exports = function(_modelDescriptors) {
  modelDescriptors = _modelDescriptors;
  return {
    payloadAttributes: checkRequiredPayloadAttributes,
    existingModel: checkExistingModel,
    attributes: checkModelAttributes
  };
}