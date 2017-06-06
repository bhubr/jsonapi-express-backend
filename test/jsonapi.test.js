const chai = require('chai');
const httpMocks = require('node-mocks-http');
const should = chai.should();
const expect = chai.expect;
const chain = require('store-chain');
const Promise = require('bluebird');
const _ = require('lodash');

let api;
const fakers = require('./fakers');
const utils = require('../lib/utils');
const db = require('./dbTools');

function ts() {
  return ((new Date()).getTime()).toString(36)
    + (Math.ceil(100000 * Math.random())).toString(36); 
}

describe('JSON API requests', () => {

  // http://stackoverflow.com/questions/18654563/running-a-set-of-actions-before-every-test-file-in-mocha
  before(function () {
    process.env.NODE_ENV = 'test';
    const app = require('../resources/test-server.js');
    api = require('./apiRequest')(app);
  });
	
  it('creates a user', () => {
    const payload = fakers.getUserPayload();
    const { email } = payload.attributes;
    return api.post('/api/v1/users', payload)
    // .then(res => { console.log(res.body) })
    .expect(200)
    .then(res => {
      const { data } = res.body;
      const { id, type, attributes } = data;
      expect(data).to.not.be.undefined;
      expect(attributes).to.not.be.undefined;
      expect(type).to.equal('users');
      expect(attributes.email).to.equal(email);
      expect(Number.isInteger(id)).to.be.true;
    });
  });

  
  it('creates a user then signs in', () => {
    const payload = fakers.getUserPayload();
    const { email } = payload.attributes;
    return chain(api.post('/api/v1/users', payload))
    .then(res => (res.body.data.id))
    .set('userId')
    .then(() => api.post('/api/v1/signin', payload))
    .then(res => {
      const { data } = res.body;
      const { id, type, attributes } = data;
      expect(data).to.not.be.undefined;
      return data;
    })
    .set('data')
    .get(({ userId, data}) => {
      expect(data.userId).to.equal(userId);
      expect(data.jwt).to.not.be.undefined;
    });
  });

  it('creates a user, and attempts to modify it', () => {
    let userId;
    let email;
    return api.signupAndLogin()
    .then(data => {
      userId = data.userId;
      email = 'm.em' + ts() + '@example.com';
      // console.log('## created user', userId);
      return api.put(
        '/api/v1/users/' + data.userId,
        { id: data.userId, type: 'users', attributes: { email } },
        data.jwt
      )
      // .then(res => { console.log('## expect err', res.body) })
      .expect(200);
    })
    .then(() => api.get('/api/v1/users/' + userId)
      
      .expect(200)
    )
    .then(res => {
      const { attributes } = res.body.data;
      expect(attributes.email).to.equal(email);
    });
  });

  it('creates two users, first attempts to modify second but *fails*', () => {
    return Promise.all([
      api.signupAndLogin(),
      api.signupAndLogin()
    ])
    .then(([data1, data2]) => api.put(
      '/api/v1/users/' + data2.userId,
      { id: data2.userId, type: 'users', attributes: { email: 'hacked.email' + ts() + '@example.com' } },
      data1.jwt
    ).expect(403));
  });

  it('creates a user, then a post', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getPostPayload(userId))
    .set('payload')
    .get(({ credentials, payload}) =>
      api.post('/api/v1/posts', payload, credentials.jwt)
      .expect(200)
    )
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });


  it('creates a user, then a post, then post meta, comments, tags', () => {
    // Prepare variables and data
    let userId;
    let jwt;
    let userId2;
    let jwt2;
    let postId;
    let postId2;
    let comments1ids;
    let comments2ids;
    let tags1ids;
    let tags2ids;
    const comments1 = [
      { commentText: 'Lorem ipsum blah blah', authorEmail: 'dummy@example.com' },
      { commentText: 'Another dummy comment', authorEmail: 'foobar@example.com' },
      { commentText: 'Yet another dumb comment', authorEmail: 'johndoe@example.com' }
    ];
    const comments2 = [
      { commentText: '1st of 2nd batch of comments', authorEmail: 'johndifool@example.com' },
      { commentText: '2nd of 2nd batch of comments', authorEmail: 'foobar@example.com' }
    ];
    const tags1 = [
      { name: 'jsonapi', color: '#fff' },
      { name: 'nodejs', color: '#abc' },
      { name: 'javascript', color: '#dd7' }];
    const tags2 = [
      { name: 'mysql', color: '#efc' },
      { name: 'promises', color: '#cda' }
    ];
    const postMeta = {
      'meta-value': JSON.stringify({ some: 'data', foo: 'bar'})
    };
    let postMetaId;

    // 1. Create a user
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getPostPayload(userId))
    .set('payload')
    .get(({ credentials }) => {
      userId = credentials.userId;
      jwt = credentials.jwt;
    })
    // 2. Create a post
    .get(({ credentials, payload}) =>
      api.post('/api/v1/posts', payload, credentials.jwt)
      .expect(200)
    )
    .then(res => {
      const { relationships, attributes, id, type } = res.body.data;
      postId = id;
      expect(type).to.equal('posts');
      expect(relationships.author.data.id).to.equal(userId);
      return id;
    })
    .set('post1id')
    // 3. Create a 2nd post
    .get(({ credentials, payload}) =>
      api.post('/api/v1/posts', fakers.getPostPayload(credentials.userId), credentials.jwt)
      .expect(200)
    )
    .then(res => (res.body.data.id))
    .set('post2id')
    // 4. Create comments for 1st post
    .get(({ post1id }) => _.map(comments1, attrs => fakers.mapToPayload(
      'post-comments', attrs, [{ key: 'post', type: 'posts', id: post1id }]
    )))
    .then(payloads => Promise.map(payloads,
      payload => api.post('/api/v1/post-comments', payload, jwt)
      .expect(200)
    ))
    .then(results => _.map(results, 'body.data'))
    .then(datas => {
      comments1ids = _.map(datas, 'id');
      // console.log(comments1ids);
      datas.forEach((data, index) => {
        const relData = data.relationships.post.data;
        expect(Number.isInteger(data.id)).to.be.true;
        expect(data.type).to.equal('post-comments');
        expect(data.attributes['comment-text']).to.equal(comments1[index].commentText);
        expect(data.attributes['author-email']).to.equal(comments1[index].authorEmail);
        expect(Number.isInteger(relData.id)).to.be.true;
        expect(relData.type).to.equal('posts');
      })
      return _.map(datas, 'id');
    })
    .set('comments1ids')
    .then(_comments1ids => { comments1ids = _comments1ids; })
    .get(({ post1id }) => _.map(tags1, attrs => fakers.mapToPayload(
      'tags', attrs, [{ key: 'posts', type: 'posts', id: [post1id] }]
    )))
    // 5. Create tags linked to 1st post
    .then(payloads => Promise.map(payloads,
      payload => api.post('/api/v1/tags', payload, jwt)
      .expect(200)
    ))
    .then(results => _.map(results, 'body.data'))
    .then(datas => {
      tags1ids = _.map(datas, 'id');
      // console.log('#tag1ids (linked to post 1)', tags1ids);
      datas.forEach((data, index) => {
        expect(Number.isInteger(data.id)).to.be.true;
        expect(data.type).to.equal('tags');
        expect(data.attributes.name).to.equal(tags1[index].name);
        expect(data.attributes.color).to.equal(tags1[index].color);
      })
      return _.map(datas, 'id');
    })
    .get(({ post1id }) => fakers.mapToPayload(
      'post-metas', postMeta, [{ key: 'post', type: 'posts', id: post1id }])
    )
    .then(payload => api.post('/api/v1/post-metas', payload, jwt).expect(200))
    .then(res => (res.body.data))
    .then(data => {
      expect(Number.isInteger(data.id)).to.be.true;
      expect(data.type).to.equal('post-metas');
      expect(data.attributes['meta-value']).to.equal(postMeta['meta-value']);
      return data.id;
    })
    // .set('postMetaId')
    .then(_postMetaId => { postMetaId = _postMetaId })
    .get(({ post1id }) => api.get('/api/v1/posts/' + post1id, jwt).expect(200))
    .then(res => (res.body.data))
    .then(data => {
      const comments1data = data.relationships.comments.data;
      const tags1data = data.relationships.tags.data;
      expect(comments1data.length).to.equal(comments1.length);
      expect(tags1data.length).to.equal(tags1.length);
    })
    // 6. Create an admin user so that it can update previously created posts
    .then(() => db.createAdmin())
    .then(emailAndPass => api.login(emailAndPass))
    .set('credentials2')
    .get(({ credentials2 }) => {
      userId2 = credentials2.userId;
      jwt2 = credentials2.jwt;
    })
    // 7. Create additionals comments for 1st post
    .get(({ post1id }) => _.map(comments2, attrs => fakers.mapToPayload(
      'post-comments', attrs, [{ key: 'post', type: 'posts', id: post1id }]
    )))
    .then(payloads => Promise.map(payloads,
      payload => api.post('/api/v1/post-comments', payload, jwt)
      .expect(200)
    ))
    .then(results => _.map(results, 'body.data.id'))
    .set('comments2ids')
    .then(_comments2ids => { comments2ids = _comments2ids; })
    .get(({ post1id }) => _.map(tags2, attrs => fakers.mapToPayload(
      'tags', attrs, []
    )))
    .then(payloads => Promise.map(payloads,
      payload => api.post('/api/v1/tags', payload, jwt)
      .expect(200)
    ))
    .then(results => _.map(results, 'body.data.id'))
    .set('tags2ids')
    .then(_tags2ids => { tags2ids = _tags2ids; })
    .get(({ post2id, credentials2 }) => api.put('/api/v1/posts/' + post2id, {
      id: post2id, type: 'posts', attributes: {},
      relationships: {
        author: { data: { type: "users", id: credentials2.userId } },
        comments: { data: [
          { type: "post-comments", id: comments1ids[0] }, 
          { type: "post-comments", id: comments2ids[0] }
        ] },
        meta: { data: { type: "post-metas", id: postMetaId } },
        tags: { data: [
          { type: "tags", id: tags1ids[0] }, 
          { type: "tags", id: tags1ids[1] }, 
          { type: "tags", id: tags2ids[0] }
        ] }
      }
    }, jwt2).expect(200))
    .then(res => (res.body.data))
    .set('postAfterUpdate')
    .get(({ postAfterUpdate, post2id }) => {
      postId2 = post2id;
      const { relationships, attributes, type, id } = postAfterUpdate;
      expect(id).to.equal(post2id);
      expect(type).to.equal('posts');
      expect(relationships.author.data.id).to.equal(userId2);
      expect(relationships.author.data.type).to.equal('users');
      expect(relationships.meta.data.id).to.equal(postMetaId);
      expect(relationships.meta.data.type).to.equal('post-metas');
      expect(relationships.comments.data.length).to.equal(2);
      const commentIds = _.map(relationships.comments.data, 'id');
      expect(commentIds).to.deep.equal([ comments1ids[0], comments2ids[0] ]);
      expect(relationships.tags.data.length).to.equal(3);
      const tagIds = _.map(relationships.tags.data, 'id');
      expect(tagIds).to.deep.equal([ tags1ids[0], tags1ids[1], tags2ids[0] ]);
    })
    .then(() => api.get('/api/v1/post-metas/' + postMetaId, jwt))
    .then(res => (res.body.data))
    .set('updatedPostMeta')
    .get(({ updatedPostMeta, post2id }) => {
      const { id, type, attributes, relationships } = updatedPostMeta;
      // console.log(id, type, attributes, relationships);
      expect(id).to.equal(postMetaId);
      expect(type).to.equal('post-metas');
      expect(JSON.parse(attributes['meta-value'])).to.deep.equal({ some: 'data', foo: 'bar'});
      // console.log(attributes, relationships);
      expect(relationships.post.data.type).to.equal('posts');
      // expect(parseInt(relationships.post.data.id)).to.equal(post2id);
    })
    .then(() => api.get('/api/v1/post-metas/' + postMetaId, jwt))
    .then(res => (res.body.data))
    .set('updatedPostMeta')
    .get(({ updatedPostMeta, post2id }) => {
      // console.log(updatedPostMeta)
      const { id, type, attributes, relationships } = updatedPostMeta;
      // console.log(id, type, attributes, relationships);
      expect(id).to.equal(postMetaId);
      expect(type).to.equal('post-metas');
      expect(JSON.parse(attributes['meta-value'])).to.deep.equal({ some: 'data', foo: 'bar' });
      // console.log(attributes, relationships);
      expect(relationships.post.data.type).to.equal('posts');
      expect(parseInt(relationships.post.data.id)).to.equal(post2id);
    })
    .then(() => api.get('/api/v1/post-comments/' + comments1ids[0], jwt))
    .then(res => (res.body.data))
    // .set('updatedPostMeta')
    .then(data => {
      // console.log(data)
      const { id, type, attributes, relationships } = data;
      // console.log(id, type, attributes, relationships);
      expect(id).to.equal(comments1ids[0]);
      expect(type).to.equal('post-comments');
      expect(attributes['comment-text']).to.equal('Lorem ipsum blah blah');
      expect(attributes['author-email']).to.equal('dummy@example.com');
      expect(relationships.post.data.type).to.equal('posts');
      expect(parseInt(relationships.post.data.id)).to.equal(postId2);
    })
    .then(() => api.get('/api/v1/users/' + userId2, jwt2))
    .then(res => (res.body.data))
    // .set('updatedPostMeta')
    .then(data => {
      // console.log(data)
      const { id, type, attributes, relationships } = data;
      // console.log(id, type, attributes, relationships);
      expect(id).to.equal(userId2);
      expect(type).to.equal('users');
      expect(relationships.posts.data.length).to.equal(1);
      expect(parseInt(relationships.posts.data[0].id)).to.equal(postId2);
      expect(relationships.posts.data[0].type).to.equal('posts');
    })
    .then( () => Promise.all( [
      api.get('/api/v1/tags/' + tags1ids[0], jwt2),
      api.get('/api/v1/tags/' + tags1ids[1], jwt2),
      api.get('/api/v1/tags/' + tags1ids[2], jwt2),
      api.get('/api/v1/tags/' + tags2ids[0], jwt2),
      api.get('/api/v1/tags/' + tags2ids[1], jwt2)
    ] ) )
    .then(results => _.map(results, res => (res.body.data)))
    // .set('updatedPostMeta')
    .then(datas => {
      const allExpectedPostIds = [
        [ postId, postId2 ],
        [ postId, postId2 ],
        [ postId ],
        [ postId2 ],
        []
      ];
      datas.forEach( (data, index) => {
        const expectedPostIds = allExpectedPostIds[index];
        const { id, type, attributes, relationships } = data;
        // console.log(id, type, attributes, relationships);
        expect(relationships.posts.data.length).to.equal(expectedPostIds.length);
        const postIds = _.map(relationships.posts.data, p => parseInt(p.id));
        expect(postIds).to.deep.equal(expectedPostIds);
      } );
    })
    // .get(({ credentials2 }) => api.)
    // .then(console.log)
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });

  it('creates a user, then an extended profile', () => {
    return chain(api.signupAndLogin())
    .set('credentials')
    .then(({ jwt, userId }) => fakers.getProfilePayload(userId))
    .set('payload')
    .get(({ credentials, payload}) =>
      api.post('/api/v1/extended-profiles', payload, credentials.jwt)
      // .then(res => { console.log(res.body) })
      .expect(200)
    )
    // .then(([admin, user]) => api['delete'](
    //   '/api/v1/users/' + user.userId,
    //   admin.jwt
    // ))
    // .then(res => { console.log(res.body) });
  });


});