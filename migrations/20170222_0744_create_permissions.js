module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable(
      'permissions',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: Sequelize.STRING,
        displayName: Sequelize.STRING
      }
    );
  },
 
  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
}