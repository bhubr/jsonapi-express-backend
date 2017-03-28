const queryParams = require('./queryParams');
const Promise = require('bluebird');
const _ = require('lodash');
const utils = require('./utils');
const relationshipsMap = require('./jsonapi-relationships-map');
const queryBuilder = require('./queryBuilder');

function processAttributes( attributes, options ) {
  let updatedAt = new Date().toMysqlFormat();
  let outputAttrs = Object.assign( {},
    utils.lowerCamelAttributes( attributes ),
    { updatedAt }
  );
  if( options && options.create ) {
    outputAttrs.createdAt = updatedAt;
  }
  return outputAttrs;
}

function extractTableAndTypePostOrPatch(req, res, next) {
  const { table, type } = queryParams.tableOnly(req);
  req.body.data = Object.assign(req.body.data, { table, type });
  next();
}

function extractTableAndTypeGet(req, res, next) {
  const { table, type } = queryParams.tableOnly(req);
  req.body = Object.assign({}, { table, type });
  next();
}

function convertAttributes(req, res, next) {
  const { table, attributes } = req.body.data;
  const create = req.method === 'POST';
  req.body.data.attributes = processAttributes( attributes, { create } );
  next();
}

function getFunc(method, thisType, revType) {
  if(thisType === 'belongsTo' && revType === 'belongsTo') {
    return method + 'OneToOneRelatee';
  }
  if(
    thisType === 'belongsTo' && revType === 'hasMany' ||
    thisType === 'hasMany' && revType === 'belongsTo'
  ) {
    return method + 'OneToManyRelatee';
  }
  if(thisType === 'hasMany' && revType === 'hasMany') {
    return method + 'ManyToManyRelatee';
  }
  else throw Error('not implemented for ' + method + ':' + thisType + ':' + revType);
}

function setOneToManyRelatee() {

}

function objectAssignVarKey(obj, key, val) {
  var assignee = {};
  assignee[key] = val;
  return Object.assign(obj, assignee);
}

function getPivotTable(objectKey, objectTable, relateeKey, relateeTable) {
  const thisFirst = objectTable === relateeTable ?
    objectKey <= relateeKey : objectTable <= relateeTable;
  const pivotTable = thisFirst ?
    objectTable + '_' + relateeTable + '_' + objectKey :
    relateeTable + '_' + objectTable + '_' + relateeKey;
  return { pivotTable, thisFirst };
}

function getGetGetRelationships(map) {
  return (table, queryAsync) => {
    return record => {
      const relationshipsForType = map[table];
      let deferred = {};
      let queries = [];
      let paramSets = [];
      record.relationships = {};
      _.forOwn(relationshipsForType, (mapEntry, key) => {
        var revEntry = map[mapEntry.table][mapEntry.reverse];
        if(mapEntry.type === 'belongsTo' && revEntry.type === 'belongsTo') {
          const relateeId = record.attributes[key + '-id'];
          delete record.attributes[key + '-id'];
          const query = queryBuilder.selectOne(mapEntry.table, relateeId);
          queries.push(query);
          paramSets.push({ key, single: true, type: mapEntry.table });
        }
        if(mapEntry.type === 'hasMany' && revEntry.type === 'belongsTo') {
          const query = queryBuilder.selectRelatees(mapEntry.table, mapEntry.reverse + 'Id', record.id);
          queries.push(query);
          paramSets.push({ key, single: false, type: mapEntry.table });
        }
      });
      return Promise.map(queries, query => {
        return queryAsync(query);
      })
      .then(results => {
        results.forEach((result, index) => {
          const { key, single, type } = paramSets[index];
          const mapped = utils.mapRelationships(result, type);
          const data = single ? mapped[0] : mapped;
          record.relationships[key] = { data };
        });
        return record;
      })
    };
  };
}

function getExtractReqRelationships(map) {

  return (req, res, next) => {

    // extract table and relationships from request params
    const { table } = req.body.data;
    const { relationships } = req.body.data;
    if(map[table] === undefined) {
      return next(new Error('undefined relationships for ' + table));
    }
    const relationshipsForType = map[table];
    req.body.data.deferredRelationships = {};
    req.body.data.relationshipAttributes = {};
    // reduce payload relationships
    let index = 0;
    console.log(req.body.data.relationships);
    _.forOwn(relationships, (payloadRelationship, payloadKey) => {
      const camelKey = _.lowerFirst(_.camelCase(payloadKey));
      // no relationship found in table for this payload key => should trigger an error
      if(relationshipsForType[camelKey] === undefined) {
        return next(new Error(
          'found a relationship key (' + payloadKey + ") that isn't defined in map for type: " + table
        ));
      }
      const relationshipData = payloadRelationship.data;
      if(relationshipData === null) {
        return;
      }
      var mapEntry = relationshipsForType[camelKey];
      var revEntry = map[mapEntry.table][mapEntry.reverse];
      if( mapEntry.type === 'belongsTo' ) {
        req.body.data.relationshipAttributes[camelKey + 'Id'] = parseInt(relationshipData.id, 10);
      }
      else if(mapEntry.type === 'hasMany' && revEntry.type === 'hasMany') {
        const relateeTable = mapEntry.table;
        const { pivotTable, thisFirst } = getPivotTable(camelKey, table, mapEntry.reverse, relateeTable);
        const ids = _.map(relationshipData, entry => parseInt(entry.id, 10));
        req.body.data.deferredRelationships[pivotTable] = { thisFirst, relateeTable, ids };
      }
    });
    req.body.data.allAttributes = Object.assign({}, req.body.data.attributes, req.body.data.relationshipAttributes);
    next();
  }
}

module.exports = {
  extractTableAndTypePostOrPatch,
  extractTableAndTypeGet,
  convertAttributes,
  getExtractReqRelationships,
  extractReqRelationships: getExtractReqRelationships(relationshipsMap),
  getGetRelationships: getGetGetRelationships(relationshipsMap)
};