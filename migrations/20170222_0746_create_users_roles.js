module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable(
      'users_roles',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        //foreign key usage
        userId: {
            type: Sequelize.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
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
        }
      }
    );
  },
 
  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
}