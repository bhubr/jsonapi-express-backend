const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const queryParams = require('../queryParams');

const reqEmptyParams = { params: {} };
const reqTableOnly = { params: { table: 'users' } };
const reqTableBadId = { params: { table: 'users', id: 'foo' } };
const reqTableGoodId = { params: { table: 'users', id: '5' } };

describe('queryParams', () => {
	
	it('tableOnly should throw if no table is passed', () => {
    try {
      queryParams.tableOnly(reqEmptyParams);
    } catch(e) {
      e.message.should.equal('table param is undefined');
    }
	});

  it('tableOnly should return table', () => {
    const res = queryParams.tableOnly(reqTableOnly);
    res.table.should.exist;
    res.table.should.equal('users');
  });

  it('tableAndId should throw if no table is passed', () => {
    try {
      queryParams.tableAndId(reqEmptyParams);
    } catch(e) {
      e.message.should.equal('table param is undefined');
    }
  });

  it('tableAndId should throw if no id is passed', () => {
    try {
      queryParams.tableAndId(reqTableOnly);
    } catch(e) {
      e.message.should.equal('id undefined is NaN');
    }
  });

  it('tableAndId should throw if bad id is passed', () => {
    try {
      queryParams.tableAndId(reqTableBadId);
    } catch(e) {
      e.message.should.equal('id foo is NaN');
    }
  });

  it('tableAndId should return table and id', () => {
    const res = queryParams.tableAndId(reqTableGoodId);
    res.table.should.exist;
    res.id.should.exist;
    res.table.should.equal('users');
    res.id.should.equal(5);
  });

  it('tableAndId should be callable with direct table and id args', () => {
    const res = queryParams.tableAndId('users', 5);
    res.table.should.exist;
    res.id.should.exist;
    res.table.should.equal('users');
    res.id.should.equal(5);
  });

});