const utils = require('./utils');
// const models = require('./models');
const Promise = require('bluebird');
let _ = require("lodash");
_.mixin(require("lodash-inflection"));
const express = require('express');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
const router = express.Router();
const queryParams = require('./queryParams');
const queryBuilder = require('./queryBuilder');
const SALT_WORK_FACTOR = 10;

function createWithBefore(Model, attributes) {
  // return new Promise((resolve, reject) => {
    if(Model.beforeCreate === undefined) {
      return Model.create(attributes);
    }
    else {
      return Model.beforeCreate(attributes)
      .then(attributes => { console.log(attributes); return attributes; })
      .then(Model.create.bind(Model))
      .then(record => {
        return record.afterCreate ? record.afterCreate() : record;
      });
    }
  // });
}

const beforeCreateHooks = {
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

function beforeCreate(table, attributes) {
  if(beforeCreateHooks[table] === undefined) return Promise.resolve(attributes);
  return beforeCreateHooks[table](attributes);
}

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
// queryAsync('select * from users').then( (results, fields) => {
//   console.log('The solution is: ', results[0].email);
// });

/**
 * Fetching all resources of some type
 */
router.get('/:table', (req, res) => {
  const { table } = queryParams.tableOnly(req);
  const sql = queryBuilder.selectAll(table);
  queryAsync(sql)
  .then(records => utils.mapRecords(records, table))
  .then(res.jsonApi)
  .catch(err => res.status(500).send(err.message));
});

router.get('/:table/:id', (req, res) => {
  const { table, id } = queryParams.tableAndId(req);
  const sql = queryBuilder.selectOne(table, id);
  console.log(sql);
  queryAsync(sql)
  .then(utils.passLog('records'))
  .then(records => utils.mapRecords(records, table))
  .then(mapped => (mapped[0]))
  .then(res.jsonApi)
  .catch(err => res.status(500).send(err.message));
});

// define the home page route
router.post('/:table', (req, res) => {
  const { table } = queryParams.tableOnly(req);
  const attributes = req.body.data.attributes;
  const lowerCamelAttributes = processAttributes( attributes, true );
  beforeCreate(table, lowerCamelAttributes)
  .then(finalAttributes => queryBuilder.insert(table, finalAttributes))
  .then(queryAsync)
  .then(({ insertId }) => queryBuilder.selectOne(table, insertId))
  .then(queryAsync)
  .then(records => utils.mapRecords(records, table))
  .then(mapped => (mapped[0]))
  .then( res.jsonApi )
  .catch(err => res.status(500).send(err.message));
} );

// define the home page route
router.put('/:type/:id', (req, res) => {
  const id = req.params.id;
  const type = req.params.type;
  const objType = _.titleize( _.singularize( type ) );
  const attributes = req.body.data.attributes;
  const processedAttrs = processAttributes( attributes );
  new models[objType]({ id }).save( processedAttrs )
  .then( record => { console.log( '## updated'); console.log(record); return record; } )
  .then( record => mapRecordToPayload( record, type, attributes ) )
  .then( res.jsonApi );
} );
module.exports = router;


function mapRecordToPayload( record, type, attributes ) {
  return { id: record.id, type, attributes };
}

function processAttributes( attributes, doCreate ) {
  // let updatedAt = new Date().toMysqlFormat();
  let outputAttrs = Object.assign( {},
    utils.lowerCamelAttributes( attributes )
    // { updatedAt }
  );
  // if( doCreate ) {
  //   outputAttrs.createdAt = updatedAt;
  // }
  return outputAttrs;
}



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