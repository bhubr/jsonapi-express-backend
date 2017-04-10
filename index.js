

module.exports = function(baseDir, config, modelRelationships) {
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, modelRelationships);

  return { router, middlewares };
}