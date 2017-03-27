const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const utils = require('../utils');

const kebabedAttributes = {
	'an-attr': 'foo',
	'another-attr': 'bar'
};
const lowerCamelAttributes = {
  anAttr: 'foo', anotherAttr: 'bar'
};

describe('utils', () => {
	
	it('lowerCamelAttributes', () => {
		const lowerCamelized = utils.lowerCamelAttributes(kebabedAttributes);
		lowerCamelized.should.deep.equal({
			anAttr: 'foo', anotherAttr: 'bar'
		});
	});

  it('snakeAttributes', () => {
    const snaked = utils.snakeAttributes(kebabedAttributes);
    snaked.should.deep.equal({
      an_attr: 'foo', another_attr: 'bar'
    });
  });

  it('kebabAttributes', () => {
    const kebabed = utils.kebabAttributes(lowerCamelAttributes);
    kebabed.should.deep.equal(kebabedAttributes);
  });

  it('extractFirstRecord', () => {
    const record = utils.extractFirstRecord([{ id: 1, attr: 'foo', name: 'bar' }]);
    record.should.deep.equal({ id: 1, attr: 'foo', name: 'bar' });
  });

  it('mapRecords', () => {
    const records = [
      { id: 1, firstName: 'Foo', lastName: 'Baz' },
      { id: 2, firstName: 'Bar', lastName: 'Baz' }
    ];
    const mapRecords = utils.getMapRecords('dummies');
    const mapped = mapRecords(records);
    mapped.should.deep.equal([
      { id: 1, type: 'dummies', attributes: { 'first-name': 'Foo', 'last-name': 'Baz'} },
      { id: 2, type: 'dummies', attributes: { 'first-name': 'Bar', 'last-name': 'Baz'} }
    ]);
  });

  it('mapRecord', () => {
    const record = { id: 1, firstName: 'Foo', lastName: 'Baz' };
    const mapRecord = utils.getMapRecord('dummies');
    const mapped = mapRecord(record);
    mapped.should.deep.equal({ id: 1, type: 'dummies', attributes: { 'first-name': 'Foo', 'last-name': 'Baz'} });
  });

  it('stripRelAttributes', () => {
    const relAttributes = {
      author: 3,
      comments: [4, 7, 9]
    };
    const stripRelAttributes = utils.getStripRelAttributes(relAttributes);
    const record = {
      id: 1,
      author: 3,
      comments: [4, 7, 9],
      title: 'A blog post',
      content: 'Very interesting stuff'
    };
    const stripped = stripRelAttributes(record);
    record.should.deep.equal({ id: 1, title: 'A blog post', content: 'Very interesting stuff' });
  });
});