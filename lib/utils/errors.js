const errorFactory = require('error-factory');
const PayloadFormatError = errorFactory('PayloadFormatError', ['message', 'messageData']);
const UnknownModelError = errorFactory('UnknownModelError', ['message', 'messageData']);
const ForbiddenClientIdError = errorFactory('ForbiddenClientIdError', ['message', 'messageData']);

module.exports = {
  PayloadFormat: PayloadFormatError,
  UnknownModel:  UnknownModelError,
  ForbiddenClientId: ForbiddenClientIdError
};