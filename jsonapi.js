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
// queryAsync('select * from users').then( (results, fields) => {
//   console.log('The solution is: ', results[0].email);
// });

const relationshipsMap = {
  users: {
    posts: {
      table: 'posts',
      type: 'hasMany',
      reverse: 'author'
    }
  },
  posts: {
    author: {
      table: 'users',
      type: 'belongsTo',
      reverse: 'posts'
    },
    tags: {
      table: 'tags',
      type: 'hasMany',
      reverse: 'posts'
    }
  },
  tags: {
    posts: {
      table: 'posts',
      type: 'hasMany',
      reverse: 'tags'
    }
  }
}

function getFunc(method, thisType, revType) {
  if(thisType === 'belongsTo' && revType === 'hasMany') {
    return method + 'OneToManyRelatee';
  }
  if(thisType === 'hasMany' && revType === 'hasMany') {
    return method + 'ManyToManyRelatee';
  }
  else throw Error('not implemented for ' + method + ':' + thisType + ':' + revType);
}

function setOneToManyRelatee() {

}

function processPayloadRelationships(table, relationships) {
  var output = { deferred: {}, immediate: {} };
  for(var k in relationships) {
    var rel = relationships[k].data;
    console.log(table, k, rel);
    if(relationshipsMap[table] !== undefined && relationshipsMap[table][k] !== undefined) {
      var mapEntry = relationshipsMap[table][k];
      console.log('found relationship: [' + table + '] => ' + mapEntry.table + ',' + mapEntry.type);
      var revEntry = relationshipsMap[mapEntry.table][mapEntry.reverse];
      console.log('reverse relationship: [' + mapEntry.table + '] => ' + revEntry.table + ',' + revEntry.type);
      func = getFunc('set', mapEntry.type, revEntry.type);
      console.log(func);
      if( mapEntry.type === 'belongsTo' && revEntry.type === 'hasMany' ) {
        // var obj = {};
        // obj[k + 'Id'] = parseInt(rel.id, 10);
        // output.push({ deferred: false, obj })
        output.immediate[k + 'Id'] = parseInt(rel.id, 10);
      }
      else if(mapEntry.type === 'hasMany' && revEntry.type === 'hasMany') {
        // console.log('deferred', rel, );
        const thisFirst = table < mapEntry.table;
        const pivotTable = thisFirst ?
          table + '_' + mapEntry.table + '_' + k :
          mapEntry.table + '_' + table + '_' + mapEntry.reverse;
        const ids = _.map(rel, entry => parseInt(entry.id));
        console.log('## many many', thisFirst, pivotTable, ids);
        const relTable = mapEntry.table;
        output.deferred[pivotTable] = { thisFirst, relTable, ids };
      }
    }
  }
  console.log(output);
  return output;
}

function performDeferred(table, insertId, deferred) {
  console.log('##deferred', deferred);
  var promises = [];
  for (var pivotTable in deferred) {
    const { thisFirst, relTable,ids } = deferred[pivotTable];
    const thisType = _.singularize(table);
    const relType  = _.singularize(relTable);
    const values =  _.reduce(ids, (prev, id) => {
      let obj = {};
      obj[thisType + 'Id'] = insertId;
      obj[relType + 'Id'] = id;
      return prev.concat(obj);
    }, []);
    console.log(values);
    promises.push(queryBuilder.insert(pivotTable, values));
    //const thisIds = _.times(ids.length, insertId);
    // const values = thisFirst ? _.reduce((ids, (prev, id) => { prev.push(insertId) }, []);
  }
  return Promise.all(promises)
  .then(utils.passLog('queries:'))
  .then(queries => Promise.map(queries, function(query) {
    return queryAsync(query);
  }));
}
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
  console.log(req.body.data);
  const attributes = req.body.data.attributes;
  const relationships = processPayloadRelationships(table, req.body.data.relationships);
  // const immediate = _.find(relationships, { deferred: false });
  // const relAttributes = _.reduce(immediate, (attrs, item) => {

  // }, {});
  //   immediate.reduce(())
  relAttributes = relationships.immediate;
  console.log(relAttributes, relationships.deferred);

  const lowerCamelAttributes = Object.assign({},
    relAttributes, processAttributes( attributes, true )
  );
  chain(beforeCreate(table, lowerCamelAttributes))
  .then(finalAttributes => queryBuilder.insert(table, finalAttributes))
  .then(queryAsync)
  .then(({ insertId }) => (insertId))
  .set('insertId')
  .then(insertId => performDeferred(table, insertId, relationships.deferred))
  .then(utils.passLog('deferred results'))
  .get( ({insertId}) => queryBuilder.selectOne(table, insertId))
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

function processAttributes( attributes, doCreate ) {
  let updatedAt = new Date().toMysqlFormat();
  let outputAttrs = Object.assign( {},
    utils.lowerCamelAttributes( attributes ),
    { updatedAt }
  );
  if( doCreate ) {
    outputAttrs.createdAt = updatedAt;
  }
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