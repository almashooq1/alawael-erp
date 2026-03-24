// @deprecated — Prefer importing from 'errors/AppError' + 'errors/errorHandler' for new code
// Thin re-export proxy — canonical sources are errors/AppError & errors/errorHandler
const { AppError } = require('../errors/AppError');
const { asyncHandler } = require('../errors/errorHandler');

module.exports = {
  AppError,
  errorHandler: require('../errors/errorHandler').errorHandler,
  asyncHandler,
  catchAsync: asyncHandler,
};
