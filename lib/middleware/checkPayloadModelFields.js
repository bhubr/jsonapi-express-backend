const _      = require('lodash');
const naming = require('../naming');
const errors = require('../utils/errors');
const { REQ_DATA_KEY } = require('../constants');

let store;

function checkPayloadModelFields(req, res, next) {
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

module.exports = function(_store) {
  store = _store;
  return checkPayloadModelFields;
}