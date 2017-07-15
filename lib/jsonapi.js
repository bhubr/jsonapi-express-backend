module.exports = function(config, generateJwt, checkJwtMiddleware, model, queryAsync, m) {
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
  const naming = require('./naming');
  const { generateAuthToken, verifyAuthToken } = require('./authToken');

  let middlewares = require('./middlewares')(checkJwtMiddleware, model.relationships, queryAsync);
  const SALT_WORK_FACTOR = 10;
  const chain = require('store-chain');

  function hashPasswordAsync(password) {
    return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
    .then(salt => bcrypt.hashAsync(password, salt));
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
    user: function(req, attributes) {
      return (mustAssignRole(req, config) ?
        assignDefaultRole(req, attributes) : Promise.resolve(attributes)
      )
      .then(assignHashedPassword);
    }
  }

  function getBuiltinHook(camelSingular, req) {
    builtinHook = builtinHooks[camelSingular];
    // console.log('getBuiltinHook', camelSingular, req.method, builtinHook);
    return builtinHook ?
      attributes => builtinHook(req, attributes) :
      attributes => Promise.resolve(attributes);
  }

  router.post('/signin', (req, res) => {
    let { email, password } = req.body;
    // legacy
    if(email === undefined && password === undefined) {
      email = req.body.data.attributes.email;
      password = req.body.data.attributes.password;
    }
    const selectUserQuery = queryBuilder.selectWhere('users', { email });
    queryAsync(selectUserQuery)
    .then(users => {
      if (! users.length) {
        return res.status(401).json({
          error: 'No account with this email'
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
        return res.status(401).json({ error: err.message });
      });
  });

  router.post('/refreshToken', (req, res) => {
    const { userId, email, permissions } = req.jwt;
    generateJwt({ id: userId, email }, permissions)
    .then(jwt => (res.jsonApi({ userId, jwt })))
    .catch(err => {
      // console.log('##error', err);
        return res.status(401).send(err);
    });
  });


  /**
   * Fetching all resources of some type
   */
  router.get('/:kebabPlural', (req, res) => {
    const { tableName, kebabPlural, camelSingular } = queryParams.extract(req);

    const mapRecords = utils.getMapRecords(kebabPlural);
    // const getRelationships = middlewares.getGetRelationshipsMulti(camelSingular, queryAsync);
    return (_.isEmpty(req.query) ? model.store.findAll(camelSingular) :
      model.store.findRecordBy(camelSingular, req.query, true)
    )
    .then(records => model.store.findAllRelateesMulti(camelSingular, records))
    .then(mapRecords)
    // .then(relatees => res.json(relatees))
    .then(res.jsonApi)
    .catch(error => {
      console.error(error);
      res.status(500).json({
        error: error.message,
        stack: error.stack.split('\n')
      });
    });
  });

  router.get('/:kebabPlural/:id',
    (req, res) => {
    const { tableName, camelSingular, kebabPlural, id } = queryParams.extract(req);
    const sql = queryBuilder.selectOne(tableName, id);
    const mapRecord = utils.getMapRecord(kebabPlural);
    const getRelationships = middlewares.getGetRelationshipsSingle(tableName, queryAsync);
    queryAsync(sql)
    .then(utils.extractFirstRecord)
    .then(record => {
      record._rel = {};
      const rels = model.store.getAllRels(camelSingular);
      return model.store.findAllRelatees(camelSingular, record)
      .then(relatees => {
        _.forOwn(relatees, (entries, key) => {
          const type = naming.toKebabPlural(rels[key].model);
          const single = entries.constructor !== Array;
          const data = single ?
            utils.mapRelationship(entries, type) :
            utils.mapRelationships(entries, type);
            // console.log(entries, data);
          record._rel[key] = data;
        });
      })
      .then(() => (record));
    })
    .then(mapRecord)
    // .then(record => {
      // console.log('### rel', record.relationships)
      // return record
    // })
    // .then(utils.passLog('afer map'))
    // .then(getRelationships)
    .then(res.jsonApi)
    .catch(error => {
      console.error(error);
      res.status(500).json({
        error: error.message,
        stack: error.stack.split('\n')
      });
    });
  });

  function getInsertOrUpdate(insertOrUpdateQuery) {
    return (req, res) => {
      // console.log(req.method, req.url)
      const { tableName, kebabPlural, camelSingular, allAttributes, relationshipAttributes, deferredManyToMany, deferredManyToOne, deferredOneToOne } = req.jsonapiData;
      // console.log('#getInsertOrUpdate', tableName, kebabPlural, camelSingular, allAttributes, relationshipAttributes, deferredManyToMany, deferredOneToOne);
      const selectQuery = queryBuilder.getSelectOne(tableName);
      const mapRecord = utils.getMapRecord(kebabPlural);
      const performDeferredManyToMany = utils.getPerformDeferredManyToMany(tableName, queryAsync, deferredManyToMany);
      const performDeferredOneToOne = utils.getPerformDeferredOneToOne(queryAsync, deferredOneToOne);
      const performDeferredManyToOne = utils.getPerformDeferredManyToOne(queryAsync, deferredManyToOne);
      const stripRelAttributes = utils.getStripRelAttributes(relationshipAttributes);
      const getRecordId = utils.getRecordId(req.params.id);
      const setRelationships = utils.getSetRelationships(req.body.data.relationships);
      // const setDefaultRole = utils.getSetDefaultRole(config, queryAsync);
      const builtinHook = getBuiltinHook(camelSingular, req);
      const beforeSave = model.hooks.getBeforeSave(req);
      const afterSave = model.hooks.getAfterSave(req);
      beforeSave(camelSingular, allAttributes)
      .then(builtinHook)
      // .then(customSetter)
      // .then(setDefaultRole)
      .then(insertOrUpdateQuery)
      // .then(utils.passLog('query'))
      .then(queryAsync)
      .then(getRecordId)
      .then(performDeferredManyToMany)
      .then(performDeferredManyToOne)
      .then(performDeferredOneToOne)
      // .then(utils.passLog('#### recordId'))
      .then(selectQuery)
      .then(queryAsync)
      .then(utils.extractFirstRecord)
      // .then(utils.passLog('#### record'))
      .then(attributes => afterSave(camelSingular, attributes))
      .then(stripRelAttributes)
      .then(mapRecord)
      // .then(utils.passLog('#### mapped'))
      .then(setRelationships)
      // .then(utils.passLog('#### with rel'))
      .then(res.jsonApi)
      .catch(error => {
        console.error(error);
        res.status(500).json({
          error: error.message,
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

  function passThrough(label) {
    return (req, res, next) => {
      console.log(label); next();
    }
  }

  // define the home page route
  router.post('/:kebabPlural',
    middlewares.extractTableAndTypePostOrPatch,
    m.check.model,
    m.check.attributes,
    middlewares.convertAttributes,
    // passThrough('#4 extract rels'),
    middlewares.extractReqRelationships,
    // passThrough('#5 middlewares: DONE'),
    (req, res) => {
      try {
        const { tableName } = req.jsonapiData;
        const insertQuery = queryBuilder.getInsert(tableName);
        const insertOrUpdate = getInsertOrUpdate(insertQuery);
        return insertOrUpdate(req, res);
      } catch(e) {
        console.log(e);
        res.status(500).send(e);
      }
  } );

  function deleteHandler(req, res) {
    const { tableName, id } = queryParams.extract(req);
    const query = queryBuilder.deleteWithId(tableName, id);
    return queryAsync(query)
    .then(() => { res.json({ meta: { success: true } }); });
  }

  let deleteCallbacks = [
    middlewares.checkPermissions,
    deleteHandler
  ];

  let updateCallbacks = [
    middlewares.extractTableAndTypePostOrPatch,
    m.check.model,
    // m.check.attributes,
    middlewares.checkPermissions,
    // logReqBody('before convertAttributes'),
    middlewares.convertAttributes,
    // logReqBody('before extractReqRelationships'),
    middlewares.extractReqRelationships,
    // logReqBody('after extractReqRelationships'),
    patchOrPut
  ];

  if(config.permissions.enabled === false) {
    deleteCallbacks.splice(deleteCallbacks.indexOf(middlewares.checkPermissions), 1);
    updateCallbacks.splice(updateCallbacks.indexOf(middlewares.checkPermissions), 1);
  }

  router.delete('/:kebabPlural/:id', deleteCallbacks);

  function patchOrPut(req, res) {
    const { tableName, kebabPlural, camelSingular } = queryParams.extract(req);
    const updateQuery = queryBuilder.getUpdateOne(tableName, req.params.id);
    // console.log('patchOrPut', updateQuery);
    const insertOrUpdate = getInsertOrUpdate(updateQuery);
    return insertOrUpdate(req, res);
  }


  // define the home page route
  router.patch('/:kebabPlural/:id', updateCallbacks);
  router.put('/:kebabPlural/:id', updateCallbacks);


  return { router, middlewares, queryAsync };

};
