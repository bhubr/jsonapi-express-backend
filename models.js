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
// For Roles&Permissions
// https://raw.githubusercontent.com/sendyhalim/dignity/master/test/models/sequelize-models/index.js
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

User.getRoleModel = function () {
  return Role;
};


var Role = sequelize.define('roles', {
  name: Sequelize.STRING
}, {
  tableName: 'roles',
  timestamps: false,
});
Role.getPermissionModel = function () {
  return Permission;
};


var Permission = sequelize.define('permissions', {
  name: Sequelize.STRING,
  displayName: Sequelize.STRING
}, {
  tableName: 'permissions',
  timestamps: false
});

var UsersRoles = sequelize.define('users_roles', {
  userId: Sequelize.INTEGER,
  roleId: Sequelize.INTEGER
}, {
  tableName: 'users_roles',
  timestamps: false
});

var RolesPermissions = sequelize.define('roles_permissions', {
  roleId: Sequelize.INTEGER,
  permissionId: Sequelize.INTEGER
}, {
  tableName: 'roles_permissions',
  timestamps: false
});

User.belongsToMany(Role, {
  through: UsersRoles,
  foreignKey: 'userId'
});

Role.belongsToMany(User, {
  through: UsersRoles,
  foreignKey: 'roleId'
});

Role.belongsToMany(Permission, {
  through: RolesPermissions,
  foreignKey: 'roleId'
});

Permission.belongsToMany(Role, {
  through: RolesPermissions,
  foreignKey: 'permissionId'
});

module.exports = {
  User, Role, Permission
};
