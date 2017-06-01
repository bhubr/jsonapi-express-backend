const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const naming = require('../lib/naming');

describe('naming', () => {
  
  it('pivot table post <=> tag', () => {
    const { pivotTable, thisFirst } = naming.getPivotTable(
      'post', 'tags',
      { model: 'tag', type: 'hasMany', reverse: 'posts' },
      { model: 'post', type: 'hasMany', reverse: 'tags' }
    );
    pivotTable.should.equal('post_tag_tags');
  });

  it('pivot table user <=> user (followee-follower)', () => {
    const { pivotTable, thisFirst } = naming.getPivotTable(
      'user', 'followers',
      { model: 'user', type: 'hasMany', reverse: 'followees' },
      { model: 'user', type: 'hasMany', reverse: 'followers' }
    );
    pivotTable.should.equal('user_user_followers');
  });


});