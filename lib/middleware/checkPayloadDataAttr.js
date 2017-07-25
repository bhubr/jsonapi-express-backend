const _ = require('lodash');
const errors = require('../utils/errors');

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
function checkPayloadDataAttr(req, res, next) {

  if(! req.body || Object.keys(req.body).length === 0) {
    return next(errors.PayloadFormat('payload body not found or empty'));
  }
  else if (! req.body.data) {
    return next(errors.PayloadFormat('`data` attribute not found on payload'));
  }

  // http://jsonapi.org/format/#document-resource-objects
  const requiredKeysPerMethod = {
    post: ['type'],
    patch: ['id', 'type'],
  };
  const requiredKeys = requiredKeysPerMethod[req.method.toLowerCase()];
  const { data } = req.body;
  const keys = Object.keys(data);
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

  if(req.method === 'POST' && data.id) {
    return next(errors.ForbiddenClientId('Providing a client-generated ID is not supported in this version'));
  }
  if(data.attributes) {
    const { attributes } = data;
    if(! _.isObjectLike(attributes) || _.isArray(attributes)) {
       return next(errors.PayloadFormat('`data.attributes` should be an object'));
    }
  }
  if(data.relationships) {
    const { relationships } = data;
    if(! _.isObjectLike(relationships) || _.isArray(relationships)) {
       return next(errors.PayloadFormat('`data.relationships` should be an object'));
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

module.exports = checkPayloadDataAttr;