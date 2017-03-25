const _ = require('lodash');
const Promise = require('bluebird');

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

function mapRecords(records, type) {
  return _.map(records, model => {
    const id = model.id;
    delete model.id;
    const attributes = kebabAttributes(model);
    return Object.assign({}, { id, type }, { attributes });
  });
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

function getMapRecords(type) {
  return records => (_.map(records, record => mapRecord(record, type)));
}

function getMapRecord(type) {
  return record => (mapRecord(record, type));
}

function getRecordId(id) {
  return queryResult => {
    console.log('## getRecordId', queryResult, id);
    return id === undefined ? queryResult.insertId : id;
  }
}

function getStripRelAttributes(relationshipAttrs) {
  const keysToStrip = Object.keys(relationshipAttrs);
  return record => (_.reduce(record, (carry, val, key) => {
    if(keysToStrip.indexOf(key) !== -1) {
      delete carry[key];
    }
    console.log(carry);
    return carry;
  }, record));
}

function performDeferred(insertId, deferred) {
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
  .then(passLog('queries:'))
  .then(queries => Promise.map(queries, function(query) {
    return queryAsync(query);
  }));
}

function getPerformDeferred(table, deferredRelationships) {
  return insertId => {
    var promises = [];
    for (var pivotTable in deferredRelationships) {
      const { thisFirst, ids } = deferredRelationships[pivotTable];
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
    .then(passLog('queries:'))
    .then(queries => Promise.map(queries, function(query) {
      return queryAsync(query);
    }))
    .then(() => (insertId));
  };
}

function passLog(label) {
  return function(data) {
    console.log(label, data);
    return data;
  }
}
module.exports = {
  lowerCamelAttributes,
  snakeAttributes,
  kebabAttributes,
  getMapRecords,
  getMapRecord,
  getRecordId,
  mapRecord,
  passLog,
  // performDeferred,
  getPerformDeferred,
  extractFirstRecord,
  getStripRelAttributes
}