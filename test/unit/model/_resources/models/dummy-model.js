module.exports = function(store) {
  return {
    _tableName: store.meta('dummy_models'),
    dummy: store.attr('string', {
      required: true
    })
  };
};