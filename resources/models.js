module.exports = {
	user: {
    requiredAttributes: ['email', 'password'],
    relationships: {
      posts: {
        model: 'post',
        type: 'hasMany',
        reverse: 'author'
      },
      profile: {
        model: 'extendedProfile',
        type: 'belongsTo',
        reverse: 'user'
      },
      suduModels: {
        model: 'superDuperModel',
        type: 'hasMany',
        reverse: 'owner'
      }
    }
  },
  extendedProfile: {
    relationships: {
      user: {
        model: 'user',
        type: 'belongsTo',
        reverse: 'profile'
      }
    }
  },
  post: {
    requiredAttributes: ['title'],
    relationships: {
      author: {
        model: 'user',
        type: 'belongsTo',
        reverse: 'posts'
      }
    }
  },
  superDuperModel: {
    requiredAttributes: ['name'],
    relationships: {
      owner: {
        model: 'user',
        type: 'belongsTo',
        reverse: 'suduModels'
      }
    }
  }
};