const lineLogger = require('console-line-logger');
const should = require('chai').should();
const squel = require("squel");

function create(table, attributes) {
  return squel.insert()
    .into(table)
    .setFieldsRows([
        attributes
    ])
    .toString();
}

describe('squel query', () => {
	
	it('should build a select query', () => {
		const sql = squel.select()
	    .from("table")
	    .field('*')
	    .toString();
    sql.should.equal('SELECT * FROM table');
	});

  it('should build an insert query', () => {
    const sql = create('users', { email: 'bh@localhost.local', order: 1, password: '###bloody#hash', createdAt: '2017-02-27' });
    lineLogger(sql);
  });

});