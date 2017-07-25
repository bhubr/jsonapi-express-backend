const lineLogger = require('console-line-logger');
const _ = require('lodash');
const Promise = require('bluebird');
const queryBuilder = require('./queryBuilder');

function lowerCamelKeys(obj) {
  var newAttrs = {};
  for(var key in obj) {
    var lowerCamelAttrKey = _.lowerFirst( _.camelCase(key));
    newAttrs[lowerCamelAttrKey] = obj[key];
  }
  return newAttrs;
}

function snakeKeys(obj) {
  var newAttrs = {};
  for(var key in obj) {
    var snakedAttrKey = _.snakeCase(key);
    newAttrs[snakedAttrKey] = obj[key];
  }
  return newAttrs;
}

function kebabAttributes(obj) {
  var newAttrs = {};
  for(var key in obj) {
  var snakedAttrKey = _.kebabCase(key);
  newAttrs[snakedAttrKey] = obj[key];
  }
  return newAttrs;
}

function extractFirstRecord(records) {
  return records[0];
}

function mapRecord(record, type) {
  const id = record.id;
  let relationships;
  let payload;
  if(record._rel) {
    relationships = record._rel;
    delete record._rel;
  }
  payload = {
    attributes: Object.assign({}, kebabAttributes(record))
  };
  delete payload.attributes.id;
  if(relationships) {
    payload.relationships = {};
    _.forOwn(relationships, (data, key) => {
      payload.relationships[key] = { data };
    });
  }
  return Object.assign({}, { id, type }, payload);
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

function mapRelationship(entry, type, pkName) {
  pkName = pkName ? pkName : 'id';
  return ! entry[pkName] ? null :
    { id: '' + entry[pkName], type };
}

function mapRelationships(entries, type, pkName) {
  pkName = pkName ? pkName : 'id';
  return entries.map(entry => mapRelationship(entry, type, pkName));
}

function getStripRelAttributes(relationshipAttrs) {
  // lineLogger("#stripRelAttributes", relationshipAttrs);
  if(! relationshipAttrs) {
    return record => (record);
  }
  const keysToStrip = Object.keys(relationshipAttrs);
  // lineLogger("#stripRelAttributes", keysToStrip);
  return record => stripRelKeys(record, keysToStrip);
}

function stripRelKeys(record, keysToStrip) {
  return _.reduce(record, (carry, val, key) => {
    if(keysToStrip.indexOf(key) !== -1) {
      delete carry[key];
    }
    return carry;
  }, record);
}

// function performDeferred(insertId, deferred) {
//   lineLogger('##deferred', deferred);
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
//     lineLogger(values);
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
function getIdFields(thisFirst, thisType, relType) {
  if (thisType !== relType) {
    return [thisType + 'Id', relType + 'Id'];
  }
  return thisFirst ?
    [thisType + 'Id1', thisType + 'Id2'] :
    [thisType + 'Id2', thisType + 'Id1'];
}

function getPerformDeferredOneToOne(queryAsync, deferredOneToOne) {
  return insertId => {
    const queries = deferredOneToOne.map(({ relTable, key, id }) => {
      let update = {};
      update[key] = insertId;
      return queryBuilder.updateOne(relTable, id, update);
    })
    return Promise.map(queries, query => queryAsync(query))
    .then(() => Promise.resolve(insertId))
  }
}

function getPerformDeferredManyToOne(queryAsync, deferredManyToOne) {
  return insertId => {
    const queries = deferredManyToOne.map(({ relTable, key, ids }) => {
      let update = {};
      update[key] = insertId;
      return queryBuilder.updateIn(relTable, ids, update);
    })
    // lineLogger('# getPerformDeferredManyToOne', queries);
    // return Promise.resolve(insertId);
    return Promise.map(queries, query => queryAsync(query))
    .then(() => Promise.resolve(insertId))
  }
}

function getPerformDeferredManyToMany(table, queryAsync, deferredManyToMany) {
  return insertId => {
    var queries = [];
    for (var pivotTable in deferredManyToMany) {
      const { thisFirst, relateeTable, ids } = deferredManyToMany[pivotTable];
      if(ids.length === 0) {
        continue;
      }
      const thisType = _.singularize(table);
      const relType  = _.singularize(relateeTable);
      const [fieldId1, fieldId2] = getIdFields(thisFirst, thisType, relType);
      // lineLogger(thisType, relType, fieldId1, fieldId2, insertId, deferredManyToMany);
      const values =  _.reduce(ids, (prev, id) => {
        let obj = {};
        obj[fieldId1] = insertId;
        obj[fieldId2] = id;
        return prev.concat(obj);
      }, []);
      // lineLogger(values);
// process.exit()
      queries.push(queryBuilder.deleteWithId(pivotTable, insertId, fieldId1));
      queries.push(queryBuilder.insert(pivotTable, values));
      //const thisIds = _.times(ids.length, insertId);
      // const values = thisFirst ? _.reduce((ids, (prev, id) => { prev.push(insertId) }, []);
    }
    // lineLogger('## queries', queries);
    return Promise.map(queries, function(query) {
      return queryAsync(query);
    })
    // .then(passLog('return from Promise.map'))
    .then(() => (insertId));
  };
}


// function getSetDefaultRole(config, queryAsync) {
//   return attributes => (new Promise((resolve, reject) => {
//     if(config.permissions && config.permissions.enabled) {
//       const { defaultUserRole } = config.permissions;
//       if(! defaultUserRole) {
//         return res.status(400).json({ error: 'Set defaultUserRole in your config.permissions if you set enabled to true' });
//       }
//       const roleQuery = queryBuilder.selectWhere('roles', { name: defaultUserRole });
//       queryAsync(roleQuery)
//       .then(roles => {
//         if(! roles.length) {
//           reject(new Error('Role with name "' + defaultUserRole + '" was not found is role list'));
//         }
//         const roleId = roles[0].id;
//         resolve(Object.assign(attributes, { roleId }));
//       });
//     }

//   }));
// }


/**
 * Needed by dateToMySQL: pad numbers to two digits
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}


/**
 * convert a date to mysql format
 */
function dateToMySQL(date) {
  if(! date) {
    date = new Date();
  }
  return date.getUTCFullYear() + "-" + twoDigits(1 + date.getUTCMonth()) + "-" + twoDigits(date.getUTCDate()) + " " +
    twoDigits(date.getUTCHours()) + ":" + twoDigits(date.getUTCMinutes()) + ":" + twoDigits(date.getUTCSeconds());
};

function passLog(label) {
  return function(data) {
    lineLogger(label, data);
    return data;
  }
}

function passError(label) {
  return function(err) {
    lineLogger(label, err);
    throw err;
  }
}

module.exports = {
  dateToMySQL,
  lowerCamelKeys,
  snakeKeys,
  kebabAttributes,
  mapRelationships,
  mapRelationship,
  getMapRecords,
  getMapRecord,
  getRecordId,
  mapRecord,
  passLog,
  passError,
  getIdFields,
  getPerformDeferredManyToMany,
  getPerformDeferredManyToOne,
  getPerformDeferredOneToOne,
  extractFirstRecord,
  getStripRelAttributes,
  stripRelKeys,
  getSetRelationships,
  // getSetDefaultRole
}