

module.exports = function(baseDir, config, modelDescriptors) {
  const { query } = require('jsonapi-express-backend-query')(config.db);

  const storeSqlStrategy = require('./lib/model/storeSqlStrategy')(modelDescriptors, query);
  const model = require('./lib/model/index')(modelDescriptors);
  model.store.setStrategy(storeSqlStrategy);

  const middleware = require('./lib/middleware/index')(modelDescriptors);
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares, queryAsync } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, model, query, middleware);
  const queryBuilder = require('./lib/queryBuilder');

  return { router, middlewares, queryBuilder, queryAsync: query };
}