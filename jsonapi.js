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

const beforeSaveHooks = {
  users: function(attributes) {
    return new Promise((resolve, reject) => {
      return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
      .then(salt => bcrypt.hashAsync(attributes.password, salt))
      .then(hash => {
        resolve(Object.assign(attributes, { password: hash }));
      })
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



/**
 * Fetching all resources of some type
 */
router.get('/:table', (req, res) => {
  const { table, type } = queryParams.tableOnly(req);
  console.log('table&type', table, type);
  const sql = queryBuilder.selectAll(table);
  const mapRecords = utils.getMapRecords(type);
  queryAsync(sql)
  .then(mapRecords)
  .then(res.jsonApi)
  .catch(err => res.status(500).send(err.message));
});

router.get('/:table/:id', (req, res) => {
  const { table, type, id } = queryParams.tableAndId(req);
  const sql = queryBuilder.selectOne(table, id);
  const mapRecord = utils.getMapRecord(type);
  console.log(sql);
  queryAsync(sql)
  .then(utils.passLog('records'))
  .then(utils.extractFirstRecord)
  .then(mapRecord)
  .then(res.jsonApi)
  .catch(err => res.status(500).send(err.message));
});

function getInsertOrUpdate(query) {
  return (req, res) => {
    const { table, type, allAttributes, relationshipAttributes, deferredRelationships } = req.body.data;
    const selectQuery = queryBuilder.getSelectOne(table);
    const mapRecord = utils.getMapRecord(type);
    const performDeferred = utils.getPerformDeferred(table, deferredRelationships);
    const stripRelAttributes = utils.getStripRelAttributes(relationshipAttributes);
    const getRecordId = utils.getRecordId(req.params.id);
    beforeSave(table, allAttributes)
    .then(query)
    .then(queryAsync)
    .then(getRecordId)
    .then(performDeferred)
    .then(selectQuery)
    .then(queryAsync)
    .then(utils.passLog('#1'))
    .then(utils.extractFirstRecord)
    .then(utils.passLog('#1b'))
    .then(stripRelAttributes)
    .then(utils.passLog('#2'))
    .then(mapRecord)
    .then(utils.passLog('#3'))
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
  middlewares.extractTableAndType,
  middlewares.convertAttributes,
  middlewares.extractReqRelationships,
  (req, res) => {
    const { table } = req.body.data;
    const insertQuery = queryBuilder.getInsert(table);
    const insertOrUpdate = getInsertOrUpdate(insertQuery);
    return insertOrUpdate(req, res);
} );

function patchOrPut(req, res) {
    const { table } = req.body.data;
    const updateQuery = queryBuilder.getUpdateOne(table, req.params.id);
    const insertOrUpdate = getInsertOrUpdate(updateQuery);
    return insertOrUpdate(req, res);
  // const id = req.params.id;
  // // const type = req.params.type;
  // // const objType = _.titleize( _.singularize( type ) );
  // const { table, type } = queryParams.tableOnly(req);
  // const attributes = req.body.data.attributes;
  // const { relationships } = req.body.data;
  // relAttributes = relationships.immediate;
  // const processedAttrs = processAttributes( attributes );
  // const lowerCamelAttributes = Object.assign({},
  //   relAttributes, processedAttrs
  // );
  // return queryAsync(queryBuilder.updateOne(table, id, lowerCamelAttributes))
  // .then(() => performDeferred(table, id, req.relationships.deferred))
  // .then(() => queryBuilder.selectOne(table, id))
  // .then(queryAsync)
  // .then(records => utils.mapRecords(records, type))
  // .then(utils.passLog('records'))
  // .then(mapped => (mapped[0]))
  // .then( res.jsonApi )
  // .catch(err => res.status(500).send(err.message));

  // new models[objType]({ id }).save( processedAttrs )
  // .then( record => { console.log( '## updated'); console.log(record); return record; } )
  // .then( record => mapRecordToPayload( record, type, attributes ) )
  // .then( res.jsonApi );
}
// define the home page route
router.patch('/:table/:id',
  middlewares.extractTableAndType,
  middlewares.convertAttributes,
  middlewares.extractReqRelationships,
  patchOrPut
);
router.put('/:table/:id',
  middlewares.extractTableAndType,
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



// http://stackoverflow.com/questions/31095969/how-do-i-do-atomic-update-using-bookshelf-js-model
function updateResource( req, res ) {

  const objType = tableObjMap[type];
  const attributes = req.body.data.attributes;
  const snakedAttrs = Object.assign( {},
    utils.lowerCamelAttributes(attributes), {
      // createdAt: new Date().toMysqlFormat(),
      // updatedAt: new Date().toMysqlFormat()
  } );
  const item = new global[objType](snakedAttrs);

  item.save().then(result => {
    var payload = { data: { id: result.attributes.id, type, attributes } };
    res.jsonApi(payload);
  });
}

// extract path from req
// extract model name from path
// extract relationships from model descriptor
// convert attribute names from score to lower camel

function processPayload(req, res, next) {

}

