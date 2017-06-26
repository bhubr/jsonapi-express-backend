const Promise = require('bluebird');
const _ = require('lodash');
const queryParams = require('./queryParams');
const utils = require('./utils');
// const relationshipsMap = require('./relationships-map');
const queryBuilder = require('./queryBuilder');
const authToken = require('./authToken');
const naming = require('./naming');

function jsonApi(req, res, next) {
  res.jsonApi = function(data) {
    res.set({
      'Content-Type': 'application/json'
    });
    // console.log('#jsonApi response for', req.method, req.url, JSON.stringify({ data }));
    return res.send(JSON.stringify({ data }));
  };
  next();
}

const requiredKeysPerMethod = {
  post: ['attributes', 'type'],
  put: ['id', 'type'],
  patch: ['id', 'type'],
}

function checkRequiredAttrs(req, expectedType) {
  if(! req.body || ! req.body.data) {
    throw new Error('body or body.data not found');
  }
  const requiredKeys = requiredKeysPerMethod[req.method.toLowerCase()];
  const { data } = req.body;
  const keys = Object.keys(data);
  const providedType = naming.toCamelSingular(data.type);
  requiredKeys.forEach(key => {
    if(keys.indexOf(key) === -1) {
      throw new Error('Key "' + key + '" is required for this HTTP method (' + req.method + ')');
    }
  });
  if(providedType !== expectedType) {
    throw new Error('Type provided in payload (' + data.type + ') does not match expected type (' + expectedType + ')');
  }
}

function checkMethod(req) {
  if(['POST', 'PUT', 'PATCH'].indexOf(req.method) === -1) {
    throw new Error('Bad method: ' + req.method);
  }
}

function extractTableAndTypePostOrPatch(req, res, next) {
  try {
    checkMethod(req);
    const { kebabPlural, camelSingular, tableName } = queryParams.extract(req);
    checkRequiredAttrs(req, camelSingular);
    req.jsonapiData = { kebabPlural, camelSingular, tableName };
    next();
  } catch(error) {
    console.log(error);
    let payload = { error: error.message };
    if(req.body && process.env.NODE_ENV === 'test') {
      payload.body = req.body;
    }
    return res.status(400).json(payload);
  }
}



function getCheckPermissions(modelRelationships, queryAsync) {
  return (req, res, next) => {
    try {
      const { tableName, kebabPlural, camelSingular } = queryParams.extract(req);
      const relationships = modelRelationships[camelSingular];
      // let userRelationship = null;
      let userRelationshipKey = null;
      for (let key in relationships) {
        const relationship = relationships[key];
        console.log(key, relationship)
        if(relationship.model === 'user' && relationship.type === 'belongsTo' ) {
          // userRelationship = relationship;
          userRelationshipKey = key;
        }
      }
      const permissionCheckers = {
        self: () => Promise.resolve(parseInt(req.params.id, 10) === req.jwt.userId),
        mine: () => {
          const ownerKey = userRelationshipKey + 'Id';
          console.log('mine #1', userRelationshipKey, ownerKey);
          return queryAsync(queryBuilder.selectOne(tableName, req.params.id))
          .then(records => (records[0]))
          .then(utils.passLog('mine #2 records'))
          .then(record => Promise.resolve(record[ownerKey] === req.jwt.userId));
        },
        all: () => Promise.resolve(true)
      }

      const opPerMethod = {
        post: 'create',
        get: 'read',
        patch: 'update',
        put: 'update',
        'delete': 'delete'
      };
      const permissionBase = camelSingular + ':' +
        opPerMethod[req.method.toLowerCase()] + ':';
      const matchingPermission = _.find(req.jwt.permissions, p => (p.includes(permissionBase)));
      if(! matchingPermission) {
        console.log('no matching permissions', req.jwt.permissions, permissionBase);
        return res.status(403).json({ error: 'Insufficient rights', expected: permissionBase + '*', actual: req.jwt.permissions });
      }
      const permissionModifier = matchingPermission.substr(permissionBase.length);
      // console.log('\n\n##### checkPermissions', req.jwt.permissions + '\n'+ permissionBase, matchingPermission, permissionModifier);
        // permissionCheckers[permissionModifier](req)
      // );
      return permissionCheckers[permissionModifier]()
      .then(result => (result ? next() : res.status(403).json({ error: 'Insufficient rights', expected: permissionBase + '*', actual: req.jwt.permissions, permissionModifier })));
    } catch(e) {
      console.log(e);
      return res.status(500).json({ error: e.message })
    }
  }
}

