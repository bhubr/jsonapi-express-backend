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


// class Token extends Model {
//   static belongsTo = {
//     user: {
//       inverse: 'tokens'
//     }
//   };

//   static scopes = {
//     findByValue(value) {
//       return this.first().where({ value })
//       .then(token => {
//         if (token === undefined) return false;
//         return new Promise((resolve, reject) => {
//           jwt.verify(value, publicKey.toString(), { algorithm: 'RS256'}, function(err, decoded) {
//             if(err) resolve(false);
//             resolve(token.rawColumnData.userId);
//           });
//         });
//       });
//     }
//   };

//   static async generate(email, userId) {
//     // sign with RSA SHA256
//     const exp = Math.floor(Date.now() / 1000) + (60 * 60);
//     return new Promise((resolve, reject) => {
//       jwt.sign({ email, exp }, privateKey.toString(), { algorithm: 'RS256'}, function(err, token) {
//         if(err) reject(err);
//         resolve(token);
//       });
//     })
//     .then(value => this.create({ value, userId }));
//   }

//   static async findValid(value) {
//     console.log('findValid', value);
//     const token = await this.findByValue(value);
//     return token;
//   }

// }

// export default Token;

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
    timestamps: true,
    instanceMethods: {
      getPermissions: function() {
        let permissions = [];
        return this.getRoles()
        .then(roles => Promise.map(roles, role => (role.getPermissions())))
        .then(rolesPermissions => {
          rolesPermissions.forEach(rolePermissions => {
            rolePermissions.forEach(permission => {
              permissions.push(permission.dataValues.name);
            })
          });
          this._permissions = permissions;
          return this;
        });
      },
      // afterCreate: function() {}
    }
  }
);

function passLog(label) {
  return function(data) {
    console.log(label, data);
    return data;
  }
}
User.beforeCreate = function(attributes) {
  return new Promise((resolve, reject) => {
    return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
    .then(salt => bcrypt.hashAsync(attributes.password, salt))
    .then(hash => {
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

// User.hasMany(AuthToken);

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
