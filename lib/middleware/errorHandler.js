function errorHandler(err, req, res, next) {
  const statusCodesPerError = {
    PayloadFormatError: 400,
    UnknownModelError: 404,
    ForbiddenClientIdError: 403,
    MissingFieldError: 400
  };
  const statusCode = statusCodesPerError[err.name] || 500;
  if(! statusCodesPerError[err.name]) {
    lineLogger(err);
  }
  res.status(statusCode).json({ error: '[' + err.name + '] => ' + err.message });
}

module.exports = errorHandler;