// @deprecated — Prefer importing from 'errors/responseSystem' for new code
/**
 * Response Helpers — Unified response formatting utility
 * Used by: educationalContentController, digitalLibraryController, virtualSessionController
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data, message = 'تمت العملية بنجاح', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {any} details - Optional error details
 */
function sendError(res, message = 'حدث خطأ في الخادم', statusCode = 500, details = null) {
  const response = {
    success: false,
    message,
  };
  if (details) {
    response.details = details;
  }
  return res.status(statusCode).json(response);
}

module.exports = { sendSuccess, sendError };
