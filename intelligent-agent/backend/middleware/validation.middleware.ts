/**
 * ============================================
 * REQUEST VALIDATION MIDDLEWARE
 * برنامج التحقق من صحة الطلب
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { globalLogger } from '../utils/advanced.logger';

/**
 * Validation Rule Type
 */
interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  custom?: (value: any) => boolean | string;
}

/**
 * Validator Class
 */
class Validator {
  private rules: ValidationRule[] = [];

  addRule(rule: ValidationRule): this {
    this.rules.push(rule);
    return this;
  }

  validate(data: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};

    for (const rule of this.rules) {
      const value = data[rule.field];
      const fieldErrors: string[] = [];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${rule.field} is required`);
        errors[rule.field] = fieldErrors;
        continue;
      }

      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type && rule.type !== 'object') {
        fieldErrors.push(`${rule.field} must be ${rule.type}`);
      }

      // String validations
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.min && value.length < rule.min) {
          fieldErrors.push(`${rule.field} must be at least ${rule.min} characters`);
        }
        if (rule.max && value.length > rule.max) {
          fieldErrors.push(`${rule.field} must be at most ${rule.max} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          fieldErrors.push(`${rule.field} format is invalid`);
        }
      }

      // Email validation
      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          fieldErrors.push(`${rule.field} must be a valid email`);
        }
      }

      // URL validation
      if (rule.type === 'url') {
        try {
          new URL(value);
        } catch {
          fieldErrors.push(`${rule.field} must be a valid URL`);
        }
      }

      // Number validations
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min && value < rule.min) {
          fieldErrors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max && value > rule.max) {
          fieldErrors.push(`${rule.field} must be at most ${rule.max}`);
        }
      }

      // Allowed values
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        fieldErrors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          fieldErrors.push(typeof result === 'string' ? result : `${rule.field} validation failed`);
        }
      }

      if (fieldErrors.length > 0) {
        errors[rule.field] = fieldErrors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

/**
 * Validation Middleware Factory
 */
export function validateRequest(
  rules: ValidationRule[],
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validator = new Validator();
    rules.forEach(rule => validator.addRule(rule));

    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const validation = validator.validate(data as Record<string, any>);

    if (!validation.valid) {
      globalLogger.warn('Request validation failed', 'ValidateRequest', {
        source,
        errors: validation.errors,
        path: req.path,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    next();
  };
}

/**
 * Response Validation Middleware
 */
export function validateResponse(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: any) {
      if (data && typeof data === 'object') {
        const validator = new Validator();
        rules.forEach(rule => validator.addRule(rule));

        const validation = validator.validate(data);

        if (!validation.valid) {
          globalLogger.error('Response validation failed', undefined, 'ValidateResponse', {
            path: req.path,
            errors: validation.errors,
          });
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Sanitization helpers
 */
export const sanitize = {
  /**
   * Trim and lowercase
   */
  email: (value: string): string => {
    return value.trim().toLowerCase();
  },

  /**
   * Trim whitespace
   */
  string: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  },

  /**
   * Remove HTML tags
   */
  html: (value: string): string => {
    return value.replace(/<[^>]*>/g, '').trim();
  },

  /**
   * Remove special characters
   */
  alphanumeric: (value: string): string => {
    return value.replace(/[^a-zA-Z0-9]/g, '');
  },

  /**
   * Parse as integer
   */
  integer: (value: any): number => {
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Parse as float
   */
  float: (value: any): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Parse as boolean
   */
  boolean: (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return Boolean(value);
  },
};

/**
 * Sanitization Middleware Factory
 */
export function sanitizeRequest(
  fields: Record<string, keyof typeof sanitize>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    Object.entries(fields).forEach(([field, sanitizer]) => {
      if (data[field] !== undefined) {
        data[field] = sanitize[sanitizer](data[field]);
      }
    });

    next();
  };
}

/**
 * Request Size Limiter
 */
export function limitRequestSize(maxBytes: number = 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        globalLogger.warn('Request size exceeded', 'LimitRequestSize', {
          size,
          maxBytes,
          path: req.path,
        });
        res.status(413).json({
          status: 'error',
          message: 'Payload too large',
        });
        req.destroy();
      }
    });

    next();
  };
}

/**
 * Rate Limiting with Token Bucket
 */
export class RateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private capacity: number;
  private refillRate: number;
  private windowMs: number;

  constructor(capacity: number = 100, refillRatePerSecond: number = 10) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSecond;
    this.windowMs = 1000;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const allowed = this.isAllowed(key);

      res.set('X-RateLimit-Limit', String(this.capacity));
      res.set('X-RateLimit-Remaining', String(this.getRemainingTokens(key)));

      if (!allowed) {
        globalLogger.warn('Rate limit exceeded', 'RateLimiter', {
          key,
          path: req.path,
        });
        return res.status(429).json({
          status: 'error',
          message: 'Too many requests',
          retryAfter: 1,
        });
      }

      next();
    };
  }

  private getKey(req: Request): string {
    return req.ip || 'unknown';
  }

  private isAllowed(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
      return true;
    }

    // Refill tokens
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.windowMs) * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  private getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key);
    return bucket ? Math.floor(bucket.tokens) : this.capacity;
  }
}

export default {
  validateRequest,
  validateResponse,
  sanitize,
  sanitizeRequest,
  limitRequestSize,
  RateLimiter,
  Validator,
};
