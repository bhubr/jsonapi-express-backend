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

function selectRelatees(table, relateeKey, relateeId) {
  return squel.select()
  .from(table)
  .field('*')
  .where(relateeKey + " = ?", relateeId)
  .toString();
}


// function selectMany(table, ids) {
//   const idsString = ids.join(',');
//   return squel.select()
//   .from(table)
//   .field('*')
//   .where("id IN ?", idsString)
//   .toString();
// }


function getSelectOne(table) {
  return id => {
    return squel.select()
    .from(table)
    .field('*')
    .where("id = ?", id)
    .toString();
  }
}

function getInsert(table) {
  return attributes => {
    attributes = Array.isArray(attributes) ? attributes : [attributes];
    return insert(table, attributes);
  }
}

function insert(table, attributes) {
  attributes = Array.isArray(attributes) ? attributes : [attributes];
  return squel.insert()
  .into(table)
  .setFieldsRows(attributes)
  .toString();
}

function updateOne(table, id, attributes) {
  return squel.update()
    .table(table)
    .setFields(attributes)
    .where('id = ' + id)
    .toString();
}

function getUpdateOne(table, id) {
  return attributes => updateOne(table, id, attributes);
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

module.exports = { selectAll, selectOne, selectRelatees, getSelectOne, insert, getInsert, updateOne, getUpdateOne };