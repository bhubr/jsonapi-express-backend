const queryBuilder = require('../queryBuilder');
const naming = require('../naming');
const Promise = require('bluebird');
const _ = require('lodash');
const utils = require('../utils');

module.exports = function(modelDescriptors, modelRelationships, queryAsync) {
  return {

    typeToTableMap: {},

    init: function() {
      const modelKeys = Object.keys(modelDescriptors);
      modelKeys.forEach(camelSingular => {
        this.typeToTableMap[camelSingular] = naming.toTableName(camelSingular, true);
      })
      // console.log('init', this.typeToTableMap);
    },

    mapType: function(type) {
      const table = this.typeToTableMap[type];
      if (!table) {
        throw new Error("Did not find table for type '" + type + "'");
      }
      return table;
    },

    getAllRels: function(type) {
      return modelRelationships[type];
    },

    getOneRel: function(type, relKey) {
      return modelRelationships[type][relKey];
    },

    createRecord: function(type, attributes) {
      const table = this.mapType(type);
      // console.log('## createRecord', type, table, attributes);
      const insertQuery = queryBuilder.insert(table, attributes);
      return queryAsync(insertQuery)
      .then(res => queryBuilder.selectOne(table, res.insertId))
      .then(queryAsync)
      .then(records => Object.assign({}, records[0]));
    },

    findAll: function(type) {
      const table = this.mapType(type);
      const selectQuery = queryBuilder.selectAll(table);
      return queryAsync(selectQuery)
      .then(records => {
        // console.log('storeSqlStrategy.findAll', type, records.map(r => (r.id)));
        return records;
      })
      .then(records => (records.map(record => Object.assign({}, record))));
    },

    findRecord: function(type, id) {
      const table = this.mapType(type);
      const selectQuery = queryBuilder.selectOne(table, id);
      return queryAsync(selectQuery)
      .then(records => Object.assign({}, records[0]));
    },

    findRecordsIn: function(type, ids) {
      const table = this.mapType(type);
      const selectQuery = queryBuilder.selectIn(table, ids);
      return queryAsync(selectQuery);
    },

    findRecordBy: function(type, where, multi) {
      const table = this.mapType(type);
      const selectQuery = queryBuilder.selectWhere(table, where);
      // console.log('## findRecordBy', type, selectQuery, '\n');
      return queryAsync(selectQuery)
      .then(records => (!! multi ? records :
        (records.length ? records[0] : false)));
    },

    findPivotRecords: function(table, where) {
      const selectQuery = queryBuilder.selectWhere(table, where);
      return queryAsync(selectQuery);
    },

    updateRecord: function(type, id, attributes) {
      const table = this.mapType(type);
      const updateQuery = queryBuilder.updateOne(table, id, attributes);
      const selectQuery = queryBuilder.selectOne(table, id);
      return queryAsync(updateQuery)
      .then(() => queryAsync(selectQuery))
      .then(records => Object.assign({}, records[0]));
    },

    deleteRecord: function(type, id) {
      const table = this.mapType(type);
      const deleteQuery = queryBuilder.deleteWithId(table, id);
      return queryAsync(deleteQuery)
      .then(() => (id));
    },

    getGetterFunc: function(type, relKey, rel, rev) {
      // const that = this;
      const relType1 = rel.type;
      const relType2 = rev.type;
      const mapKey = relType1 + '.' + relType2;
      // console.log('getGetterFunc', rel, rev, mapKey);
      const map = {
        'hasMany.belongsTo': function(owner, relateeType) {
          let query = {};
          query[rel.reverse + 'Id'] = owner.id;
          return this.findRecordBy(relateeType, query, true);
        },
        'belongsTo.belongsTo': function(record1, relateeType) {
          let query = {};
          query[rel.reverse + 'Id'] = record1.id;
          return this.findRecordBy(relateeType, query, false);
        },
        'belongsTo.hasMany': function(record1, relateeType) {
          const query = {
            id: record1[rev.reverse + 'Id']
          };
          return this.findRecordBy(relateeType, query, false);
        },
        'hasMany.hasMany': function(record1, relateeType) {
          const { pivotTable, thisFirst } = naming.getPivotTable(type, relKey, rel, rev);
          let query = {};
          query[type + 'Id'] = record1.id;
          // console.log('###many2many', query);
          return this.findPivotRecords(pivotTable, query)
          .then(records => (records.map(record => (record[rel.model + 'Id']))))
          .then(relateeIds => this.findRecordsIn(rel.model, relateeIds));
        }
      };
      return map[mapKey];
    },

    getGetterFuncMulti: function(type, relKey, rel, rev) {
      // const that = this;
      const relType1 = rel.type;
      const relType2 = rev.type;
      const mapKey = relType1 + '.' + relType2;
      // console.log('getGetterFunc', rel, rev, mapKey);
      const map = {
        'hasMany.belongsTo': function(records, relateeType) {
          const recordIds = _.map(records, 'id');
          const table = this.mapType(rel.model);
          const reverseId = rel.reverse + 'Id';
          const query = queryBuilder.selectRelateesIn(table, reverseId, recordIds);
          return queryAsync(query)
          .then(records => (_.groupBy(records, reverseId)));

          // let query = {};
          // query[rel.reverse + 'Id'] = owner.id;
          // return this.findRecordBy(relateeType, query, true);
        },
        'belongsTo.belongsTo': function(records, relateeType) {
          // console.log(records, relKey + 'Id', relateeIds);
          // const query = queryBuilder.selectIn(mapEntry.table, relateeIds);
          return Promise.resolve(
            records.map(record => {
              // return record[relKey + 'Id'];
              let output = {};
              output[record.id] = record[relKey + 'Id'];
              return output;
            })
          );

          // return this.findRecordBy(relateeType, query, false);
        },
        'belongsTo.hasMany': function(records, relateeType) {
          // const query = {
          //   id: record1[rev.reverse + 'Id']
          // };
          const recordIds = records.map(record => (record.id));
          // console.log(type, relKey, rel, rev, records);
          const thisKey = rev.reverse + 'Id';
          console.log(thisKey);
          const relateeIds = _.map(records, thisKey);
          const table = this.mapType(rel.model);
          console.log(table, relateeIds);
          const query = queryBuilder.selectRelateesIn(table, 'id', relateeIds)
          return queryAsync(query)
          .then(relatees => {
            return relatees;
            // return records.map(record => ([_.find(relatees, { id: record.attributes[thisKey] })]));
          });


          // return this.findRecordBy(relateeType, query, false);
        },
        'hasMany.hasMany': function(records, relateeType) {
          const recordIds = records.map(record => (record.id));
          const { pivotTable, thisFirst } = naming.getPivotTable(type, relKey, rel, rev);
          // let query = {};
          // query[type + 'Id'] = record1.id;
          const [fieldId1, fieldId2] = utils.getIdFields(thisFirst, type, rel.model);
          console.log('hasMany.hasMany', fieldId1, fieldId2);
          const query = queryBuilder.selectRelateesIn(pivotTable, fieldId1, recordIds);
          return queryAsync(query);
          // return this.findPivotRecords(pivotTable, query)
          // .then(records => (records.map(record => (record[rel.model + 'Id']))))
          // .then(relateeIds => this.findRecordsIn(rel.model, relateeIds));
        }
      };
      return map[mapKey];
    },

    findRelatees: function(type, record, relKey) {
      const rel = this.getOneRel(type, relKey);
      const rev = this.getOneRel(rel.model, rel.reverse);
      const getterFunc = this.getGetterFunc(type, relKey, rel, rev);
      return getterFunc.call(this, record, rel.model);
    },

    findAllRelatees: function(type, record) {
      const rels = this.getAllRels(type);
      const relKeys = Object.keys(rels);
      return Promise.map(relKeys, relKey => this.findRelatees(type, record, relKey))
      .then(results => {
        return results.reduce((carry, resultItem, index) => {
          carry[relKeys[index]] = resultItem;
          return carry;
        }, {});

      })
    },

    findRelateesMulti: function(type, records, relKey) {
      const rel = this.getOneRel(type, relKey);
      const rev = this.getOneRel(rel.model, rel.reverse);
      const getterFunc = this.getGetterFuncMulti(type, relKey, rel, rev);
      return getterFunc.call(this, records, rel.model);
    },

    findAllRelateesMulti: function(type, records) {
      const rels = this.getAllRels(type);
      const relKeys = Object.keys(rels);
      return Promise.map(relKeys, relKey => this.findRelateesMulti(type, records, relKey))
      .then(results => {
        console.log(results, relKeys);
        return results.reduce((carry, resultItem, index) => {
          carry[relKeys[index]] = resultItem;
          return carry;
        }, {});
      })
    }
  }
};