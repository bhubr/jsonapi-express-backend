const squel = require("squel");

function selectAll(table) {
  return squel.select()
  .from(table)
  .field('*')
  .toString();
}

function selectOne(table, id) {
  return squel.select()
  .from(table)
  .field('*')
  .where("id = ?", id)
  .toString();
}

function insert(table, attributes) {
  attributes = Array.isArray(attributes) ? attributes : [attributes];
  return squel.insert()
    .into(table)
    .setFieldsRows(attributes)
    .toString();
}

// describe('squel query', () => {
  
// 	it('should build a select query', () => {
// 		const sql = 
//     sql.should.equal('SELECT * FROM table');
// 	});

//   it('should build an insert query', () => {
//     const sql = create('users', { email: 'bh@localhost.local', order: 1, password: '###bloody#hash', createdAt: '2017-02-27' });
//     console.log(sql);
//   });

// });

module.exports = { selectAll, selectOne, insert };