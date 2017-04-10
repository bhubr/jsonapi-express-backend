

module.exports = function(keysFolder) {
  const { generateJwt, checkJwt, checkJwtMiddleware } = require('./lib/authToken')(keysFolder);
  const { router, middlewares } = require('./lib/jsonapi');
  middlewares.checkJwt = checkJwtMiddleware;

  router.post('/signin', (req, res) => {
    const { email, password } = req.body.data.attributes;
    const selectUserQuery = queryBuilder.selectWhere('users', { email });
    queryAsync(selectUserQuery)
    .then(users => {
      if (! users.length) {
        return res.status(401).send('no account with this email');
      }
      const user = users[0];
      bcrypt.compareAsync(user.password, password)
      // .then(() => user.getPermissions())
      .then(() => generateJwt(user))
      .then(jwt => (res.jsonApi({ userId: user.id, jwt })));
    })
    .catch(err => {
      console.log(err);
        // return done(null, false, { message: 'Incorrect password => ' + err });
        return res.status(401).send(err);
      });
  });

  return { router, middlewares };
}