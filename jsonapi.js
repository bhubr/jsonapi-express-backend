const utils = require('./utils');
const models = require('./models');
let _ = require("lodash");
_.mixin(require("lodash-inflection"));
const express = require('express');
const router = express.Router();

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

/**
 * Fetching all resources of some type
 */
router.get('/:table', (req, res) => {
  const table = req.params.table;
  const objType = _.titleize( _.singularize( table ) );
  models[objType].findAll()
  .then(records => utils.mapRecords(records, table))
  .then(res.jsonApi);
});

router.get('/:table/:id', (req, res) => {
  const table = req.params.table;
  const id = parseInt(req.params.id, 10);
  const objType = _.titleize( _.singularize( table ) );
  models[objType].findAll({ where: { id } })
  .then(records => utils.mapRecords(records, table))
  .then(mapped => (mapped[0]))
  .then(res.jsonApi);
});

// define the home page route
router.post('/:type', (req, res) => {
  const type = req.params.type;
  const objType = _.titleize( _.singularize( type ) );
  const attributes = req.body.data.attributes;
  const processedAttrs = processAttributes( attributes, true );
  const Model = models[objType];
  // Model.create(processedAttrs);
  createWithBefore(Model, processedAttrs)
  // .then(attributes => { console.log(attributes); return attributes; })
  .then( record => mapRecordToPayload( record, type, attributes ) )
  .then( res.jsonApi );
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
  return { id: record.dataValues.id, type, attributes };
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