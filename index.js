// Branch 0.5.x
// Module is required as such:
// var jsonapi = require('jsonapi-express-backend')(baseDir, config, modelDescriptors)

// Future versions will be just like:
// var jsonapi = require('jsonapi-express-backend');
const extend     = require('extend');
const deepExtend = require('deep-extend');
const fs         = require('fs');
const Promise    = require('bluebird');
const winston    = require('winston');
const lineLogger = require('console-line-logger');
winston.level    = 'info';

Promise.promisifyAll(fs);

const defaultConfig = {
  db: {
    user: '',
    password: '',
    database: '',
    host: '127.0.0.1',
    dialect: 'mysql',
    transforms: {
      tablePrefix: '',
      pluralize: true,
      case: {
        fields: 'lcamel',
        tables: 'lcamel'
      }
    }
  },
  email: {
    adminEmail: 'johndoe@example.com',
    mailgunLogin: 'YOUR.MAILGUN.LOGIN',
    mailgunPass: 'YOUR.MAILGUN.PASS'
  },
  security: {
    auth: {
      enabled: true,
      passwordHash: 'bcrypt'
    },
    permissions: {
      enabled: true,
      defaultUserRole: 'User'
    },
    keys: {
      private: 'keys/private.key',
      public: 'keys/public.key'
    },
    whitelistedUrls: ["GET /api/v1/users*"],
    unrestrictedGet: false
  },
  port: 3333
};

function jsonapi() {
  const appRootDir  = require('app-root-dir').get();
  const configDir   = appRootDir + '/' + ('config' || process.env.JSONAPI_EXB_CONFIGDIR);
  const modelsDir   = appRootDir + '/' + ('models' || process.env.JSONAPI_EXB_MODELSDIR);
  const mode        = process.env.NODE_ENV || 'development';
  const config = defaultConfig
  deepExtend(config, require(configDir + '/' + mode));
  // lineLogger(config)
  const { query }   = require('jsonapi-express-backend-query')(config.db);
  const model       = require('./lib/model/index')(modelsDir, config);
  let {
    store,
    descriptors,
    modelRelationships
  }                 = model;
  const middleware  = require('./lib/middleware/index')(store, config);
  const storeSqlStrategy = require('./lib/model/storeSqlStrategy')(descriptors, modelRelationships, query);
  // storeSqlStrategy.init();
  store = Object.assign(store, storeSqlStrategy);
  // lineLogger(store);
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(appRootDir, config);
  const { router, middlewares, queryAsync } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, model, query, middleware);
  // lineLogger(generateJwt, checkJwt, checkJwtMiddleware, middlewares);
  let jsonapi = {
    config,
    query,
    model,
    store,
    queryBuilder: require('./lib/queryBuilder'),
    utils: require('./lib/utils'),
    eventHub: require('./lib/eventHub'),
    generateJwt,
    checkJwt,
    checkJwtMiddleware,
    router,
    middleware,
    middlewares,
    queryAsync
  };
  // lineLogger('middlewares', middlewares)
  return jsonapi;
}


function legacy(baseDir, config, modelDescriptors) {
  const { query } = require('jsonapi-express-backend-query')(config.db);

  const model = require('./lib/model/index')(modelDescriptors);
  const storeSqlStrategy = require('./lib/model/storeSqlStrategy')(modelDescriptors, model.relationships, query);
  model.store.setStrategy(storeSqlStrategy);

  const middleware = require('./lib/middleware/index')(modelDescriptors, config);
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(baseDir, config);
  const { router, middlewares, queryAsync } = require('./lib/jsonapi')(config, generateJwt, checkJwtMiddleware, model, query, middleware);
  const queryBuilder = require('./lib/queryBuilder');
  const utils = require('./lib/utils');

  return { model, router, middlewares, queryBuilder, utils, checkJwt, queryAsync: query };
}

// module.exports = deepExtend(legacy, jsonapi());
module.exports = jsonapi;