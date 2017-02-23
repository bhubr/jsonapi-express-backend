module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable(
      'rides',
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
        departure: Sequelize.STRING,
        arrival: Sequelize.STRING,
        date: Sequelize.DATE
      }
    );
  },
 
  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
}