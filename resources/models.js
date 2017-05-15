module.exports = {
	users: {
    requiredAttributes: ['email', 'password'],
    relationships: {
      posts: {
        table: 'posts',
        type: 'hasMany',
        reverse: 'author'
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
  }
};