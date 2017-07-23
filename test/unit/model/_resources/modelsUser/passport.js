module.exports = function(store) {
  return {
    id: store.attr('string'),
    owner: store.belongsTo('user')
  };
};