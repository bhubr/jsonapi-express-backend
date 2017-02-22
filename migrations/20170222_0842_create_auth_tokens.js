module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable(
      'auth_tokens',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        createdAt: {
          type: Sequelize.DATE
        },
        updatedAt: {
          type: Sequelize.DATE
        },
        value: {
          type: Sequelize.TEXT
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
        }
      }
    );
  },
 
  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
}