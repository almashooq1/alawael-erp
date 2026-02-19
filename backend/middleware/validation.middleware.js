/**
 * Validation Middleware
 * Middleware للتحقق من صحة البيانات
 */
const { validateSchema, schemas, sanitizeObject } = require('../utils/validation');

/**
 * Create validation middleware for a schema
 */
const validate = schemaName => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return res.status(500).json({
        success: false,
        error: 'Validation schema not found',
        code: 'INVALID_SCHEMA',
      });
    }

    // Sanitize input
    req.body = sanitizeObject(req.body);

    // Validate
    const { valid, errors } = validateSchema(req.body, schema);

    if (!valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    next();
  };
};

/**
 * Validate user registration
 */
const validateRegistration = validate('userRegistration');

/**
 * Validate user login
 */
const validateLogin = validate('userLogin');

/**
 * Validate user update
 */
const validateUpdate = validate('userUpdate');

/**
 * Sanitize request body middleware
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateUpdate,
  sanitizeRequest,
};
