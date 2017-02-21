var Sequelize = require('sequelize');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var sequelize = new Sequelize('lux_socnet_dev', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
});
const SALT_WORK_FACTOR = 10;

var User = sequelize.define('user', {
    firstName: {
      type: Sequelize.STRING
    },
    lastName: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    }
  },
  {
  timestamps: true
  }
);

User.beforeCreate = function(attributes) {
  return new Promise((resolve, reject) => {
    return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
    .then(salt => bcrypt.hashAsync(attributes.password, salt))
    .then(hash => {
      console.log('hash', attributes.password, '=>', hash);
      resolve(Object.assign(attributes, { password: hash }));
    })
    .catch(reject);
  });
}

module.exports = { User };