module.exports = {
  users: {
    posts: {
      table: 'posts',
      type: 'hasMany',
      reverse: 'author'
    },
    car: {
      table: 'cars',
      type: 'belongsTo',
      reverse: 'owner'
    },
    followers: {
      table: 'users',
      type: 'hasMany',
      reverse: 'followees'
    },
    followees: {
      table: 'users',
      type: 'hasMany',
      reverse: 'followers'
    }
  },
  posts: {
    author: {
      table: 'users',
      type: 'belongsTo',
      reverse: 'posts'
    },
    tags: {
      table: 'tags',
      type: 'hasMany',
      reverse: 'posts'
    }
  },
  tags: {
    posts: {
      table: 'posts',
      type: 'hasMany',
      reverse: 'tags'
    }
  },
  cars: {
    carMake: {
      table: 'carmakes',
      type: 'belongsTo',
      reverse: 'cars'
    },
    owner: {
      table: 'users',
      type: 'belongsTo',
      reverse: 'car'
    }
  },
  carmakes: {
    cars: {
      table: 'cars',
      type: 'hasMany',
      reverse: 'carMake'
    }
  },
  accounts: {}
};