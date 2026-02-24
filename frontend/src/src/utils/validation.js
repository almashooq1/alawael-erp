/**
 * Form Validation Utilities
 */

// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (at least 8 chars, 1 uppercase, 1 number)
export const isValidPassword = (password) => {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

// Phone validation
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// URL validation
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Required field validation
export const isRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

// Min length validation
export const minLength = (value, min) => {
  return value.length >= min;
};

// Max length validation
export const maxLength = (value, max) => {
  return value.length <= max;
};

// Number range validation
export const isInRange = (value, min, max) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

// File size validation (in MB)
export const isValidFileSize = (file, maxSizeMB) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// File type validation
export const isValidFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

// Validate form object
export const validateForm = (formData, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const value = formData[field];
    const fieldRules = rules[field];

    if (fieldRules.required && !isRequired(value)) {
      errors[field] = `${field} is required`;
    }

    if (fieldRules.minLength && !minLength(value, fieldRules.minLength)) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
    }

    if (fieldRules.maxLength && !maxLength(value, fieldRules.maxLength)) {
      errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`;
    }

    if (fieldRules.email && !isValidEmail(value)) {
      errors[field] = 'Invalid email address';
    }

    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.patternMessage || `${field} is invalid`;
    }

    if (fieldRules.custom) {
      const customError = fieldRules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  });

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

export default {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUrl,
  isRequired,
  minLength,
  maxLength,
  isInRange,
  isValidFileSize,
  isValidFileType,
  validateForm,
};