function extractTableAndTypeGet(req, res, next) {
  const { table, type } = queryParams.tableOnly(req);
  req.body = Object.assign({}, { table, type });
  next();
}


function processAttributes( attributes, options ) {
  let updatedAt = utils.dateToMySQL();
  let outputAttrs = Object.assign( {},
    utils.lowerCamelAttributes( attributes ),
    { updatedAt }
  );
  if( options && options.create ) {
    outputAttrs.createdAt = updatedAt;
  }
  return outputAttrs;
}

function convertAttributes(req, res, next) {
  const { attributes } = req.body.data;
  // console.log('#convertAttributes', attributes);
  const create = req.method === 'POST';
  req.body.data.attributes = processAttributes( attributes, { create } );
  // console.log('#convertAttributes', attributes, req.body.data.attributes);
  next();
}

// function getFunc(method, thisType, revType) {
//   if(thisType === 'belongsTo' && revType === 'belongsTo') {
//     return method + 'OneToOneRelatee';
//   }
//   if(
//     thisType === 'belongsTo' && revType === 'hasMany' ||
//     thisType === 'hasMany' && revType === 'belongsTo'
//   ) {
//     return method + 'OneToManyRelatee';
//   }
//   if(thisType === 'hasMany' && revType === 'hasMany') {
//     return method + 'ManyToManyRelatee';
//   }
//   else throw Error('not implemented for ' + method + ':' + thisType + ':' + revType);
// }



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

function getGetGetRelationshipsSingle(map) {
  return (table, queryAsync) => {
    return record => {
      const relationshipsForType = map[table];
      let deferred = {};
      let queries = [];
      let paramSets = [];
      record.relationships = {};
      _.forOwn(relationshipsForType, (mapEntry, key) => {
        var revEntry = map[mapEntry.table][mapEntry.reverse];
        // console.log(mapEntry, key, revEntry);
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
        if(mapEntry.type === 'hasMany' && revEntry.type === 'hasMany') {
          const relateeTable = mapEntry.table;
          const thisType = _.singularize(table);
          const relType  = _.singularize(relateeTable);
          const { pivotTable, thisFirst } = getPivotTable(key, table, mapEntry.reverse, mapEntry.table);
          const [fieldId1, fieldId2] = utils.getIdFields(thisFirst, thisType, relType);
          const query = queryBuilder.selectRelatees(pivotTable, fieldId1, record.id);
          console.log('## many2many', key, pivotTable, fieldId1, fieldId2, query);
          queries.push(query);
          paramSets.push({ key, single: false, type: mapEntry.table, pkName: fieldId2 });
        }
      });
      return Promise.map(queries, query => {
        return queryAsync(query);
      })
      .then(results => {
        results.forEach((result, index) => {
          const { key, single, type } = paramSets[index];
          const pkName = paramSets[index].pkName ? paramSets[index].pkName : 'id';
          const mapped = utils.mapRelationships(result, type, pkName);
          const data = single ? mapped[0] : mapped;
          record.relationships[key] = { data };
        });
        return record;
      })
    };
  };
}


