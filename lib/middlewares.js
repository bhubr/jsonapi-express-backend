const Promise = require('bluebird');
const _ = require('lodash');
const queryParams = require('./queryParams');
const utils = require('./utils');
// const relationshipsMap = require('./relationships-map');
const queryBuilder = require('./queryBuilder');
const authToken = require('./authToken');

function jsonApi(req, res, next) {
  res.jsonApi = function(data) {
    res.set({
      'Content-Type': 'application/json'
    });
    return res.send(JSON.stringify({ data }));
  };
  next();
}

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
  requiredKeys.forEach(key => {
    if(keys.indexOf(key) === -1) {
      throw new Error('Key "' + key + '" is required for this HTTP method (' + req.method + ')');
    }
  });
  if(data.type !== expectedType) {
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
    const { table, type } = queryParams.tableOnly(req);
    checkRequiredAttrs(req, type);
    req.body.data = Object.assign(req.body.data, { table, type });
    next();
  } catch(error) {
    let payload = { error: error.message };
    if(req.body && process.env.NODE_ENV === 'test') {
      payload.body = req.body;
    }
    return res.status(400).json(payload);
  }
}

function getCheckModel(modelDescriptors) {
  return (req, res, next) => {
    const type = req.body.data.type;
    if(! modelDescriptors[type]) {
      return res.status(400).json({ error: 'Model "' + type + '"" is not defined in models definition file' });
    }
    return next();
  }
}

function getCheckAttributes(modelDescriptors) {
  return (req, res, next) => {
    const type = req.body.data.type;
    const { requiredAttributes } = modelDescriptors[type];
    if(requiredAttributes) {
      const attrNames = Object.keys(req.body.data.attributes);

      for (var index in requiredAttributes) {
        attrName = requiredAttributes[index];
        if(attrNames.indexOf(attrName) === -1) {
          return res.status(400).json({ error: 'Required field "' + attrName + '" not found in payload' });
        }
      }
    }
    return next();
  }
}


function getCheckPermissions(modelRelationships, queryAsync) {
  return (req, res, next) => {
    try {
      const relationships = modelRelationships[req.params.table];
      // let userRelationship = null;
      let userRelationshipKey = null;
      for (let key in relationships) {
        const relationship = relationships[key];
        if(relationship.table === 'users' && relationship.type === 'belongsTo' ) {
          // userRelationship = relationship;
          userRelationshipKey = key;
        }
      }
      const permissionCheckers = {
        self: () => Promise.resolve(parseInt(req.params.id, 10) === req.jwt.userId),
        mine: () => {
          const table = req.params.table;
          const ownerKey = userRelationshipKey + 'Id';
          return queryAsync(queryBuilder.selectOne(table, req.params.id))
          .then(records => (records[0]))
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
      const permissionBase = req.params.table + ':' +
        opPerMethod[req.method.toLowerCase()] + ':';
      const matchingPermission = _.find(req.jwt.permissions, p => (p.includes(permissionBase)));
      if(! matchingPermission) {
        return res.status(403).json({ error: 'Insufficient rights' });
      }
      const permissionModifier = matchingPermission.substr(permissionBase.length);
      console.log('\n\n##### checkPermissions', req.jwt.permissions + '\n'+ permissionBase, matchingPermission, permissionModifier);
        // permissionCheckers[permissionModifier](req)
      // );
      return permissionCheckers[permissionModifier]()
      .then(result => (result ? next() : res.status(403).json({ error: 'Insufficient rights' })));
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }
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
  return (table, queryAsync) => {
    return records => {
      // console.log('\n\n\n  ######### RELATIONSHIPS FOR TABLE ' + table + ' ######################\n\n')
      // console.log(map[table]);
      const relationshipsForType = map[table];
      let deferred = {};
      let promises = [];
      let paramSets = [];
      if(records.length === 0) {
        return Promise.resolve([]);
      }
      // record.relationships = {};
      _.forOwn(relationshipsForType, (mapEntry, key) => {
        console.log(map, mapEntry.table, mapEntry.reverse);
        var revEntry = map[mapEntry.table][mapEntry.reverse];
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

function getExtractReqRelationships(map) {

  return (req, res, next) => {
    try {
      // console.log('extractReqRelationships #1');
      // extract table and relationships from request params
      const { table } = req.body.data;
      const { relationships } = req.body.data;
      if(map[table] === undefined) {
        // BAD return next(new Error('undefined relationships for ' + table));
        // GOOD
        return res.status(500).json({ error: 'undefined relationships for ' + table })
        // req.body.data.allAttributes = req.body.data.attributes;
        // return next();
      }
      const relationshipsForType = map[table];
      console.log('extractReqRelationships #2', relationshipsForType);
      req.body.data.deferredRelationships = {};
      req.body.data.relationshipAttributes = {};
      // reduce payload relationships
      let index = 0;
      // console.log(req.body.data.relationships);
      _.forOwn(relationships, (payloadRelationship, payloadKey) => {
        console.log('#3', payloadRelationship, payloadKey);
        const camelKey = _.lowerFirst(_.camelCase(payloadKey));
        // no relationship found in table for this payload key => should trigger an error
        if(relationshipsForType[camelKey] === undefined) {
          throw new Error(
            'found a relationship key (' + payloadKey + ") that isn't defined in map for type: " + table
          );
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
        // console.log('#4', payloadRelationship, payloadKey);
      });
      req.body.data.allAttributes = Object.assign({}, req.body.data.attributes, req.body.data.relationshipAttributes);
      next();
    } catch(e) {
      console.log(e);
      return res.status(500).json({ error: e.message });
    }

  }
}

module.exports = function(checkJwt, relationshipsMap, modelDescriptors, queryAsync) {
  return {
    jsonApi,
    checkJwt,
    extractTableAndTypePostOrPatch,
    extractTableAndTypeGet,
    convertAttributes,
    processAttributes,
    getExtractReqRelationships,
    extractReqRelationships: getExtractReqRelationships(relationshipsMap),
    getGetRelationshipsSingle: getGetGetRelationshipsSingle(relationshipsMap),
    getGetRelationshipsMulti: getGetGetRelationshipsMulti(relationshipsMap),
    checkModel: getCheckModel(modelDescriptors),
    checkAttributes: getCheckAttributes(modelDescriptors),
    checkPermissions: getCheckPermissions(relationshipsMap, queryAsync)
    //: getCheckPermissions(queryAsync)
  };
}