

module.exports = function(baseDir, config) {
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware);

  return { router, middlewares };
}