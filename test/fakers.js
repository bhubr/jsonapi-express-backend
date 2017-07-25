const Chance = require('chance');
const chance = new Chance();
const Promise = require('bluebird');

const fakers = {
// const fakers = function(modelDescriptors) {
//   'use strict';
//   return {

    // fakeModel: function() {
    //   let args = Array.prototype.slice.call(arguments);
    //   const type = args.shift();
    //   const modelDescriptor = modelDescriptors[type];
    //   const modelFaker = this[type];
    //   const model = modelFaker.apply(this, args);
    //   const modelRels = modelDescriptor.relationships;

    // },

    user: function() {
      return {
        email: chance.email(),
        firstName: chance.first(),
        lastName: chance.last(),
        roleId: 1
      }
    },

    users: function(n) {
      if(n === undefined || isNaN(n)) {
        return this.user();
      }
      let users = [];
      for(let i = 0; i < n ; i++) {
        users.push(this.user());
      }
      return users;
    },

    post: function(authorId) {
      return {
        title: chance.sentence({ words: 3 }),
        slug: chance.guid(),
        content: chance.paragraph({ sentences: 2 }),
        authorId
      }
    },

    posts: function(authorId, n) {
      if(n === undefined || isNaN(n)) {
        return this.post(authorId);
      }
      let posts = [];
      for(let i = 0; i < n ; i++) {
        posts.push(this.post(authorId));
      }
      return posts;
    },

    extendedProfile: function(userId) {
      return {
        userId,
        twitterUrl: 'https://twitter.com/' + chance.twitter(),
        facebookUrl: 'https://www.facebook.com/profile.php?id=' + chance.fbid(),
        linkedinUrl: chance.url(),
        address: chance.address(),
        phone: chance.phone()
      }
    },

    postMeta: function(postId) {
      return {
        postId,
        metaValue: JSON.stringify({ hashtag: chance.hashtag(), guid: chance.guid() })
      }
    },

    postComment: function(postId) {
      return {
        postId,
        authorEmail: chance.email(),
        commentText: chance.sentence({ words: 5 })
      }
    },

    postComments: function(postId, n) {
      if(n === undefined || isNaN(n)) {
        return this.postComment(postId);
      }
      let comments = [];
      for(let i = 0; i < n ; i++) {
        comments.push(this.postComment(postId));
      }
      return comments;
    },

    tag: function() {
      return {
        name: chance.word(),
        color: chance.color({format: 'hex'})
      }
    },

    tags: function(n) {
      if(n === undefined || isNaN(n)) {
        return this.tag();
      }
      let tags = [];
      for(let i = 0; i < n ; i++) {
        tags.push(this.tag());
      }
      return tags;
    },

    superDuperModel: function(ownerId) {
      return {
        dummyField: chance.sentence({ words: 3 }),
        ownerId
      }
    },

    superDuperModels: function(ownerId, n) {
      if(n === undefined || isNaN(n)) {
        return this.superDuperModel(ownerId);
      }
      let superDuperModels = [];
      for(let i = 0; i < n ; i++) {
        superDuperModels.push(this.superDuperModel(ownerId));
      }
      return superDuperModels;
    },


    mapToPayload: function(kebabPlural, attributes, relationships) {
      return {
        type: kebabPlural,
        attributes,
        relationships: relationships.reduce((carry, rel) => {
          const { key, type, id } = rel;
          const data = id.constructor === Array ?
            id.map(_id => ({ type, id: _id })) :
            { type, id };
          carry[rel.key] = { data };
          return carry;
        }, {})
      };
    },


    /**
     * Generate fake user payload
     */
    getUserPayload: function() {
      return {
        type: 'users',
        attributes: {
          email: chance.email(),
          username: chance.word({syllables: 3}),
          password: 'foobar'
        },
        relationships: {}
      };
    },

   getPostPayload: function(userId) {
      return {
        type: 'posts',
        attributes: {
          title: chance.sentence({ words: 3 }),
          slug: chance.guid(),
          content: chance.paragraph({ sentences: 2 })
        },
        relationships: {
          author: { data: {
            type: 'users', id: userId
          } }
        }
      };
    },

    getProfilePayload: function(userId) {
      return {
        type: 'extended-profiles',
        attributes: {
          'twitter-url': 'https://twitter.com/' + chance.twitter(),
          'facebook-url': 'https://www.facebook.com/profile.php?id=' + chance.fbid(),
          'linkedin-url': chance.url(),
          address: chance.address(),
          phone: chance.phone()
        },
        relationships: {
          user: {
            data: {
              type: 'users', id: userId
            }
          }
        }
      };
    }
  // }
}
module.exports = fakers;