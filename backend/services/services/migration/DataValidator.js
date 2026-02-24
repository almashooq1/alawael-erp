/**
 * Data Validator Service
 * Validates data before and during migration
 * Checks data types, required fields, formats, and business rules
 */

class DataValidator {
  constructor(schema = {}) {
    this.schema = schema;
    this.validationRules = new Map();
    this.errors = [];
  }

  /**
   * Define validation schema
   */
  defineSchema(entityType, schema) {
    this.validationRules.set(entityType, schema);
    return this;
  }

  /**
   * Get schema for entity
   */
  getSchema(entityType) {
    return this.validationRules.get(entityType) || {};
  }

  /**
   * Validate data array
   */
  async validate(data, options = {}) {
    try {
      if (!Array.isArray(data)) {
        return {
          valid: false,
          errors: ['Data must be an array'],
          warnings: [],
          validCount: 0,
          invalidCount: 1,
        };
      }

      const results = {
        valid: true,
        errors: [],
        warnings: [],
        validCount: 0,
        invalidCount: 0,
        details: [],
      };

      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        const recordErrors = this.validateRecord(record, i, options);

        if (recordErrors.length > 0) {
          results.invalidCount++;
          results.valid = false;
          results.details.push({
            index: i,
            record,
            errors: recordErrors,
          });
          results.errors.push(...recordErrors);
        } else {
          results.validCount++;
        }
      }

      return results;
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings: [],
        validCount: 0,
        invalidCount: data.length,
      };
    }
  }

  /**
   * Validate individual record
   */
  validateRecord(record, index = 0, options = {}) {
    const errors = [];

    if (!record || typeof record !== 'object') {
      errors.push(`Record ${index}: Invalid record format`);
      return errors;
    }

    // Check required fields
    if (options.entityType) {
      const schema = this.getSchema(options.entityType);
      for (const [field, rules] of Object.entries(schema)) {
        if (rules.required && !record[field]) {
          errors.push(`Record ${index}: Missing required field '${field}'`);
        }

        if (record[field] && rules.type) {
          const actualType = typeof record[field];
          if (actualType !== rules.type) {
            errors.push(
              `Record ${index}: Field '${field}' should be ${rules.type}, got ${actualType}`
            );
          }
        }

        if (record[field] && rules.pattern) {
          if (!rules.pattern.test(record[field])) {
            errors.push(`Record ${index}: Field '${field}' does not match pattern`);
          }
        }

        if (record[field] && rules.minLength && record[field].length < rules.minLength) {
          errors.push(
            `Record ${index}: Field '${field}' is too short (min: ${rules.minLength})`
          );
        }

        if (record[field] && rules.maxLength && record[field].length > rules.maxLength) {
          errors.push(
            `Record ${index}: Field '${field}' is too long (max: ${rules.maxLength})`
          );
        }

        if (record[field] && rules.enum && !rules.enum.includes(record[field])) {
          errors.push(
            `Record ${index}: Field '${field}' has invalid value. Valid: ${rules.enum.join(', ')}`
          );
        }

        if (record[field] && rules.customValidator) {
          const isValid = rules.customValidator(record[field], record);
          if (!isValid) {
            errors.push(`Record ${index}: Field '${field}' failed custom validation`);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate data types
   */
  validateDataTypes(record, fieldTypes) {
    const errors = [];

    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      if (record.hasOwnProperty(field)) {
        const actualType = typeof record[field];
        if (actualType !== expectedType) {
          errors.push(
            `Field '${field}': Expected ${expectedType}, got ${actualType}`
          );
        }
      }
    }

    return errors;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  isValidDate(dateString) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Validate numeric range
   */
  isInRange(value, min, max) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Validate string length
   */
  isValidLength(str, minLength, maxLength) {
    return str.length >= minLength && str.length <= maxLength;
  }

  /**
   * Validate unique values (within dataset)
   */
  checkUnique(records, field) {
    const values = new Set();
    const duplicates = [];

    for (let i = 0; i < records.length; i++) {
      const value = records[i][field];
      if (values.has(value)) {
        duplicates.push({ index: i, value, field });
      } else {
        values.add(value);
      }
    }

    return {
      unique: duplicates.length === 0,
      duplicates,
      uniqueCount: values.size,
    };
  }

  /**
   * Validate business rules
   */
  validateBusinessRules(record, rules) {
    const errors = [];

    for (const rule of rules) {
      if (!rule.condition(record)) {
        errors.push(rule.message);
      }
    }

    return errors;
  }

  /**
   * Generate validation report
   */
  generateReport(validationResult) {
    return {
      summary: {
        totalRecords: validationResult.validCount + validationResult.invalidCount,
        validRecords: validationResult.validCount,
        invalidRecords: validationResult.invalidCount,
        validationRate:
          ((validationResult.validCount /
            (validationResult.validCount + validationResult.invalidCount)) *
            100).toFixed(2) + '%',
      },
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      details: validationResult.details.slice(0, 10), // First 10 failures
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get validation errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Clear errors
   */
  clearErrors() {
    this.errors = [];
    return this;
  }

  /**
   * Add custom validation rule
   */
  addRule(name, validationFn) {
    if (typeof validationFn !== 'function') {
      throw new Error('Validation function must be callable');
    }
    this[name] = validationFn;
    return this;
  }
}

/**
 * Pre-defined schemas for common entities
 */
const PREDEFINED_SCHEMAS = {
  BRANCH: {
    id: { required: true, type: 'string' },
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    location: { required: true, type: 'string' },
    status: {
      required: true,
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'CLOSED', 'SUSPENDED', 'PLANNED'],
    },
    manager: { required: false, type: 'string' },
    email: { required: true, type: 'string' },
    phone: { required: true, type: 'string' },
    address: { required: true, type: 'string' },
    city: { required: true, type: 'string' },
    country: { required: true, type: 'string' },
  },

  PRODUCT: {
    id: { required: true, type: 'string' },
    name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
    sku: { required: true, type: 'string' },
    category: { required: true, type: 'string' },
    price: { required: true, type: 'number' },
    quantity: { required: true, type: 'number' },
    description: { required: false, type: 'string' },
    supplier: { required: true, type: 'string' },
  },

  CUSTOMER: {
    id: { required: true, type: 'string' },
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    email: { required: true, type: 'string' },
    phone: { required: true, type: 'string' },
    address: { required: true, type: 'string' },
    city: { required: true, type: 'string' },
    country: { required: true, type: 'string' },
    type: { required: true, type: 'string', enum: ['INDIVIDUAL', 'CORPORATE'] },
  },

  TRANSACTION: {
    id: { required: true, type: 'string' },
    date: { required: true, type: 'string' },
    amount: { required: true, type: 'number' },
    type: { required: true, type: 'string', enum: ['DEBIT', 'CREDIT'] },
    description: { required: true, type: 'string' },
    reference: { required: false, type: 'string' },
  },
};

module.exports = { DataValidator, PREDEFINED_SCHEMAS };
