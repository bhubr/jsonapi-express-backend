

module.exports = function(baseDir, config, modelDescriptors) {
  const { query } = require('jsonapi-express-backend-query')(config.db);
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares, queryAsync } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, modelDescriptors, query);
  const queryBuilder = require('./lib/queryBuilder');

  return { router, middlewares, queryBuilder, queryAsync: query };
}