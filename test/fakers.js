const Chance = require('chance');
const chance = new Chance();

const fakers = {

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


  /**
   * Generate fake user payload
   */
  getUserPayload: function() {
    return {
      type: 'users',
      attributes: {
        email: chance.email(),
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
}
module.exports = fakers;