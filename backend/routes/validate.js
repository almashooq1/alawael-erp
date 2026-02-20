/**
 * Validation Routes
 * Data validation endpoints and schema management
 * Phase 10: Advanced Features
 */

const express = require('express');
const router = express.Router();
const validator = require('../services/validator');
const responseFormatter = require('../services/responseFormatter');
const { optionalAuth } = require('../middleware/auth');

// Register default schemas
validator.registerSchema('user', {
  name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  email: { required: true, type: 'email' },
  phone: { required: false, type: 'phone' },
  age: { required: false, type: 'number', min: 0, max: 150 },
  password: { required: true, type: 'string', minLength: 8 },
});

validator.registerSchema('product', {
  name: { required: true, type: 'string', minLength: 3, maxLength: 200 },
  price: { required: true, type: 'number', min: 0 },
  category: { required: true, type: 'string', enum: ['electronics', 'clothing', 'food', 'other'] },
  sku: { required: true, type: 'string', pattern: '^[A-Z0-9]{5,10}$' },
  description: { required: false, type: 'string', maxLength: 1000 },
});

validator.registerSchema('order', {
  customerId: { required: true, type: 'string' },
  items: { required: true, type: 'array' },
  totalAmount: { required: true, type: 'number', min: 0 },
  status: {
    required: true,
    type: 'string',
    enum: ['pending', 'confirmed', 'shipped', 'delivered'],
  },
});

/**
 * POST /api/validate/schema
 * Validate data against registered schema
 */
router.post('/schema', optionalAuth, (req, res) => {
  try {
    const { schemaName, data } = req.body;

    if (!schemaName || !data) {
      return res
        .status(400)
        .json(
          responseFormatter.validationError(
            ['schemaName and data are required'],
            'Validation failed'
          )
        );
    }

    const result = validator.validate(data, schemaName);

    if (!result.valid) {
      return res
        .status(400)
        .json(responseFormatter.validationError(result.errors, 'Data validation failed'));
    }

    res.json(responseFormatter.success({ valid: true }, 'Data validation successful'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Validation failed', error));
  }
});

/**
 * POST /api/validate/custom
 * Validate with custom rules
 */
router.post('/custom', optionalAuth, (req, res) => {
  try {
    const { field, value, rules } = req.body;

    if (!field || value === undefined || !rules) {
      return res
        .status(400)
        .json(responseFormatter.validationError('field, value, and rules are required'));
    }

    const errors = [];

    if (rules.email && !validator.isValidEmail(value)) {
      errors.push('Invalid email format');
    }

    if (rules.phone && !validator.isValidPhone(value)) {
      errors.push('Invalid phone format');
    }

    if (rules.url && !validator.isValidUrl(value)) {
      errors.push('Invalid URL format');
    }

    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength}`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength}`);
    }

    if (errors.length > 0) {
      return res.status(400).json(responseFormatter.validationError(errors));
    }

    res.json(responseFormatter.success(null, 'Validation passed'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Custom validation failed', error));
  }
});

/**
 * POST /api/validate/sanitize
 * Sanitize input data
 */
router.post('/sanitize', optionalAuth, (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json(responseFormatter.validationError('data is required'));
    }

    const sanitized = validator.sanitize(data);

    res.json(responseFormatter.success({ data: sanitized }, 'Data sanitized'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Sanitization failed', error));
  }
});

/**
 * GET /api/validate/schemas
 * List registered schemas
 */
router.get('/schemas', optionalAuth, (req, res) => {
  try {
    const stats = validator.getStats();

    res.json(responseFormatter.success(stats, 'Registered schemas'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to retrieve schemas', error));
  }
});

/**
 * POST /api/validate/email
 * Validate email
 */
router.post('/email', optionalAuth, (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(responseFormatter.validationError('email is required'));
    }

    const valid = validator.isValidEmail(email);

    res.json(
      responseFormatter.success({ email, valid }, valid ? 'Email is valid' : 'Email is invalid')
    );
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Email validation failed', error));
  }
});

/**
 * POST /api/validate/phone
 * Validate phone number
 */
router.post('/phone', optionalAuth, (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json(responseFormatter.validationError('phone is required'));
    }

    const valid = validator.isValidPhone(phone);

    res.json(
      responseFormatter.success({ phone, valid }, valid ? 'Phone is valid' : 'Phone is invalid')
    );
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Phone validation failed', error));
  }
});

/**
 * POST /api/validate/url
 * Validate URL
 */
router.post('/url', optionalAuth, (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json(responseFormatter.validationError('url is required'));
    }

    const valid = validator.isValidUrl(url);

    res.json(responseFormatter.success({ url, valid }, valid ? 'URL is valid' : 'URL is invalid'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('URL validation failed', error));
  }
});

module.exports = router;
