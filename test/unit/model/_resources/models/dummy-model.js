module.exports = function(store) {
  return {
    _tableName: store.meta('dummies'),
    dummy: store.attr('string', {
      required: true
    })
  };
};