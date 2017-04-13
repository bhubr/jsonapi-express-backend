

module.exports = function(baseDir, config, modelDescriptors) {
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares, queryAsync } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, modelDescriptors);
  const queryBuilder = require('./lib/queryBuilder');

  return { router, middlewares, queryBuilder, queryAsync };
}