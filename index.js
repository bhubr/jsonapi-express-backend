

module.exports = function(baseDir, config, modelRelationships) {
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares, queryAsync } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, modelRelationships);
  const queryBuilder = require('./lib/queryBuilder');

  return { router, middlewares, queryBuilder, queryAsync };
}