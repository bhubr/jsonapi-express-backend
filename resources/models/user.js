module.exports = function(store) {
  return {
    _primaryKey: store.meta('ID'),
    email: store.attr('string'),
    username: store.attr('string', { forbiddenAttr: 'VALUE', required: true }),
    password: store.attr('string'),
    ownedGroups: store.hasMany('group', { inverse: 'owner' }),
    groups: store.hasMany('group', { inverse: 'users' }),
    dummyModels: store.hasMany('dummyModel')
  }
};