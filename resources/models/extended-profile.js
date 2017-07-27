module.exports = function(store) {
  return {
    phone: store.attr('string'),
    address: store.attr('string'),
    twitterUrl: store.attr('string', { required: true }),
    facebookUrl: store.attr('string'),
    linkedinUrl: store.attr('string'),
    owner: store.belongsTo('user')
  }
};