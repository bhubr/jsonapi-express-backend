module.exports = function(store) {
  return {
    dummy: store.attr('string'),
    owner: store.belongsTo('user')
  }
};