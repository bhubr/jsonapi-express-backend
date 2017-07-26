module.exports = function(store) {
  return {
    name: store.attr('string'),
    // users: store.hasMany('user', { inverse: 'groups' }),
    // owner: store.belongsTo('user', { inverse: 'ownedGroups' })
  }
};