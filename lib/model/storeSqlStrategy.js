const queryBuilder = require('../queryBuilder');
const naming = require('../naming');

module.exports = function(modelDescriptors, modelRelationships, queryAsync) {
  return {

    typeToTableMap: {},

    init: function() {
      const modelKeys = Object.keys(modelDescriptors);
      modelKeys.forEach(camelSingular => {
        this.typeToTableMap[camelSingular] = naming.toTableName(camelSingular, true);
      })
      // console.log('init', modelDescriptors, modelKeys, this.typeToTableMap);
    },

    mapType: function(type) {
      const table = this.typeToTableMap[type];
      if (!table) {
        throw new Error("Did not find table for type '" + type + "'");
      }
      return table;
    },

    getRel: function(type, relKey) {
      return modelRelationships[type][relKey];
    },

    createRecord: function(type, attributes) {
      const table = this.mapType(type);
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
        console.log('storeSqlStrategy.findAll', type, records.map(r => (r.id)));
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

    findRecordBy: function(type, where, multi) {
      const table = this.mapType(type);
      const selectQuery = queryBuilder.selectWhere(table, where);
      return queryAsync(selectQuery)
      .then(records => (!! multi ? records :
        (records.length ? records[0] : false)));
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

    getGetterFunc: function(rel, rev) {
      // const that = this;
      const relType1 = rel.type;
      const relType2 = rev.type;
      const mapKey = relType1 + '.' + relType2;
      const map = {
        'hasMany.belongsTo': function(ownerId, relateeType) {
          let query = {};
          query[rel.reverse + 'Id'] = ownerId;
          console.log(this.findRecordBy.toString(), query);
          return this.findRecordBy(relateeType, query, true);
        }
      }
      return map[mapKey];
    },

    findRelatees: function(type, id, relKey) {
      // const table = this.mapType(type);
      // console.log(type, modelRelationships[type], relKey, modelRelationships[type][relKey]);
      const rel = this.getRel(type, relKey);
      const rev = this.getRel(rel.model, rel.reverse);
      console.log(rel, rev);
      const getterFunc = this.getGetterFunc(rel, rev);
      console.log(getterFunc.toString());
      return getterFunc.call(this, id, rel.model);
    }
  }
};