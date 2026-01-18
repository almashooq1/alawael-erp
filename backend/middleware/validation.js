const validator = require('validator');

/**
 * Password validation rules
 */
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Validate password against policy
 */
const validatePassword = password => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
  }

  if (password.length > passwordPolicy.maxLength) {
    errors.push(`Password must not exceed ${passwordPolicy.maxLength} characters`);
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordPolicy.requireSpecialChars) {
    const specialCharsRegex = new RegExp(`[${passwordPolicy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*...)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate email format
 */
const validateEmail = email => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  if (!validator.isEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true };
};

/**
 * Validate full name
 */
const validateFullName = fullName => {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'Full name is required' };
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters long' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Full name is too long' };
  }

  // Allow letters, spaces, Arabic characters, hyphens, and apostrophes
  if (!/^[\p{L}\s'-]+$/u.test(trimmedName)) {
    return { valid: false, error: 'Full name contains invalid characters' };
  }

  return { valid: true };
};

/**
 * Sanitize string input
 */
const sanitizeString = (str, maxLength = 255) => {
  if (!str || typeof str !== 'string') return '';

  // Trim whitespace
  let sanitized = str.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Middleware to validate registration data
 */
const validateRegistration = (req, res, next) => {
  const { email, password, fullName } = req.body;

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      message: emailValidation.error,
    });
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet requirements',
      errors: passwordValidation.errors,
    });
  }

  // Validate full name
  const nameValidation = validateFullName(fullName);
  if (!nameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: nameValidation.error,
    });
  }

  // Sanitize inputs
  req.body.email = sanitizeString(email.toLowerCase(), 254);
  req.body.fullName = sanitizeString(fullName, 100);

  next();
};

/**
 * Middleware to validate profile update
 */
const validateProfileUpdate = (req, res, next) => {
  const { fullName } = req.body;

  if (fullName !== undefined) {
    const nameValidation = validateFullName(fullName);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: nameValidation.error,
      });
    }
    req.body.fullName = sanitizeString(fullName, 100);
  }

  next();
};

/**
 * Middleware to validate password change
 */
const validatePasswordChange = (req, res, next) => {
  const { newPassword } = req.body;

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: 'New password does not meet requirements',
      errors: passwordValidation.errors,
    });
  }

  next();
};

module.exports = {
  passwordPolicy,
  validatePassword,
  validateEmail,
  validateFullName,
  sanitizeString,
  validateRegistration,
  validateProfileUpdate,
  validatePasswordChange,
};
