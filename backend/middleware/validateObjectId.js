/**
 * ObjectId Validation Middleware
 *
 * Validates that specified route params are valid MongoDB ObjectIds
 * before the request reaches the route handler. Prevents CastError
 * from Mongoose and avoids wasted DB round-trips.
 *
 * Usage:
 *   const validateObjectId = require('../middleware/validateObjectId');
 *   router.get('/:id', validateObjectId('id'), handler);
 *   router.get('/:id/sub/:subId', validateObjectId('id', 'subId'), handler);
 */

const mongoose = require('mongoose');

const validateObjectId =
  (...params) =>
  (req, res, next) => {
    for (const p of params) {
      const val = req.params[p];
      if (val && !mongoose.Types.ObjectId.isValid(val)) {
        return res.status(400).json({
          success: false,
          message: `معرّف ${p} غير صالح`,
        });
      }
    }
    next();
  };

module.exports = validateObjectId;
