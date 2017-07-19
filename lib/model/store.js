module.exports = function(modelDescriptors) {
  return {

    strategy: null,

    setStrategy: function(strategy) {
      this.strategy = strategy;
      this.strategy.init();
    },

    createRecord: function(type, attributes) {
      return this.strategy.createRecord(type, attributes);
    },

    findAll: function(type) {
      return this.strategy.findAll(type);
    },

    findRecord: function(type, id) {
      return this.strategy.findRecord(type, id);
    },

    findRecordsIn: function(type, ids) {
      return this.strategy.findRecordsIn(type, ids);
    },

    findRecordBy: function(type, where, multi) {
      return this.strategy.findRecordBy(type, where, multi);
    },

    updateRecord: function(type, id, attributes) {
      return this.strategy.updateRecord(type, id, attributes);
    },

    deleteRecord: function(type, id) {
      return this.strategy.deleteRecord(type, id);
    },

    getAllRels: function(type) {
      return this.strategy.getAllRels(type);
    },

    findRelatees: function(type, id, relKey) {
      return this.strategy.findRelatees(type, id, relKey);
    },

    findAllRelatees: function(type, id) {
      return this.strategy.findAllRelatees(type, id);
    },

    findAllRelateesMulti: function(type, records) {
      return this.strategy.findAllRelateesMulti(type, records);
    }
  };
}
