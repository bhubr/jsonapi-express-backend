module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable(
      'roles_permissions',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        //foreign key usage
        roleId: {
            type: Sequelize.INTEGER,
            references: {
                model: 'roles',
                key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        //foreign key usage
        permissionId: {
            type: Sequelize.INTEGER,
            references: {
                model: 'permissions',
                key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        }
      }
    );
  },
 
  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
}