function getGetGetRelationshipsMulti(map) {
  return (camelSingular, queryAsync) => {
    return records => {
      console.log('\n\n  ######### RELATIONSHIPS FOR TYPE ' + camelSingular + ' ######################\n\n')
      console.log('    # Map for type ' + camelSingular +': ', map[camelSingular]);
      let i = 0;
      const modelRelationships = map[camelSingular];
      let deferred = {};
      let promises = [];
      let paramSets = [];
      if(records.length === 0) {
        return Promise.resolve([]);
      }
      // record.relationships = {};
      _.forOwn(modelRelationships, (mapEntry, key) => {
        console.log('    # i=' + i, mapEntry.model, mapEntry.reverse);
        var revEntry = map[mapEntry.model][mapEntry.reverse];
        if(mapEntry.type === 'belongsTo' && revEntry.type === 'belongsTo') {
          const relateeIds = records.map(record => ([{id: record.attributes[key + '-id']}]));
          records.forEach((record, index) => {
            delete records[index].attributes[key + '-id'];
          });
          // const query = queryBuilder.selectIn(mapEntry.table, relateeIds);
          promises.push(Promise.resolve(relateeIds));
          // console.log('## one2one', key);
          paramSets.push({ key, single: true, type: mapEntry.table });
        }
        else if(mapEntry.type === 'hasMany' && revEntry.type === 'belongsTo') {
          const recordIds = records.map(record => (record.id));
          const query = queryBuilder.selectRelateesIn(mapEntry.table, mapEntry.reverse + 'Id', recordIds);
          promises.push(queryAsync(query));
          // console.log('## one2many', key, query);
          paramSets.push({ key, single: false, type: mapEntry.table, groupBy: mapEntry.reverse + 'Id' });
        }
        else if(mapEntry.type === 'belongsTo' && revEntry.type === 'hasMany') {
          const recordIds = records.map(record => (record.id));
          const thisKey = _.kebabCase(revEntry.reverse + 'Id');
          const relateeIds = records.map(record => (record.attributes[thisKey]));
          const query = queryBuilder.selectRelateesIn(mapEntry.table, 'id', relateeIds)
          promises.push(queryAsync(query).then(relatees => {
            return records.map(record => ([_.find(relatees, { id: record.attributes[thisKey] })]));
          }));
          // console.log('## many2one', key, query);
          paramSets.push({ key, single: true, type: mapEntry.table });
        }
        else if(mapEntry.type === 'hasMany' && revEntry.type === 'hasMany') {
          const relateeTable = mapEntry.table;
          const thisType = _.singularize(table);
          const relType  = _.singularize(relateeTable);
          const recordIds = records.map(record => (record.id));
          const { pivotTable, thisFirst } = getPivotTable(key, table, mapEntry.reverse, mapEntry.table);
          const [fieldId1, fieldId2] = utils.getIdFields(thisFirst, thisType, relType);
          const query = queryBuilder.selectRelateesIn(pivotTable, fieldId1, recordIds);
          // console.log('## many2many', key, pivotTable, fieldId1, fieldId2, query);
          promises.push(queryAsync(query));
          paramSets.push({ key, single: false, type: mapEntry.table, pkName: fieldId2, groupBy: fieldId1 });
        }
        i++;
      });
      return Promise.all(promises)
      .then(results => {
        records.forEach((record, recIdx) => {
          records[recIdx].relationships = {};
        });
        // console.log('\n\n\n  ######### RESULTS FOR TABLE ' + table + ' ######################\n')
        results.forEach((result, resIdx) => {

          let groupedResult;
          const { key, single, type, groupBy } = paramSets[resIdx];
          const pkName = paramSets[resIdx].pkName ? paramSets[resIdx].pkName : 'id';
          // console.log('\n## index', resIdx, key, groupBy ? 'GROUPED BY ' + groupBy : 'DIRECT');
          if(groupBy) {
            groupedResult = _.groupBy(result, groupBy);
          }
          // else console.log(result);

          // console.log('\n');

          records.forEach((record, recIdx) => {
            let thisResult;
            let data;
            // "result" is an array of which values respect the same ordering as records
            if(! groupBy) {
              thisResult = result[recIdx];
            }
            else {
              thisResult = groupedResult['' + record.id];
            }
            if(thisResult) {
              // console.log('result not empty', resIdx, recIdx, pkName, record, thisResult);
              const mapped = utils.mapRelationships(thisResult, type, pkName);
              data = single ? mapped[0] : mapped;
            }
            else {
              data = single ? null : [];
            }
            records[recIdx].relationships[key] = { data };
          });
        });
        return records;
      })
    };
  };
}

