var fs = require('fs');
var NodeRSA = require('node-rsa');
var key = new NodeRSA({b: 512});

key.generateKeyPair();
var privateKey = key.exportKey();
var publicKey = key.exportKey('public');
fs.writeFileSync(__dirname + '/private.key', privateKey.toString() );
fs.writeFileSync(__dirname + '/public.key', publicKey.toString() );
