module.exports = function(config, generateJwt, checkJwtMiddleware, modelDescriptors, queryAsync) {
  const url = require('url');
  const Promise = require('bluebird');
  let _ = require("lodash");
  _.mixin(require("lodash-inflection"));
  const express = require('express');
  const bcrypt = Promise.promisifyAll(require('bcrypt'));
  const router = express.Router();
  const utils = require('./utils');
  const queryParams = require('./queryParams');
  const queryBuilder = require('./queryBuilder');
  const { generateAuthToken, verifyAuthToken } = require('./authToken');
  let modelRelationships = {};
   _.forOwn(modelDescriptors, function(value, key) {
    modelRelationships[key] = value.relationships;
  });
  let modelHooks = {};
   _.forOwn(modelDescriptors, function(value, key) {
    modelHooks[key] = value.hooks;
  });

  let middlewares = require('./middlewares')(checkJwtMiddleware, modelRelationships, modelDescriptors, queryAsync);
  const SALT_WORK_FACTOR = 10;
  const chain = require('store-chain');

  function hashPasswordAsync(password) {
    return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
    .then(salt => bcrypt.hashAsync(password, salt));
  }

  let beforeSaveHooks = {
    create: {}, update: {}
  };
  let afterSaveHooks = {
    create: {}, update: {}
  };

  _.forOwn(modelHooks, (hooks, table) => {
    if(hooks !== undefined) {
      if(hooks.beforeCreate !== undefined) {
        beforeSaveHooks.create[table] = hooks.beforeCreate;
      }
      if(hooks.afterCreate !== undefined) {
        afterSaveHooks.create[table] = hooks.afterCreate;
      }
      if(hooks.beforeUpdate !== undefined) {
        beforeSaveHooks.update[table] = hooks.beforeUpdate;
      }
      if(hooks.afterUpdate !== undefined) {
        afterSaveHooks.update[table] = hooks.afterUpdate;
      }
    }
  });

  function getHookKey(method) {
    if(method.toLowerCase() === 'post') {
      return 'create';
    }
    else if(['put', 'patch'].indexOf(method.toLowerCase()) !== -1) {
      return 'update';
    }
    else {
      throw new Error("Method '" + method + "' is neither a create nor an update method");
    }
  }

  function getBeforeSave(method) {
    const key = getHookKey(method);
    return (table, attributes) => {
      if(beforeSaveHooks[key][table] === undefined) return Promise.resolve(attributes);
      return beforeSaveHooks[key][table](attributes);
    }
  }

  function getAfterSave(method) {
    const key = getHookKey(method);
    return (table, attributes) => {
      if(afterSaveHooks[key][table] === undefined) return Promise.resolve(attributes);
      return afterSaveHooks[key][table](attributes);
    }
  }

  function getPermissions(user) {
    const { roleId } = user;
    const pivotQuery = queryBuilder.selectWhere('role_permission', { roleId });
    return queryAsync(pivotQuery)
    .then(records => _.map(records, 'permissionId'))
    .then(permissionIds => (! permissionIds.length ? Promise.resolve([]) :
      queryAsync(queryBuilder.selectIn('permissions', permissionIds))))
    .then(records => _.map(records, 'name'));
  }

  function assignHashedPassword(attributes) {
    return attributes.password ?
      hashPasswordAsync(attributes.password)
      .then(password => Object.assign(attributes, { password })) :
      Promise.resolve(attributes);
  }

  function assignDefaultRole(req, attributes) {
    const { defaultUserRole } = config.permissions;
    if(! defaultUserRole) {
      return Promise.reject(new Error('Set defaultUserRole in your config.permissions if you set enabled to true'));
    }
    const roleQuery = queryBuilder.selectWhere('roles', { name: defaultUserRole });
    return queryAsync(roleQuery)
    .then(roles => {
      if(! roles.length) {
        return Promise.reject(new Error('Role with name "' + defaultUserRole + '" was not found is role list'));
      }
      const roleId = roles[0].id;
      return Promise.resolve(Object.assign(attributes, { roleId }));
    });
  }

  function mustAssignRole(req, config) {
    return req.method === 'POST' && config.permissions && config.permissions.enabled;
  }

  const builtinHooks = {
    users: function(req, attributes) {
      return (mustAssignRole(req, config) ?
        assignDefaultRole(req, attributes) : Promise.resolve(attributes)
      )
      .then(assignHashedPassword);
    }
  }

  function getBuiltinHook(type, req) {
    builtinHook = builtinHooks[type];
    // console.log('getBuiltinHook', type, req.method, builtinHook);
    return builtinHook ?
      attributes => builtinHook(req, attributes) :
      attributes => Promise.resolve(attributes);
  }


  router.post('/signin', (req, res) => {
    const { email, password } = req.body.data.attributes;
    const selectUserQuery = queryBuilder.selectWhere('users', { email });
    queryAsync(selectUserQuery)
    .then(users => {
      if (! users.length) {
        return res.status(401).json({
          message: 'No account with this email'
        });
      }
      const user = users[0];
      return bcrypt.compareAsync(password, user.password)
      .then(passwordMatches => {
        if(! passwordMatches) {
          throw new Error('Wrong password');
        }
      })
      .then(() => getPermissions(user))
      .then(permissions => generateJwt(user, permissions))
      .then(jwt => (res.jsonApi({ userId: user.id, jwt })));
    })
    .catch(err => {
      console.log('##error', err);
        // return done(null, false, { message: 'Incorrect password => ' + err });
        return res.status(401).json({ message: err.message });
      });
  });

  router.post('/refreshToken', (req, res) => {
    const { userId, email } = req.jwt;
    generateJwt({ id: userId, email })
    .then(jwt => (res.jsonApi({ userId, jwt })))
    .catch(err => {
      // console.log('##error', err);
        return res.status(401).send(err);
    });
  });


  /**
   * Fetching all resources of some type
   */
  router.get('/:table', (req, res) => {
    const { table, type } = queryParams.tableOnly(req);
    const sql = queryBuilder.selectWhere(table, req.query);
    const mapRecords = utils.getMapRecords(type);
    const getRelationships = middlewares.getGetRelationshipsMulti(table, queryAsync);
    queryAsync(sql)
    .then(mapRecords)
    .then(getRelationships)
    .then(res.jsonApi)
    .catch(error => {
      console.error(error);
      res.status(500).json({
        message: error.message,
        stack: error.stack.split('\n')
      });
    });
  });

  router.get('/:table/:id',
    (req, res) => {
    const { table, type, id } = queryParams.tableAndId(req);
    const sql = queryBuilder.selectOne(table, id);
    const mapRecord = utils.getMapRecord(type);
    const getRelationships = middlewares.getGetRelationshipsSingle(table, queryAsync);
    queryAsync(sql)
    .then(utils.extractFirstRecord)
    .then(mapRecord)
    .then(getRelationships)
    .then(res.jsonApi)
    .catch(error => {
      console.error(error);
      res.status(500).json({
        message: error.message,
        stack: error.stack.split('\n')
      });
    });
  });

  function getInsertOrUpdate(insertOrUpdateQuery) {
    return (req, res) => {
      const { table, type, allAttributes, relationshipAttributes, deferredRelationships } = req.body.data;
      const selectQuery = queryBuilder.getSelectOne(table);
      const mapRecord = utils.getMapRecord(type);
      const performDeferred = utils.getPerformDeferred(table, queryAsync, deferredRelationships);
      const stripRelAttributes = utils.getStripRelAttributes(relationshipAttributes);
      const getRecordId = utils.getRecordId(req.params.id);
      const setRelationships = utils.getSetRelationships(req.body.data.relationships);
      // const setDefaultRole = utils.getSetDefaultRole(config, queryAsync);
      const builtinHook = getBuiltinHook(type, req);
      const beforeSave = getBeforeSave(req.method);
      const afterSave = getAfterSave(req.method);
      beforeSave(table, allAttributes)
      .then(builtinHook)
      // .then(customSetter)
      // .then(setDefaultRole)
      .then(insertOrUpdateQuery)
      .then(queryAsync)
      .then(getRecordId)
      .then(performDeferred)
      .then(selectQuery)
      .then(queryAsync)
      .then(utils.extractFirstRecord)
      .then(attributes => afterSave(table, attributes))
      .then(stripRelAttributes)
      .then(mapRecord)
      .then(setRelationships)
      .then(res.jsonApi)
      .catch(error => {
        console.error(error);
        res.status(500).json({
          message: error.message,
          stack: error.stack.split('\n')
        });
      });
    }
  }

  function logReqBody(label) {
    return (req, res, next) => {
      if(req._dbg === undefined) {
        req._dbg = 0;
      }
      console.log('\n\nlogReqBody #' + req._dbg + ' ' + label, req.body);
      req._dbg++;
      return next();
    }
  }

  // define the home page route
  router.post('/:table',
    middlewares.extractTableAndTypePostOrPatch,
    middlewares.checkModel,
    middlewares.checkAttributes,
    middlewares.convertAttributes,
    middlewares.extractReqRelationships,
    (req, res) => {
      try {
        const { table } = req.body.data;
        const insertQuery = queryBuilder.getInsert(table);
        const insertOrUpdate = getInsertOrUpdate(insertQuery);
        return insertOrUpdate(req, res);
      } catch(e) {
        res.status(500).send(e);
      }
  } );

  router.delete('/:table/:id',
    middlewares.checkPermissions,
    (req, res) => {
    const { table, id } = queryParams.tableAndId(req);
    const query = queryBuilder.deleteWithId(table, id);
    return queryAsync(query)
    .then(() => { res.json({ meta: { success: true } }); });
  });

  function patchOrPut(req, res) {
    const { table } = req.body.data;
    const updateQuery = queryBuilder.getUpdateOne(table, req.params.id);
    const insertOrUpdate = getInsertOrUpdate(updateQuery);
    return insertOrUpdate(req, res);
  }

  // define the home page route
  router.patch('/:table/:id',
    middlewares.extractTableAndTypePostOrPatch,
    middlewares.checkModel,
    // middlewares.checkAttributes,
    middlewares.checkPermissions,
    middlewares.convertAttributes,
    middlewares.extractReqRelationships,
    patchOrPut
  );
  router.put('/:table/:id',
    // logReqBody('before extractTableAndTypePostOrPatch'),
    middlewares.extractTableAndTypePostOrPatch,
    // logReqBody('before checkModel'),
    middlewares.checkModel,
    // middlewares.checkAttributes,
    // logReqBody('before checkPermissions'),
    middlewares.checkPermissions,
    // logReqBody('before convertAttributes'),
    middlewares.convertAttributes,
    // logReqBody('before extractReqRelationships'),
    middlewares.extractReqRelationships,
    patchOrPut
  );

  function mapRecordToPayload( record, type, attributes ) {
    return { id: record.id, type, attributes };
  }

  /**
   * You first need to create a formatting function to pad numbers to two digits…
   **/
  function twoDigits(d) {
      if(0 <= d && d < 10) return "0" + d.toString();
      if(-10 < d && d < 0) return "-0" + (-1*d).toString();
      return d.toString();
  }

  /**
   * …and then create the method to output the date string as desired.
   * Some people hate using prototypes this way, but if you are going
   * to apply this to more than one Date object, having it as a prototype
   * makes sense.
   **/
  Date.prototype.toMysqlFormat = function() {
      return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
  };

  return { router, middlewares, queryAsync };

};
