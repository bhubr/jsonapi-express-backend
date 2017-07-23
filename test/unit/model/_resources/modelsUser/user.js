module.exports = function(store) {
  return {
    name: store.attr('string'),
    passport: store.belongsTo('passport', { isOwner: true })
  };
};