function extractBelongsTo(idOrUndef, camelSingular, tableName, camelKey, mapEntry, revEntry, relationshipData, carry, queryAsync) {
  // console.log('#extractBelongsTo');
  carry.relationshipAttributes[camelKey + 'Id'] = parseInt(relationshipData.id, 10);
  if( revEntry.type !== 'belongsTo' ) {
    // console.log('\n##belongsTo/other', revEntry.type);
    return Promise.resolve(carry);
  }
  else {
    const hasToClearExistingRel = idOrUndef !== undefined;
    // console.log('\n##belongsTo/belongsTo', camelSingular, mapEntry.model, camelKey, mapEntry.reverse);
    const relTable = naming.toTableName(mapEntry.model, true);
    const relKey = mapEntry.reverse + 'Id';
    let update2 = {};
    update2[ camelKey + 'Id' ] = null;
    let where = {};
    where[ camelKey + 'Id' ] = relationshipData.id;
    const clearPreviousQuery = queryBuilder.updateWhere(tableName, where, update2);

    const selectPreviousQuery = queryBuilder.selectWhere(tableName, where);
    // console.log('#needsClear/selectPreviousQuery/clearPreviousQuery', hasToClearExistingRel, selectPreviousQuery, clearPreviousQuery);
    carry.deferredOneToOne.push({ relTable, key: relKey, id: relationshipData.id });

    console.log('#needsClear ? ', hasToClearExistingRel, selectPreviousQuery);
    return ! hasToClearExistingRel ?
      Promise.resolve(carry) :
      queryAsync(selectPreviousQuery)
      .then(records => (
        (records.length === 0 || records[0].id === idOrUndef) ?
          false :
          queryAsync(clearPreviousQuery)
      ))
      .catch(e => {
        console.log('#err in promise chain', e); throw e;
      })
      .then(() => Promise.resolve(carry));
  }
}

function extractManyToMany(idOrUndef, camelSingular, tableName, camelKey, mapEntry, revEntry, relationshipData, carry, queryAsync) {
  // console.log('#extractManyToMany');
  const relateeTable = mapEntry.model;
  const { pivotTable, thisFirst } = getPivotTable(camelKey, camelSingular, mapEntry.reverse, relateeTable);
  const ids = _.map(relationshipData, entry => parseInt(entry.id, 10));
  carry.deferredManyToMany[pivotTable] = { thisFirst, relateeTable, ids };
  // console.log('#extractManyToMany carry', carry);
  return Promise.resolve(carry);
}

function extractManyToOne(idOrUndef, camelSingular, tableName, camelKey, mapEntry, revEntry, relationshipData, carry, queryAsync) {
  const relTable = naming.toTableName(mapEntry.model, true);
  const relateeIds = _.map(relationshipData, 'id');
  const relKey = mapEntry.reverse + 'Id';
  // console.log('#extractManyToOne carry', carry, relTable, relationshipData, relateeIds);
  carry.deferredManyToOne.push({ relTable, key: relKey, ids: relateeIds });
  return Promise.resolve(carry);
}

function getFunc(thisType, relType) {
  if( thisType === 'belongsTo' ) {
    return extractBelongsTo;
  }
  else if(thisType === 'hasMany') {
    if(relType === 'hasMany') {
      return extractManyToMany;
    }
    else {
      return extractManyToOne;
    }
  }
}

