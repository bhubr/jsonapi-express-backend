const utils = require('./utils');
const middlewares = require('./jsonapi-middlewares');
const Promise = require('bluebird');
let _ = require("lodash");
_.mixin(require("lodash-inflection"));
const express = require('express');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
const router = express.Router();
const queryParams = require('./queryParams');
const queryBuilder = require('./queryBuilder');
const SALT_WORK_FACTOR = 10;
const Chance = require('chance');
const chance = new Chance();

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

var chain      = require('store-chain');
var mysql      = require('mysql');
var config     = require('./config/config.json');
var env        = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
var dbSettings = config[env];
var connection = mysql.createConnection({
  host     : dbSettings.host,
  user     : dbSettings.username,
  password : dbSettings.password,
  database : dbSettings.database
});

connection.connect();
const queryAsync = Promise.promisify(connection.query.bind(connection));

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
  const sql = queryBuilder.selectAll(table);
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
module.exports = router;


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
