const errorFactory = require('error-factory');
const PayloadFormatError = errorFactory('PayloadFormatError', ['message', 'messageData']);

module.exports = {
  PayloadFormat: PayloadFormatError
};