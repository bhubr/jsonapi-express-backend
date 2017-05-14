var path = require('path');
var fs = require('fs');
var jwt = require('jsonwebtoken');
var utils = require('./utils');

module.exports = function(baseDir, config) {
  const privateKey = (fs.readFileSync(path.normalize(baseDir + '/' + config.keys.private))).toString();  // get private key
  const publicKey = (fs.readFileSync(path.normalize(baseDir + '/' + config.keys.public))).toString();  // get public key


  function generateJwt(user) {
    const userId = user.id;
    return new Promise((resolve, reject) => {
      
      const email = user.email;
      // jwt.sign({ userId, email, permissions: user._permissions }, privateKey, { algorithm: 'RS256' }, function(err, token) {
      jwt.sign({ userId, email }, privateKey, { algorithm: 'RS256' }, function(err, token) {
        console.log(token);
        if(err) return reject(err);
        resolve(token);
      });
    });
  }

  function checkJwt(token) {
    return new Promise((resolve, reject) => {
      const jwtTimeout = config.jwtTimeout !== undefined ? config.jwtTimeout : 3600;
      jwt.verify(token, publicKey, function(err, decoded) {
        if(err) return reject(err);
        // console.log(decoded); // decoded payload
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = decoded.iat + parseInt(jwtTimeout);
        if(now > expiresAt) {
          reject('Token expired by ' + (now - expiresAt) + ' seconds');
        }
        resolve(decoded);
      });
    });
  }


  function escapeSlashes(str) {
    return (str + '').replace(/\//g, '\\/');
  }

  function matchPath(path, against) {
    const hasWildcard = against[against.length - 1] === '*';
    let escapedAgainst = escapeSlashes(against);
    escapedAgainst += hasWildcard ? '.*' : '$';
    const re = new RegExp('^' + escapedAgainst);
    return re.exec(path) !== null;
  }

  function isWhitelisted(req, whitelistedUrls) {
    const whitelist = ['POST /api/v1/signin', 'POST /api/v1/users'].concat(whitelistedUrls);
    const { method, path, baseUrl } = req;
    const fullPath = baseUrl + path;
    const listBits = whitelist.map(descriptor => descriptor.split(' '));
    for(let i = 0 ; i < listBits.length ; i++) {
      const bit = listBits[i];
      if(method === bit[0] && matchPath(fullPath, bit[1])) {
        return true;
      }
    }
    return false;
  }

  /**
   * JWT checking middleware
   */
  function checkJwtMiddleware(req, res, next) {
    const whitelistedUrls = config.whitelistedUrls !== undefined ? config.whitelistedUrls : [];
    if(isWhitelisted(req, whitelistedUrls)) {
      return next();
    }
    const authHeader = req.get('Authorization');
    if(authHeader === undefined) return res.status(401).send('Unauthorized');
    const jwt = authHeader.substr(7); // Strip 'Bearer '
    checkJwt(jwt)
    .then(decoded => {
      req.jwtData = decoded;
      // console.log('decoded ok', decoded);
      next();
    })
    .catch(err => res.status(401).send(err))
  }

  return { generateJwt, checkJwt, checkJwtMiddleware };
};

