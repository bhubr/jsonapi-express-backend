module.exports = function(store) {
  return {
    serial: store.attr('string'),
    owner: store.belongsTo('user')
  };
};