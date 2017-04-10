var path = require('path');
var fs = require('fs');
var jwt = require('jsonwebtoken');


module.exports = function(keysFolder) {
  const privateKey = (fs.readFileSync(path.normalize(keysFolder + '/private.key'))).toString();  // get private key
  const publicKey = (fs.readFileSync(path.normalize(keysFolder + '/public.key'))).toString();  // get public key

  function generateJwt(user) {
    const userId = user.id;
    return new Promise((resolve, reject) => {
      
      const email = user.email;
      // jwt.sign({ userId, email, permissions: user._permissions }, privateKey, { algorithm: 'RS256' }, function(err, token) {
      jwt.sign({ userId, email }, privateKey, { algorithm: 'RS256' }, function(err, token) {
        console.log(token);
        if(err) reject(err);
        resolve(token);
      });
    });
  }

  function checkJwt(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, publicKey, function(err, decoded) {
        if(err) return reject(err);
        console.log(decoded); // decoded payload
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = decoded.iat + (60 * 60);
        if(now > expiresAt) {
          reject('Token expired by ' + (now - expiresAt) + ' seconds');
        }
        resolve(decoded);
      });
    });
  }


  /**
   * JWT checking middleware
   */
  function checkJwtMiddleware(req, res, next) {
    if(isWhitelisted(req)) {
      return next();
    }
    const authHeader = req.get('Authorization');
    if(authHeader === undefined) return next();
    const jwt = authHeader.substr(7); // Strip 'Bearer '
    checkJwt(jwt)
    .then(decoded => { console.log(decoded); next(); })
    .catch(err => res.status(401).send(err))
  }

  return { generateJwt, checkJwt, checkJwtMiddleware };
};

