/**
 * Comprehensive Validation Utilities
 * أدوات التحقق الشاملة
 */

/**
 * Email validation
 */
const isValidEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (Saudi format)
 */
const isValidPhone = phone => {
  // Saudi phone: +966 or 05 followed by 8 digits
  const phoneRegex = /^(\+966|966|05)\d{8}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ''));
};

/**
 * National ID validation (Saudi)
 */
const isValidNationalId = id => {
  // Saudi national ID: 10 digits starting with 1 or 2
  const idRegex = /^[12]\d{9}$/;
  return idRegex.test(id);
};

/**
 * Password strength validation
 */
const isStrongPassword = password => {
  if (password.length < 8)
    return { valid: false, reason: 'Password must be at least 8 characters' };
  if (!/[a-z]/.test(password))
    return { valid: false, reason: 'Password must contain lowercase letter' };
  if (!/[A-Z]/.test(password))
    return { valid: false, reason: 'Password must contain uppercase letter' };
  if (!/\d/.test(password)) return { valid: false, reason: 'Password must contain number' };
  if (!/[@$!%*?&]/.test(password))
    return { valid: false, reason: 'Password must contain special character (@$!%*?&)' };
  return { valid: true };
};

/**
 * Date validation
 */
const isValidDate = dateString => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * URL validation
 */
const isValidUrl = url => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * MongoDB ObjectId validation
 */
const isValidObjectId = id => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Pagination parameters validation
 */
const validatePagination = (page, limit) => {
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 50;

  return {
    page: Math.max(1, parsedPage),
    limit: Math.max(1, Math.min(100, parsedLimit)), // clamp between 1-100
  };
};

/**
 * Sanitize string input
 */
const sanitizeString = str => {
  if (typeof str !== 'string') return str;

  // Remove HTML tags
  const withoutTags = str.replace(/<[^>]*>/g, '');

  // Remove script tags content
  const withoutScripts = withoutTags.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  );

  // Trim and return
  return withoutScripts.trim();
};

/**
 * Validate and sanitize object
 */
const sanitizeObject = obj => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Common validation schemas
 */
const schemas = {
  // User registration - accept both 'name' and 'fullName'
  userRegistration: {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, validator: isValidEmail },
    password: { required: true, validator: pwd => isStrongPassword(pwd).valid },
    phone: { required: false, validator: isValidPhone },
    fullName: { required: false, minLength: 2, maxLength: 100 }, // Alternative name field
  },

  // User login
  userLogin: {
    email: { required: true, validator: isValidEmail },
    password: { required: true, minLength: 8 },
  },

  // User update
  userUpdate: {
    name: { required: false, minLength: 2, maxLength: 100 },
    email: { required: false, validator: isValidEmail },
    phone: { required: false, validator: isValidPhone },
  },
};

/**
 * Validate object against schema
 */
const validateSchema = (data, schema) => {
  const errors = [];

  // Special handling for userRegistration - allow 'name' or 'fullName'
  const isRegistration = schema.fullName !== undefined;
  if (isRegistration && !data.name && data.fullName) {
    data.name = data.fullName; // Normalize fullName to name
  }

  for (const [field, rules] of Object.entries(schema)) {
    // Skip fullName field validation if it's already been used as name
    if (field === 'fullName' && data.name && !data.fullName) {
      continue;
    }

    const value = data[field];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }

    // Skip validation if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Check minLength
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
    }

    // Check maxLength
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
    }

    // Check custom validator
    if (rules.validator && !rules.validator(value)) {
      errors.push({ field, message: `${field} is invalid` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  // Validators
  isValidEmail,
  isValidPhone,
  isValidNationalId,
  isStrongPassword,
  isValidDate,
  isValidUrl,
  isValidObjectId,
  validatePagination,

  // Sanitizers
  sanitizeString,
  sanitizeObject,

  // Schema validation
  schemas,
  validateSchema,
};
