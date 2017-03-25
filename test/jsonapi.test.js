const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect();
// const queryParams = require('../jsonapi');
const {
  extractTableAndType,
  getExtractReqRelationships
} = require('../jsonapi-middlewares');

const reqEmptyParams = { params: {} };
const reqTableOnly = { params: { table: 'users' } };
const reqTableOnlyDashed = { params: { table: 'car-makes' } };
const reqTableBadId = { params: { table: 'users', id: 'foo' } };
const reqTableGoodId = { params: { table: 'car-makes', id: '5' } };

describe('JSON API', () => {
	
	it('processPayloadRelationships', done => {
    const relationshipsMap = {
      users: {
        address: {
          table: 'addresses',
          type: 'belongsTo',
          reverse: 'owner'
        },
        booksAuthored: {
          table: 'books',
          type: 'hasMany',
          reverse: 'author'
        },
        booksOwned: {
          table: 'books',
          type: 'hasMany',
          reverse: 'owners'
        }
      },
      addresses: {
        owner: {
          table: 'users',
          type: 'belongsTo',
          reverse: 'address'
        }
      },
      books: {
        author: {
          table: 'users',
          type: 'belongsTo',
          reverse: 'booksAuthored'
        },
        owners: {
          table: 'users',
          type: 'hasMany',
          reverse: 'booksOwned'
        }
      }
    };
    const extractReqRelationships = getExtractReqRelationships(relationshipsMap);
    const body = {
      data: {
        type: 'users',
        attributes: { firstName: 'John', lastName: 'Doe' },
        relationships: {
          address: { data: {
            type: 'addresses', id: "17"
          } },
          'books-authored': { data: [
            { type: 'books', id: "5" }, { type: 'books', id: "7" }
          ] },
          'books-owned': { data: [
            { type: 'books', id: "2" },
            { type: 'books', id: "7" },
            { type: 'books', id: "10" },
            { type: 'books', id: "12" }
          ] },
        }
      }
    };
    const req = httpMocks.createRequest({
        method: 'POST',
        url: '/api/v1/users',
        params: {
          table: 'users'
        },
        body
    });
    const res = httpMocks.createResponse();
    extractTableAndType(req, res, function() {
      extractReqRelationships(req, res, function(err) {
        if(err) {
          return done(err);
        }
        req.body.data.attributes.should.deep.equal({
          firstName: 'John', lastName: 'Doe'
        });
        req.body.data.relationshipAttributes.should.deep.equal({
          addressId: 17
        });
        req.body.data.allAttributes.should.deep.equal({
          firstName: 'John', lastName: 'Doe', addressId: 17
        });
        req.body.data.deferredRelationships.should.deep.equal({
          books_users_owners: {
            ids: [2, 7, 10, 12],
            relateeTable: 'books',
            thisFirst: false
          }
        });

        done();
      });
    })

	});

});