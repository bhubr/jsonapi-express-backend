const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const queryParams = require('../lib/queryParams');

const reqEmptyParams = { params: {} };
const reqPluralOnly = { params: { kebabPlural: 'users' } };
const reqPluralOnlyDashed = { params: { kebabPlural: 'car-makes' } };
const reqPluralBadId = { params: { kebabPlural: 'users', id: 'foo' } };
const reqPluralGoodId = { params: { kebabPlural: 'car-makes', id: '5' } };

describe('queryParams', () => {
	
	it('extract should throw if no table is passed', () => {
    try {
      queryParams.extract(reqEmptyParams);
    } catch(e) {
      e.message.should.equal('kebabPlural param is undefined');
    }
	});

  it('extract should return table name, kebab plural, camel singular names', () => {
    const res = queryParams.extract(reqPluralOnly);
    res.tableName.should.exist;
    res.tableName.should.equal('users');
    res.kebabPlural.should.exist;
    res.kebabPlural.should.equal('users');
    res.camelSingular.should.exist;
    res.camelSingular.should.equal('user');
  });

  it('extract should return snake-cased table name', () => {
    const res = queryParams.extract(reqPluralOnlyDashed);
    res.tableName.should.exist;
    res.tableName.should.equal('car_makes');
    res.kebabPlural.should.exist;
    res.kebabPlural.should.equal('car-makes');
    res.camelSingular.should.exist;
    res.camelSingular.should.equal('carMake');
  });

  it('extract should throw if bad id is passed', () => {
    try {
      queryParams.extract(reqPluralBadId);
    } catch(e) {
      e.message.should.equal('id foo is NaN');
    }
  });

  it('extract should return table and id', () => {
    const res = queryParams.extract(reqPluralGoodId);
    res.tableName.should.exist;
    res.tableName.should.equal('car_makes');
    res.kebabPlural.should.exist;
    res.kebabPlural.should.equal('car-makes');
    res.camelSingular.should.exist;
    res.camelSingular.should.equal('carMake');
    res.id.should.exist;
    res.id.should.equal(5);
  });

});