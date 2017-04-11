module.exports = function(config, generateJwt, checkJwtMiddleware, modelRelationships) {
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
  let middlewares = require('./middlewares')(checkJwtMiddleware, modelRelationships);
  const SALT_WORK_FACTOR = 10;
  const chain = require('store-chain');
  // const Chance = require('chance');
  // const chance = new Chance();
  // const repoApiTools = require('../express-myprojects/tools/codeRepoAPIs');
  // const creds = require('../express-myprojects/tools/cred.json');

  // function createWithBefore(Model, attributes) {
  //   // return new Promise((resolve, reject) => {
  //     if(Model.beforeSave === undefined) {
  //       return Model.create(attributes);
  //     }
  //     else {
  //       return Model.beforeSave(attributes)
  //       .then(attributes => { console.log(attributes); return attributes; })
  //       .then(Model.create.bind(Model))
  //       .then(record => {
  //         return record.afterCreate ? record.afterCreate() : record;
  //       });
  //     }
  //   // });
  // }
  function hashPasswordAsync(password) {
    return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
    .then(salt => bcrypt.hashAsync(password, salt));
  }

  const beforeSaveHooks = {
    users: function(attributes) {
      return new Promise((resolve, reject) => {
        return hashPasswordAsync(attributes.password)
        .then(password => Object.assign(attributes, { password }))
        .then(resolve)
        .catch(reject);
      });
    }
  }

  function beforeSave(table, attributes) {
    if(beforeSaveHooks[table] === undefined) return Promise.resolve(attributes);
    return beforeSaveHooks[table](attributes);
  }

  var mysql      = require('mysql');
  // var config     = require(configFile); // './config/config.json');
  var env        = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
  var dbSettings = config.db;
  var connection = mysql.createConnection({
    host     : dbSettings.host,
    user     : dbSettings.username,
    password : dbSettings.password,
    database : dbSettings.database
  });

  connection.connect();
  const queryAsync = Promise.promisify(connection.query.bind(connection));


  router.post('/signin', (req, res) => {
    const { email, password } = req.body.data.attributes;
    const selectUserQuery = queryBuilder.selectWhere('users', { email });
    queryAsync(selectUserQuery)
    .then(users => {
      if (! users.length) {
        return res.status(401).send('no account with this email');
      }
      const user = users[0];
      bcrypt.compareAsync(user.password, password)
      // .then(() => user.getPermissions())
      .then(() => generateJwt(user))
      .then(jwt => (res.jsonApi({ userId: user.id, jwt })));
    })
    .catch(err => {
      console.log('##error', err);
        // return done(null, false, { message: 'Incorrect password => ' + err });
        return res.status(401).send(err);
      });
  });

  router.post('/refreshToken', (req, res) => {
    const { userId, email } = req.jwtData;
    generateJwt({ id: userId, email })
    .then(jwt => (res.jsonApi({ userId: user.id, jwt })))
    .catch(err => {
      console.log('##error', err);
        // return done(null, false, { message: 'Incorrect password => ' + err });
        return res.status(401).send(err);
    });
  });

  // Randomize users... run only once
  // queryAsync(queryBuilder.selectAll('users'))
  // .then(users => {
  //   const promises = users.map(user => {
  //     if(user.email === 'benoithubert@gmail.com') {
  //       return hashPasswordAsync('toto')
  //       .then(password => queryBuilder.updateOne('users', user.id, { password }))
  //       .then(queryAsync);
  //     }
  //     else {
  //       return queryAsync(
  //         queryBuilder.updateOne('users', user.id, {
  //           firstName: chance.first(),
  //           lastName: chance.last(),
  //           email: chance.email()
  //         })
  //       );
  //     }
  //   });
  //   return Promise.all(promises)
  //   .then(results => {
  //     console.log(results);
  //   });
  // });


  /**
   * Fetching all resources of some type
   */
  router.get('/:table', (req, res) => {
    const { table, type } = queryParams.tableOnly(req);
    // console.log('get all', req.query);
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

  function getInsertOrUpdate(query) {
    return (req, res) => {
      const { table, type, allAttributes, relationshipAttributes, deferredRelationships } = req.body.data;
      const selectQuery = queryBuilder.getSelectOne(table);
      const mapRecord = utils.getMapRecord(type);
      const performDeferred = utils.getPerformDeferred(table, queryAsync, deferredRelationships);
      const stripRelAttributes = utils.getStripRelAttributes(relationshipAttributes);
      const getRecordId = utils.getRecordId(req.params.id);
      const setRelationships = utils.getSetRelationships(req.body.data.relationships);
      beforeSave(table, allAttributes)
      .then(query)
      .then(queryAsync)
      .then(getRecordId)
      .then(performDeferred)
      .then(selectQuery)
      .then(queryAsync)
      .then(utils.extractFirstRecord)
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

  // define the home page route
  router.post('/:table',
    middlewares.extractTableAndTypePostOrPatch,
    middlewares.convertAttributes,
    middlewares.extractReqRelationships,
    (req, res) => {
      const { table } = req.body.data;
      const insertQuery = queryBuilder.getInsert(table);
      const insertOrUpdate = getInsertOrUpdate(insertQuery);
      return insertOrUpdate(req, res);
  } );

  router.delete('/:table/:id', (req, res) => {
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
    middlewares.convertAttributes,
    middlewares.extractReqRelationships,
    patchOrPut
  );
  router.put('/:table/:id',
    middlewares.extractTableAndTypePostOrPatch,
    middlewares.convertAttributes,
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
