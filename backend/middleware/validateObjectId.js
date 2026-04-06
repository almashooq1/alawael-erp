/**
 * validateObjectId Middleware
 * Validates that route parameters are valid MongoDB ObjectIds
 * Prevents CastError and potential information leakage from invalid IDs
 */

const mongoose = require('mongoose');

/**
 * Creates a middleware that validates the specified route parameter is a valid MongoDB ObjectId.
 * Returns 400 Bad Request if the parameter is not a valid ObjectId.
 *
 * @param {string} [paramName='id'] - The route parameter name to validate
 * @returns {Function} Express middleware
 *
 * @example
 * // Validate :id parameter (default)
 * router.get('/:id', validateObjectId(), controller.getById);
 *
 * // Validate a custom parameter name
 * router.get('/user/:userId', validateObjectId('userId'), controller.getByUser);
 *
 * // Validate multiple parameters
 * router.get('/:id/comments/:commentId',
 *   validateObjectId('id'),
 *   validateObjectId('commentId'),
 *   controller.getComment
 * );
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!value) {
      return next(); // Let the route handler deal with missing params
    }

    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({
        success: false,
        message: `معرّف غير صالح`, // "Invalid identifier" in Arabic
        message_en: `Invalid ${paramName} format`,
      });
    }

    next();
  };
}

module.exports = validateObjectId;
