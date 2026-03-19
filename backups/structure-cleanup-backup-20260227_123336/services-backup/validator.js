/**
 * Advanced Validation Service
 * Data validation, schema checking, and business rules
 * Phase 10: Advanced Features
 */

const logger = require('../utils/logger');

class Validator {
  constructor() {
    this.schemas = {};
    this.customRules = {};
  }

  /**
   * Register validation schema
   */
  registerSchema(name, schema) {
    this.schemas[name] = schema;
    logger.info(`Schema registered: ${name}`);
  }

  /**
   * Validate email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate field against type
   */
  validateField(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string' && value.length > 0;
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'email':
        return this.isValidEmail(value);
      case 'phone':
        return this.isValidPhone(value);
      case 'url':
        return this.isValidUrl(value);
      case 'date':
        return !isNaN(Date.parse(value));
      default:
        return true;
    }
  }

  /**
   * Validate object against schema
   */
  validate(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      logger.warn(`Schema not found: ${schemaName}`);
      return { valid: true, errors: [] };
    }

    const errors = [];

    Object.entries(schema).forEach(([field, rules]) => {
      const value = data[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        return;
      }

      // Check type
      if (value !== undefined && rules.type) {
        if (!this.validateField(value, rules.type)) {
          errors.push(`${field} must be of type ${rules.type}`);
        }
      }

      // Check minLength
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      // Check maxLength
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must not exceed ${rules.maxLength} characters`);
      }

      // Check min/max for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must not exceed ${rules.max}`);
        }
      }

      // Check pattern (regex)
      if (value && rules.pattern) {
        if (!new RegExp(rules.pattern).test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }

      // Check enum
      if (value && rules.enum) {
        if (!rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize input
   */
  sanitize(data) {
    if (typeof data === 'string') {
      return data.replace(/[<>]/g, '').trim();
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      Object.entries(data).forEach(([key, value]) => {
        sanitized[key] = this.sanitize(value);
      });
      return sanitized;
    }

    return data;
  }

  /**
   * Validate data range
   */
  validateRange(value, min, max) {
    return value >= min && value <= max;
  }

  /**
   * Validate array uniqueness
   */
  validateUnique(array) {
    return new Set(array).size === array.length;
  }

  /**
   * Custom validation rule
   */
  registerRule(name, validatorFn) {
    this.customRules[name] = validatorFn;
  }

  /**
   * Apply custom rule
   */
  applyCustomRule(name, value) {
    const rule = this.customRules[name];
    if (!rule) {
      logger.warn(`Custom rule not found: ${name}`);
      return true;
    }
    return rule(value);
  }

  /**
   * Get validation stats
   */
  getStats() {
    return {
      schemas: Object.keys(this.schemas).length,
      customRules: Object.keys(this.customRules).length,
      schemaList: Object.keys(this.schemas),
      rulesList: Object.keys(this.customRules),
    };
  }
}

module.exports = new Validator();
