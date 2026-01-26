/**
 * Request Validation Middleware
 * التحقق من صحة الطلبات
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler
 * معالج أخطاء التحقق
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param || err.path,
        message: err.msg,
        value: err.value,
      })),
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Common validation rules
 * قواعد التحقق الشائعة
 */
const commonValidations = {
  // Email validation
  email: body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),

  // Password validation
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  // MongoDB ObjectId validation
  mongoId: (field = 'id') => param(field).isMongoId().withMessage(`Invalid ${field} format`),

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],

  // Date validation
  date: field => body(field).optional().isISO8601().withMessage(`${field} must be a valid date`),

  // String validation
  requiredString: (field, minLength = 1, maxLength = 500) =>
    body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  // Optional string validation
  optionalString: (field, maxLength = 500) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must not exceed ${maxLength} characters`),

  // Number validation
  number: (field, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    body(field)
      .isNumeric()
      .withMessage(`${field} must be a number`)
      .custom(value => {
        const num = Number(value);
        if (num < min || num > max) {
          throw new Error(`${field} must be between ${min} and ${max}`);
        }
        return true;
      }),

  // Boolean validation
  boolean: field => body(field).isBoolean().withMessage(`${field} must be a boolean`).toBoolean(),

  // Array validation
  array: (field, minLength = 0, maxLength = 100) =>
    body(field)
      .isArray({ min: minLength, max: maxLength })
      .withMessage(`${field} must be an array with ${minLength} to ${maxLength} items`),

  // Phone validation
  phone: (field = 'phone') =>
    body(field)
      .optional()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage('Invalid phone number format'),

  // URL validation
  url: (field = 'url') => body(field).optional().isURL().withMessage('Invalid URL format'),
};

/**
 * Auth validation rules
 * قواعد التحقق للمصادقة
 */
const authValidations = {
  login: [commonValidations.email, commonValidations.password, handleValidationErrors],

  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    commonValidations.email,
    commonValidations.password,
    body('phone')
      .optional()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage('Invalid phone number'),
    handleValidationErrors,
  ],

  resetPassword: [commonValidations.email, handleValidationErrors],

  changePassword: [
    body('oldPassword').isLength({ min: 6 }).withMessage('Old password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    handleValidationErrors,
  ],
};

/**
 * User validation rules
 * قواعد التحقق للمستخدمين
 */
const userValidations = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email').optional().trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone')
      .optional()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage('Invalid phone number'),
    handleValidationErrors,
  ],

  getUserById: [commonValidations.mongoId('id'), handleValidationErrors],
};

/**
 * Sanitize input
 * تنظيف المدخلات
 */
const sanitizeInput = (req, res, next) => {
  // Remove any HTML tags from string inputs
  const sanitize = obj => {
    if (typeof obj === 'string') {
      return obj.replace(/<[^>]*>/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        acc[key] = sanitize(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  authValidations,
  userValidations,
  sanitizeInput,
};