function getExtractReqRelationships(map, queryAsync) {

  return (req, res, next) => {
    // try {
      const { camelSingular, tableName } = req.jsonapiData;
      // console.log('#getExtractReqRelationships', req.method, req.url, camelSingular, tableName);
      let { relationships } = req.body.data;
      if(relationships ===  undefined) {
        relationships = {};
      }
      if(map[camelSingular] === undefined) {
        return res.status(500).json({ error: 'undefined relationships for ' + camelSingular })
      }
      const relationshipsForType = map[camelSingular];

      // req.jsonapiData.deferredManyToMany = {};
      // req.jsonapiData.deferredOneToOne = [];
      // req.jsonapiData.relationshipAttributes = {};
      const mappedRelationships = Object.keys(relationships).map(key => { return { key, relationship: relationships[key] } });
      // console.log('#getExtractReqRelationships', relationshipsForType, mappedRelationships);

      Promise.reduce(mappedRelationships, (carry, relItem) => {
        const { key, relationship } = relItem;
        const camelKey = _.lowerFirst(_.camelCase(key));
        // no relationship found in table for this payload key => should trigger an error
        if(relationshipsForType[camelKey] === undefined) {
          return Promise.reject(
            new Error('found a relationship key (' + key + ") that isn't defined in map for type: " + tableName +', ' + req.url)
          );
        }
        const relationshipData = relationship.data;
        if(relationshipData === null) {
          return Promise.resolve(carry);
        }
        var mapEntry = relationshipsForType[camelKey];
        var revEntry = map[mapEntry.model][mapEntry.reverse];
        var func = getFunc(mapEntry.type, revEntry.type);
        // console.log(camelKey, mapEntry.type, revEntry.type);
        return func(req.params.id, camelSingular, tableName, camelKey, mapEntry, revEntry, relationshipData, carry, queryAsync);
      }, {
        deferredManyToMany: {},
        relationshipAttributes: {},
        deferredManyToOne: [],
        deferredOneToOne: []
      })
      .then(reduced => {
        // console.log('#getExtractReqRelationships', reduced);
        req.jsonapiData.allAttributes = Object.assign({}, req.body.data.attributes, reduced.relationshipAttributes);
        req.jsonapiData.relationshipAttributes = reduced.relationshipAttributes;
        req.jsonapiData.deferredManyToMany = reduced.deferredManyToMany;
        req.jsonapiData.deferredManyToOne = reduced.deferredManyToOne;
        req.jsonapiData.deferredOneToOne = reduced.deferredOneToOne;
        return null;
      })
      .then(utils.passLog('promise after reduce'))
      .then(() => next())
      .catch(err => {
        return res.status(500).json({ error: err.message })
      });
      // console.log(req.body.data.relationships);
      // _.forOwn(relationships, (payloadRelationship, payloadKey) => {
        // console.log('#3', payloadRelationship, payloadKey);
        // console.log('#4', camelKey, mapEntry, revEntry);


        // console.log('#4', payloadRelationship, payloadKey);
      // });
      // req.jsonapiData.allAttributes = Object.assign({}, req.body.data.attributes, req.jsonapiData.relationshipAttributes);
      // console.log(req.jsonapiData.allAttributes, req.jsonapiData.relationshipAttributes, req.jsonapiData.deferredManyToMany);
      // next();
    // } catch(e) {
    //   console.log(e);
    //   return res.status(500).json({ error: e.message });
    // }

  }
}

module.exports = function(checkJwt, relationshipsMap, queryAsync) {
  return {
    jsonApi,
    checkJwt,
    extractTableAndTypePostOrPatch,
    extractTableAndTypeGet,
    convertAttributes,
    processAttributes,
    getExtractReqRelationships,
    extractReqRelationships: getExtractReqRelationships(relationshipsMap, queryAsync),
    getGetRelationshipsSingle: getGetGetRelationshipsSingle(relationshipsMap),
    getGetRelationshipsMulti: getGetGetRelationshipsMulti(relationshipsMap),
    checkPermissions: getCheckPermissions(relationshipsMap, queryAsync)
    //: getCheckPermissions(queryAsync)
  };
}