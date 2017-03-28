const _ = require('lodash');
const Promise = require('bluebird');
const queryBuilder = require('./queryBuilder');

function lowerCamelAttributes(attributes) {
  var newAttrs = {};
  for(var a in attributes) {
    var lowerCamelAttrKey = _.lowerFirst( _.camelCase(a));
    newAttrs[lowerCamelAttrKey] = attributes[a];
  }
  return newAttrs;
}

function snakeAttributes(attributes) {
  var newAttrs = {};
  for(var a in attributes) {
    var snakedAttrKey = _.snakeCase(a);
    newAttrs[snakedAttrKey] = attributes[a];
  }
  return newAttrs;
}

function kebabAttributes(attributes) {
  var newAttrs = {};
  for(var a in attributes) {
  var snakedAttrKey = _.kebabCase(a);
  newAttrs[snakedAttrKey] = attributes[a];
  }
  return newAttrs;
}

function extractFirstRecord(records) {
  return records[0];
}

function mapRecord(record, type) {
  const id = record.id;
  delete record.id;
  const attributes = kebabAttributes(record);
  return Object.assign({}, { id, type }, { attributes });
}

function getSetRelationships(relationships) {
  return record => (Object.assign(record, {relationships}));
}

function getMapRecords(type) {
  return records => (_.map(records, record => mapRecord(record, type)));
}

function getMapRecord(type) {
  return record => (mapRecord(record, type));
}

function getRecordId(id) {
  return queryResult => {
    return id === undefined ? queryResult.insertId : id;
  }
}

function mapRelationship(entry, type) {
  return { id: '' + entry.id, type };
}

function mapRelationships(entries, type) {
  return entries.map(entry => mapRelationship(entry, type));
}

function getStripRelAttributes(relationshipAttrs) {
  const keysToStrip = Object.keys(relationshipAttrs);
  return record => (_.reduce(record, (carry, val, key) => {
    if(keysToStrip.indexOf(key) !== -1) {
      delete carry[key];
    }
    return carry;
  }, record));
}

// function performDeferred(insertId, deferred) {
//   console.log('##deferred', deferred);
//   var promises = [];
//   for (var pivotTable in deferred) {
//     const { thisFirst, relTable,ids } = deferred[pivotTable];
//     const thisType = _.singularize(table);
//     const relType  = _.singularize(relTable);
//     const values =  _.reduce(ids, (prev, id) => {
//       let obj = {};
//       obj[thisType + 'Id'] = insertId;
//       obj[relType + 'Id'] = id;
//       return prev.concat(obj);
//     }, []);
//     console.log(values);
//     promises.push(queryBuilder.insert(pivotTable, values));
//     //const thisIds = _.times(ids.length, insertId);
//     // const values = thisFirst ? _.reduce((ids, (prev, id) => { prev.push(insertId) }, []);
//   }
//   return Promise.all(promises)
//   .then(passLog('queries:'))
//   .then(queries => Promise.map(queries, function(query) {
//     return queryAsync(query);
//   }));
// }
function getIds(thisFirst, thisType, relType) {
  if (thisType !== relType) {
    return [thisType + 'Id', relType + 'Id'];
  }
  return thisFirst ?
    [thisType + 'Id1', thisType + 'Id2'] :
    [thisType + 'Id2', thisType + 'Id1'];
}

function getPerformDeferred(table, queryAsync, deferredRelationships) {
  return insertId => {
    var queries = [];
    for (var pivotTable in deferredRelationships) {
      const { thisFirst, relateeTable, ids } = deferredRelationships[pivotTable];
      if(ids.length === 0) {
        continue;
      }
      const thisType = _.singularize(table);
      const relType  = _.singularize(relateeTable);
      const [fieldId1, fieldId2] = getIds(thisFirst, thisType, relType);
      const values =  _.reduce(ids, (prev, id) => {
        let obj = {};
        obj[fieldId1] = insertId;
        obj[fieldId2] = id;
        return prev.concat(obj);
      }, []);
      console.log(values);
      queries.push(queryBuilder.insert(pivotTable, values));
      //const thisIds = _.times(ids.length, insertId);
      // const values = thisFirst ? _.reduce((ids, (prev, id) => { prev.push(insertId) }, []);
    }
    console.log('## queries', queries);
    return Promise.map(queries, function(query) {
      return queryAsync(query);
    })
    .then(passLog('return from Promise.map'))
    .then(() => (insertId));
  };
}

function passLog(label) {
  return function(data) {
    return data;
  }
}
module.exports = {
  lowerCamelAttributes,
  snakeAttributes,
  kebabAttributes,
  mapRelationships,
  mapRelationship,
  getMapRecords,
  getMapRecord,
  getRecordId,
  mapRecord,
  passLog,
  getPerformDeferred,
  extractFirstRecord,
  getStripRelAttributes,
  getSetRelationships
}