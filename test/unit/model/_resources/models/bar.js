module.exports = function(store) {
  return {
    _primaryKey: store.meta('ID'),
    bar: store.attr('string', { unique: true, readable: false, writable: false }),
    foo: store.belongsTo('foo')
  };
};