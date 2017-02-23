var express = require('express');
var http = require('http');
var models = require('./models');
var bodyParser = require('body-parser');
var utils = require('./utils');
var api = require('./jsonapi');
var templates = require('./templates');
var port = process.argv.length >= 3 ? parseInt( process.argv[2], 10 ) : 3001;
// var passport = require('./signin');

var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy;
var { User } = require('./models');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var session = require('express-session');
var authToken = require('./authToken');

/**
 * Setup Express
 */
var app = express();
// app.set('trust proxy', 1) // trust first proxy
// app.use( session({
//    secret : 'H~i%1b7EDyw<1%`oH-aC6yf~q$fW7-<SW|^l1[eC1iouRXj`L_%Y{|Iw[)=Nem}3',
//    name : '_xpjsApiSid',
//   })
// );
app.use(express.static('public'));
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(function(req, res, next) {
  res.jsonApi = function(data) {
    res.set({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    return res.send(JSON.stringify({ data }));
  };
  next();
});

function isWhitelisted(method, path) {
  const whitelist = ['POST /auth/signin', 'POST /api/v1/users'];
  const listBits = whitelist.map(descriptor => descriptor.split(' '));
  for(let i = 0 ; i < listBits.length ; i++) {
    const bit = listBits[i];
    console.log(bit);
    if(method === bit[0] && path === bit[1]) {
      console.log('# whitelisted path', whitelist[i]);
      return true;
    }
  }
  return false;
}

/**
 * JWT checking middleware
 */
// app.use(function(req, res, next) {
//   if(isWhitelisted(req.method, req.path)) return next();
//   console.log('should not be here if whitelisted');
//   const authHeader = req.get('Authorization');
//   if(authHeader === undefined) return next();
//   const jwt = authHeader.substr(7); // Strip 'Bearer '
//   authToken.verify(jwt)
//   .then(decoded => { console.log(decoded); next(); })
//   .catch(err => res.status(401).send(err))
// });


app.use('/api/v1', api);

app.get('/', (req, res) => {
  res.send(templates.index());
})

app.post('/auth/signin', (req, res) => {
  const { email, password } = req.body.data.attributes;
  User.findOne({ where: { email: email } })
  .then(user => {
    if (!user) {
      return res.status(401).send('no account with this email');
    }
    bcrypt.compareAsync(user.dataValues.password, password)
    .then(() => user.getPermissions())
    .then(authToken.generate)
    .then(jwt => (res.jsonApi({ userId: user.dataValues.id, jwt })));
  })
  .catch(err => {
    console.log(err);
      // return done(null, false, { message: 'Incorrect password => ' + err });
      return res.status(401).send(err);
    });
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});


