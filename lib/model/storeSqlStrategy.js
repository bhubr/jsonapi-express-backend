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
      .then(records => (records.length > 0 ?
        Object.assign({}, records[0]) : false
      ));
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
          // console.log('#record1', record1, rel.reverse + 'Id')
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
          .then(relateeIds => (relateeIds.length > 0 ?
            this.findRecordsIn(rel.model, relateeIds) : []
          ));
        }
      };
      return map[mapKey];
    },

    getGetterFuncMulti: function(type, relKey, rel, rev) {
      const relType1 = rel.type;
      const relType2 = rev.type;
      const mapKey = relType1 + '.' + relType2;
      const map = {
        'hasMany.belongsTo': function(records, relateeType) {
          const recordIds = _.map(records, 'id');
          const table = this.mapType(rel.model);
          const reverseId = rel.reverse + 'Id';
          const query = queryBuilder.selectRelateesIn(table, reverseId, recordIds);
          const relKebabPlural = naming.toKebabPlural(rel.model);
          // console.log(records, relateeType, relKebabPlural, query);
          return queryAsync(query)
          .then(relatees => (_.groupBy(relatees, reverseId)))
          .then(grouped => {
            const ksKey = _.kebabCase(rev.reverse);
            return records.map(record => {
              const relatees = grouped[record.id] || [];
              record._rel[ksKey] = relatees.map(
                relatee => ({
                  id: relatee.id,
                  type: relKebabPlural
                })
              );
              return record;
            })
          });
        },
        'belongsTo.belongsTo': function(records, relateeType) {
          const ksKey = _.kebabCase(rev.reverse);
          return Promise.resolve(
            records.map(record => {
              record._rel[ksKey] = {
                id: record[relKey + 'Id'],
                type: naming.toKebabPlural(rel.model)
              }
              return record;
            })
          );
        },
        'belongsTo.hasMany': function(records, relateeType) {
          const recordIds = records.map(record => (record.id));
          const thisKey = rev.reverse + 'Id';
          const allRelateeIds = _.map(records, thisKey);
          const table = this.mapType(rel.model);
          const relateeIds = _.filter(allRelateeIds, key => (!! key));
          const query = queryBuilder.selectRelateesIn(table, 'id', relateeIds);
          const ksKey = _.kebabCase(rev.reverse);
          return queryAsync(query)
          .then(relatees => {
            _.each(records, rec => {
              const relatee = _.find(relatees, {
                id: rec[thisKey]
              });
              rec._rel[ksKey] = relatee ? {
                id: relatee.id,
                type: naming.toKebabPlural(rel.model)
              } : null;
            })
            // console.log(_.map(records, '_rel'))
            return records;
          });
        },
        'hasMany.hasMany': function(records, relateeType) {
          const recordIds = records.map(record => (record.id));
          const { pivotTable, thisFirst } = naming.getPivotTable(type, relKey, rel, rev);
          // let query = {};
          // query[type + 'Id'] = record1.id;
          const [fieldId1, fieldId2] = utils.getIdFields(thisFirst, type, rel.model);
          console.log('hasMany.hasMany', fieldId1, fieldId2);
          const query = queryBuilder.selectRelateesIn(pivotTable, fieldId1, recordIds);
          const relKebabPlural = naming.toKebabPlural(rel.model);
          const ksKey = _.kebabCase(rev.reverse);
          return queryAsync(query)
          .then(pivotEntries => (_.groupBy(pivotEntries, fieldId1)))
          .then(grouped => {
            return records.map(record => {
              const relatees = grouped[record.id] || [];
              record._rel[ksKey] = relatees.map(
                relatee => ({
                  id: relatee[fieldId2],
                  type: relKebabPlural
                })
              );
              // console.log(record._rel);
              return record;
            })
          })
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
      return getterFunc.call(this, record, rel.model)
      .catch(err => {
        console.log('## findRelatees err', type, record, relKey);
        throw err;
      });
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
      _.each(records, rec => {
        rec._rel = {};
      });
      return relKeys.length === 0 ? Promise.resolve(records) :
        Promise.map(relKeys, relKey => this.findRelateesMulti(type, records, relKey))
        .then(results => (results.pop()));
    }
  }
};