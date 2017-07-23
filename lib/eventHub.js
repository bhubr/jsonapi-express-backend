const winston       = require('winston');
const EventEmitter2 = require('eventemitter2').EventEmitter2;
const eventHub      = new EventEmitter2();
eventHub.onAny(event => {
  winston.info(event);
})
module.exports = eventHub;
