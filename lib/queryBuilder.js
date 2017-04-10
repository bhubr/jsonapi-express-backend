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

function selectWhere(table, where) {
  let query = squel.select()
  .from(table)
  .field('*');
  for (var key in where) {
    query = query.where(key + ' = ?', where[key]);
  }
  return query.toString();
}

function deleteWithId(table, id, idKey) {
  idKey = idKey !== undefined ? idKey : 'id';
  return squel.delete()
  .from(table)
  .where(idKey + " = ?", id)
  .toString();
}

function selectIn(table, ids) {
  const idsString = ids.join(',');
  return squel.select()
  .from(table)
  .field('*')
  .where("id IN (" + idsString + ")")
  .toString();
}

function selectRelatees(table, relateeKey, relateeId) {
  return squel.select()
  .from(table)
  .field('*')
  .where(relateeKey + " = ?", relateeId)
  .toString();
}

function selectRelateesIn(table, relateeKey, relateeIds) {
  const idsString = relateeIds.join(',');
  return squel.select()
  .from(table)
  .field('*')
  .where(relateeKey + " IN (" + idsString + ")")
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
  return squel.insert({ replaceSingleQuotes: true })
  .into(table)
  .setFieldsRows(attributes)
  .toString();
}

function updateOne(table, id, attributes) {
  return squel.update({ replaceSingleQuotes: true })
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

module.exports = { selectAll, selectOne, selectIn, selectWhere, selectRelatees, selectRelateesIn, getSelectOne, insert, getInsert, updateOne, getUpdateOne, deleteWithId };