module.exports = function(store) {
  return {
    _primaryKey: store.meta('ID'),
    bar: store.attr('string', { readable: false, writable: false }),
    foo: store.belongsTo('foo')
  };
};