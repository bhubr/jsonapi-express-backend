var path = require('path');
var fs = require('fs');
var jwt = require('jsonwebtoken');

const privateKey = (fs.readFileSync(path.normalize(__dirname + '/keys/private.key'))).toString();  // get private key
const publicKey = (fs.readFileSync(path.normalize(__dirname + '/keys/public.key'))).toString();  // get public key

function generate(user) {
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

function verify(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, function(err, decoded) {
      if(err) return reject(err);
      console.log(decoded); // decoded payload
      const now = Math.floor(Date.now() / 1000);
      const exp = decoded.iat + (60 * 60);
      if(now > exp) {
        reject('Token expired by ' + (now - exp) + ' seconds');
      }
      resolve(decoded);
    });
  });
}
module.exports = { generate, verify };