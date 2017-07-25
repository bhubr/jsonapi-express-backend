const _ = require('lodash');
const errors = require('../utils/errors');
const { REQ_DATA_KEY } = require('../constants');

/**
 * First-level check of payload validity (for POST and PATCH)
 * 1. body&body.data, 2. required keys in body.data,
 * 3. no client-generated ID for post, 4. attributes&relationships are objects,
 * 5. URL and payload type
 *
 * For #3 (from JSONAPI spec):
 *   "A server MUST return 403 Forbidden in response to an unsupported
 *    request to create a resource with a client-generated ID."
 */

function requiredKeyError(key, method) {
  return errors.PayloadFormat(
    '`data.{{key}}` attribute is required for HTTP method `{{method}}`',
    { key, method }
  );
}

function typeMismatchError(payloadType, urlType) {
  return errors.PayloadFormat(
    'Type in payload: `{{payloadType}}` does not match type in URL: `{{urlType}}`',
    { payloadType, urlType }
  );
}

function requiredDataKeyMissing(data, method) {
  // http://jsonapi.org/format/#document-resource-objects
  const requiredKeysPerMethod = {
    post: ['type'],
    patch: ['id', 'type'],
  };
  const requiredKeys = requiredKeysPerMethod[method.toLowerCase()];
  const keys = Object.keys(data);
  for(k = 0 ; k < requiredKeys.length ; k++) {
    const key = requiredKeys[k];
    if(keys.indexOf(key) === -1) {
      return key;
    }
  }
  return false;
}

function checkPayloadDataAttr(req, res, next) {

  if(! req.body || Object.keys(req.body).length === 0) {
    return next(errors.PayloadFormat('payload body not found or empty'));
  }
  else if (! req.body.data) {
    return next(errors.PayloadFormat('`data` attribute not found on payload'));
  }

  const { body: { data }, params: { kebabPlural }, method } = req;

  let missingKey;
  if(missingKey = requiredDataKeyMissing(data, method)) {
    return next(requiredKeyError(missingKey, req.method));
  }

  if(req.method === 'POST' && data.id) {
    return next(
      errors.ForbiddenClientId('Providing a client-generated ID is not supported in this version')
    );
  }
  if(data.attributes && ! _.isPlainObject(data.attributes)) {
   return next(errors.PayloadFormat('`data.attributes` should be an object'));
  }
  if(data.relationships && ! _.isPlainObject(data.relationships)) {
   return next(errors.PayloadFormat('`data.relationships` should be an object'));
  }

  if(data.type !== kebabPlural) {
    return next(typeMismatchError(data.type, kebabPlural));
  }

  // Initialize an object on req for use by other middlewares
  req[REQ_DATA_KEY] = {};
  return next();
}

module.exports = checkPayloadDataAttr;