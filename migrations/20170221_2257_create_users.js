module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable(
      'users',
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
        firstName: Sequelize.STRING,
        lastName: Sequelize.STRING,
        email: Sequelize.STRING,
        password: Sequelize.STRING,
      }
    );
  },
 
  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
}