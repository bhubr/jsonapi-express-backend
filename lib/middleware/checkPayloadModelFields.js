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
 *  - convert attributes (kebab-case => lowerCamel) BEFORE this? YES, DEFINITELY!
 *  - Do 4b and 4c here? MAYBE just 4b.
 */
function hasMissingAttr(attributes) {
  const attributeNames = Object.keys(attributes);
  const { _requiredAttributes } = modelDescriptors[modelName];
  // required attrs for POST
  for (var i = 0 ; i < _requiredAttributes.length ; i++) {
    requiredAttr = _requiredAttributes[i];
    if(attributeNames.indexOf(requiredAttr) === -1) {
      return requiredAttr; // res.status(400).json({ error: 'Required field `' + requiredAttr + '` not found in payload' });
    }
  }
}

function checkPayloadModelFields(req, res, next) {
  const { attributes, relationships, modelName } = req[REQ_DATA_KEY];
  let missingAttr;

  if(req.method === 'POST' && (missingAttr = hasMissingAttr(attributes))) {
    return errors.MissingField('Required field `{{missingAttr}}` not found in payload',
      { missingAttr }
    );
  }

  return next();
}

module.exports = function(_modelDescriptors) {
  modelDescriptors = _modelDescriptors;
  return checkPayloadModelFields;
}