/**
 * ============================================
 * ADVANCED VALIDATION MIDDLEWARE ENHANCER
 * محسّن البرمجيات الوسيطة للتحقق المتقدم
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { globalLogger } from './advanced.logger';
import { globalErrorTracker, ErrorCategory } from './error.tracker';

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | Promise<boolean>;
  message?: string;
}

interface ValidatorOptions {
  rules: ValidationRule[];
  stopOnFirstError?: boolean;
  sanitize?: boolean;
  customErrorHandler?: (errors: ValidationError[]) => any;
}

interface ValidationError {
  field: string;
  value: any;
  message: string;
  type: string;
}

class AdvancedValidator {
  /**
   * Validate data against rules
   */
  async validate(
    data: any,
    options: ValidatorOptions
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];

    for (const rule of options.rules) {
      try {
        const value = this.getNestedValue(data, rule.field);

        // Required check
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push({
            field: rule.field,
            value,
            message: rule.message || `${rule.field} is required`,
            type: 'required',
          });

          if (options.stopOnFirstError) break;
          continue;
        }

        if (value === undefined || value === null) continue;

        // Type validation
        if (!this.validateType(value, rule.type)) {
          errors.push({
            field: rule.field,
            value,
            message: rule.message || `${rule.field} must be of type ${rule.type}`,
            type: 'type',
          });

          if (options.stopOnFirstError) break;
          continue;
        }

        // Min validation
        if (rule.min !== undefined) {
          if (
            (typeof value === 'string' && value.length < rule.min) ||
            (typeof value === 'number' && value < rule.min) ||
            (Array.isArray(value) && value.length < rule.min)
          ) {
            errors.push({
              field: rule.field,
              value,
              message: rule.message || `${rule.field} must be at least ${rule.min}`,
              type: 'min',
            });

            if (options.stopOnFirstError) break;
            continue;
          }
        }

        // Max validation
        if (rule.max !== undefined) {
          if (
            (typeof value === 'string' && value.length > rule.max) ||
            (typeof value === 'number' && value > rule.max) ||
            (Array.isArray(value) && value.length > rule.max)
          ) {
            errors.push({
              field: rule.field,
              value,
              message: rule.message || `${rule.field} must be at most ${rule.max}`,
              type: 'max',
            });

            if (options.stopOnFirstError) break;
            continue;
          }
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push({
            field: rule.field,
            value,
            message: rule.message || `${rule.field} format is invalid`,
            type: 'pattern',
          });

          if (options.stopOnFirstError) break;
          continue;
        }

        // Custom validation
        if (rule.custom) {
          const isValid = await rule.custom(value);
          if (!isValid) {
            errors.push({
              field: rule.field,
              value,
              message: rule.message || `${rule.field} validation failed`,
              type: 'custom',
            });

            if (options.stopOnFirstError) break;
          }
        }
      } catch (error) {
        globalLogger.error(
          `Validation error on field ${rule.field}`,
          'AdvancedValidator',
          error as Error
        );

        errors.push({
          field: rule.field,
          value: this.getNestedValue(data, rule.field),
          message: `Validation error: ${(error as Error).message}`,
          type: 'error',
        });

        if (options.stopOnFirstError) break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(String(value)));
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }

  /**
   * Sanitize input
   */
  sanitize(data: any, rules: ValidationRule[]): any {
    const sanitized = { ...data };

    for (const rule of rules) {
      const value = this.getNestedValue(sanitized, rule.field);

      if (value === undefined || value === null) continue;

      switch (rule.type) {
        case 'string':
          this.setNestedValue(sanitized, rule.field, String(value).trim());
          break;
        case 'number':
          this.setNestedValue(sanitized, rule.field, Number(value));
          break;
        case 'email':
          this.setNestedValue(sanitized, rule.field, String(value).toLowerCase().trim());
          break;
        case 'date':
          this.setNestedValue(sanitized, rule.field, new Date(value));
          break;
      }
    }

    return sanitized;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    const lastPart = parts.pop();

    if (!lastPart) return;

    let current = obj;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[lastPart] = value;
  }
}

export const advancedValidator = new AdvancedValidator();

/**
 * Express middleware factory
 */
export function createValidationMiddleware(options: ValidatorOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const result = await advancedValidator.validate(body, options);

      if (!result.valid) {
        const errorId = globalErrorTracker.trackError(new Error('Validation failed'), {
          category: ErrorCategory.VALIDATION,
          context: {
            endpoint: req.path,
            errors: result.errors,
          },
          statusCode: 400,
        });

        if (options.customErrorHandler) {
          return res.status(400).json(options.customErrorHandler(result.errors));
        }

        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: result.errors,
          errorId,
        });
      }

      // Sanitize if enabled
      if (options.sanitize) {
        req.body = advancedValidator.sanitize(body, options.rules);
      }

      next();
    } catch (error) {
      globalLogger.error('Validation middleware error', 'ValidatorMiddleware', error as Error);

      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.INTERNAL,
        context: { endpoint: req.path },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal validation error',
        errorId,
      });
    }
  };
}

/**
 * Predefined validation rule sets
 */

export const EMPLOYEE_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'firstName',
    type: 'string',
    required: true,
    min: 2,
    max: 50,
    message: 'First name must be 2-50 characters',
  },
  {
    field: 'lastName',
    type: 'string',
    required: true,
    min: 2,
    max: 50,
    message: 'Last name must be 2-50 characters',
  },
  {
    field: 'email',
    type: 'email',
    required: true,
    message: 'Valid email is required',
  },
  {
    field: 'phone',
    type: 'string',
    pattern: /^[\d\s\-\+\(\)]+$/,
    message: 'Invalid phone number format',
  },
  {
    field: 'department',
    type: 'string',
    required: true,
    message: 'Department is required',
  },
  {
    field: 'position',
    type: 'string',
    required: true,
    message: 'Position is required',
  },
  {
    field: 'salary',
    type: 'number',
    min: 0,
    message: 'Salary must be a positive number',
  },
  {
    field: 'employmentType',
    type: 'string',
    custom: value => ['Full-time', 'Part-time', 'Contract', 'Intern'].includes(value),
    message: 'Invalid employment type',
  },
];

export const LEAVE_REQUEST_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'type',
    type: 'string',
    required: true,
    custom: value => ['Annual', 'Sick', 'Personal', 'Maternity', 'Paternity'].includes(value),
    message: 'Invalid leave type',
  },
  {
    field: 'startDate',
    type: 'date',
    required: true,
    message: 'Start date is required',
  },
  {
    field: 'endDate',
    type: 'date',
    required: true,
    message: 'End date is required',
  },
  {
    field: 'reason',
    type: 'string',
    min: 5,
    max: 500,
    message: 'Reason must be 5-500 characters',
  },
];

export const PERFORMANCE_EVALUATION_RULES: ValidationRule[] = [
  {
    field: 'rating',
    type: 'number',
    required: true,
    min: 1,
    max: 5,
    message: 'Rating must be between 1 and 5',
  },
  {
    field: 'reviewer',
    type: 'string',
    required: true,
    message: 'Reviewer is required',
  },
  {
    field: 'comments',
    type: 'string',
    min: 10,
    max: 1000,
    message: 'Comments must be 10-1000 characters',
  },
];
