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
      },
      meta: {
        model: 'postMeta',
        type: 'belongsTo',
        reverse: 'post'
      },
      comments: {
        model: 'postComment',
        type: 'hasMany',
        reverse: 'post'
      },
      tags: {
        model: 'tag',
        type: 'hasMany',
        reverse: 'posts'
      }
    }
  },
  tag: {
    relationships: {
      posts: {
        model: 'post',
        type: 'hasMany',
        reverse: 'tags'
      }
    }
  },
  postComment: {
    relationships: {
      post: {
        model: 'post',
        type: 'belongsTo',
        reverse: 'comments'
      }
    }
  },
  postMeta: {
    relationships: {
      post: {
        model: 'post',
        type: 'belongsTo',
        reverse: 'meta'
      }
    }
  },
  superDuperModel: {
    requiredAttributes: ['dummyField'],
    relationships: {
      owner: {
        model: 'user',
        type: 'belongsTo',
        reverse: 'suduModels'
      }
    }
  }
};