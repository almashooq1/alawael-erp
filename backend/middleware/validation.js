/**
 * =====================================================
 * ADVANCED VALIDATION MIDDLEWARE - Phase 6
 * =====================================================
 * Comprehensive input validation for all endpoints
 */

const { ApiError } = require('../utils/apiResponse');

// ==================== VALIDATORS ====================

/**
 * Email validation
 */
const isEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value || '');
};

/**
 * Password strength validation
 */
const isStrongPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Phone number validation
 */
const isPhoneNumber = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * URL validation
 */
const isValidUrl = (url) => {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
};

/**
 * ID validation (MongoDB ObjectId)
 */
const isValidObjectId = (id) => {
  return /^[0-9a-f]{24}$/.test(id);
};

// ==================== SANITIZERS ====================

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return String(str).trim().replace(/[<>\"'&]/g, (char) => {
    const escape = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
    return escape[char];
  });
};

/**
 * Sanitize email
 */
const sanitizeEmail = (email) => {
  return String(email || '').toLowerCase().trim();
};

/**
 * Sanitize request body
 */
const sanitizeBody = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Registration validation
 */
const validateRegistration = (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'name, email, and password are required',
        errors: {
          name: !name ? 'Name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      });
    }

    // Email validation
    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        errors: { email: 'Please provide a valid email address' },
      });
    }

    // Password length
    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
        errors: { password: 'Password must have at least 8 characters' },
      });
    }

    // Confirm password
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
        errors: { confirmPassword: 'Passwords must match' },
      });
    }

    // Sanitize inputs
    req.body.name = sanitizeString(name);
    req.body.email = sanitizeEmail(email);

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }
};

/**
 * Login validation
 */
const validateLogin = (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'email and password are required',
        errors: {
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        errors: { email: 'Please provide a valid email address' },
      });
    }

    // Sanitize
    req.body.email = sanitizeEmail(email);

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }
};

/**
 * Create user validation
 */
const validateCreateUser = (req, res, next) => {
  try {
    const { name, email, role, department } = req.body || {};

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'name, email, and role are required',
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const validRoles = ['admin', 'manager', 'employee', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Sanitize
    req.body.name = sanitizeString(name);
    req.body.email = sanitizeEmail(email);
    if (department) req.body.department = sanitizeString(department);

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }
};

/**
 * Validate ID parameter
 */
const validateId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'ID parameter is required',
    });
  }

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }

  next();
};

/**
 * Validate pagination
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid page number',
    });
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid limit. Must be between 1 and 100',
    });
  }

  req.pagination = {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };

  next();
};

module.exports = {
  // Validators
  isEmail,
  isStrongPassword,
  isPhoneNumber,
  isValidUrl,
  isValidObjectId,

  // Sanitizers
  sanitizeString,
  sanitizeEmail,
  sanitizeBody,

  // Middleware
  validateRegistration,
  validateLogin,
  validateCreateUser,
  validateId,
  validatePagination,
};
