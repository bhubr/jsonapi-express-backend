const _      = require('lodash');
const naming = require('../naming');
const errors = require('../utils/errors');
const { REQ_DATA_KEY } = require('../constants');

let modelDescriptors;

/**
 * before: checked that required attributes were present,
 * therefore was used only for POST
 *
 * now: split it in:
 * 1. check required attrs for POST
 * 2. check that no client-generated ID is provided => checkPayloadDataAttr
 * 3. check that no unknown attributes are provided
 * 4. check provided relationships:
 *   a) based on relationship keys (reject if payload contains unknown attrs)
 *   b) based on relationship type
 *      (e.g. reject if an array is provided for a one-to-one relationship&vice-versa)
 *   c) also check content of item ({type, id}) or item array ([{type, id}, ...]) HERE??
 *   d) some relationships HAVE to be there on POST:
 *       - many-to-one, e.g. create a post comment => needs post id
 *       - one-to-one when created resource is not owner, e.g. create a passport => needs user id
 *
 * NOT resolved yet:
 *  - unmap attributes (kebab-case => lowerCamel) BEFORE this? so that we don't need to do it twice
 *  - Do 4b and 4c here? MAYBE just 4b.
 */

function checkPayloadModelFields(req, res, next) {
  const modelName = req._modelName;
  const { _requiredAttributes } = modelDescriptors[modelName];
  const providedAttrs = Object.keys(req.body.data.attributes);

  for (var index in requiredAttributes) {
    attrName = _.kebabCase(requiredAttributes[index]);
    if(attrNames.indexOf(attrName) === -1) {
      return res.status(400).json({ error: 'Required field "' + attrName + '" not found in payload' });
    }
  }

  return next();
}

module.exports = function(_modelDescriptors) {
  modelDescriptors = _modelDescriptors;
  return checkPayloadModelFields;
}