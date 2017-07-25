const errorFactory = require('error-factory');

const ConfigError = errorFactory('ConfigError', ['message', 'messageData']);
const PayloadFormatError = errorFactory('PayloadFormatError', ['message', 'messageData']);
const UnknownModelError = errorFactory('UnknownModelError', ['message', 'messageData']);
const ForbiddenClientIdError = errorFactory('ForbiddenClientIdError', ['message', 'messageData']);
const MissingFieldError = errorFactory('MissingFieldError', ['message', 'messageData']);

module.exports = {
  Config: ConfigError,
  PayloadFormat: PayloadFormatError,
  UnknownModel:  UnknownModelError,
  ForbiddenClientId: ForbiddenClientIdError,
  MissingField: MissingFieldError
};