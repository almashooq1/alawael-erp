/**
 * Shared express-validator middleware
 * يمكن استخدامه في أي ملف مسارات لتبسيط التحقق من المدخلات
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   const { body, param } = require('express-validator');
 *
 *   router.post('/items',
 *     validate([
 *       body('name').notEmpty().withMessage('الاسم مطلوب'),
 *       body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
 *     ]),
 *     async (req, res, next) => { ... }
 *   );
 */

const { validationResult } = require('express-validator');

/**
 * Wraps an array of express-validator checks into a middleware
 * that automatically returns the first error as a 400 response.
 *
 * @param {Array} validations - Array of express-validator check chains
 * @returns {Function} Express middleware
 */
const validate = validations => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(v => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return 400 directly with first validation error
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  };
};

module.exports = { validate };
