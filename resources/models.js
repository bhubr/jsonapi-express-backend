module.exports = {
	users: {
    requiredAttributes: ['email', 'password'],
    relationships: {
      posts: {
        table: 'posts',
        type: 'hasMany',
        reverse: 'author'
      },
      profile: {
        table: 'extended-profiles',
        type: 'belongsTo',
        reverse: 'user'
      },
      suduModels: {
        table: 'super-duper-models',
        type: 'hasMany',
        reverse: 'owner'
      }
    }
  },
  'extended-profiles': {
    relationships: {
      user: {
        table: 'users',
        type: 'belongsTo',
        reverse: 'profile'
      }
    }
  },
  posts: {
    requiredAttributes: ['title'],
    relationships: {
      author: {
        table: 'users',
        type: 'belongsTo',
        reverse: 'posts'
      }
    }
  },
  'super-duper-models': {
    requiredAttributes: ['name'],
    relationships: {
      owner: {
        table: 'users',
        type: 'belongsTo',
        reverse: 'suduModels'
      }
    }
  }
};