module.exports = function(store) {
  return {
    _primaryKey: store.meta('ID'),
    foo: store.attr('string'),
    bars: store.hasMany('bar')
  };
};