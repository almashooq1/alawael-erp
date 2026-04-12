/**
 * Unit Tests — validator.js
 * 100% pure sync — field validation, schema validation, sanitization
 */
'use strict';

const validator = require('../../services/validator');

beforeEach(() => {
  // Reset internal stats if needed
  if (typeof validator.getStats === 'function') {
    // fresh state
  }
});

// ═══════════════════════════════════════
//  isValidEmail
// ═══════════════════════════════════════
describe('isValidEmail', () => {
  it('valid email', () => {
    expect(validator.isValidEmail('test@example.com')).toBe(true);
  });
  it('valid with subdomain', () => {
    expect(validator.isValidEmail('user@mail.example.co.uk')).toBe(true);
  });
  it('invalid — no @', () => {
    expect(validator.isValidEmail('testexample.com')).toBe(false);
  });
  it('invalid — no domain', () => {
    expect(validator.isValidEmail('test@')).toBe(false);
  });
  it('invalid — empty', () => {
    expect(validator.isValidEmail('')).toBe(false);
  });
  it('invalid — spaces', () => {
    expect(validator.isValidEmail('test @example.com')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  isValidPhone
// ═══════════════════════════════════════
describe('isValidPhone', () => {
  it('valid phone (digits)', () => {
    expect(validator.isValidPhone('0501234567')).toBe(true);
  });
  it('valid with + prefix', () => {
    expect(validator.isValidPhone('+966501234567')).toBe(true);
  });
  it('invalid — too short', () => {
    expect(validator.isValidPhone('123')).toBe(false);
  });
  it('invalid — letters', () => {
    expect(validator.isValidPhone('abcdefghij')).toBe(false);
  });
  it('invalid — empty', () => {
    expect(validator.isValidPhone('')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  isValidUrl
// ═══════════════════════════════════════
describe('isValidUrl', () => {
  it('valid https', () => {
    expect(validator.isValidUrl('https://example.com')).toBe(true);
  });
  it('valid http', () => {
    expect(validator.isValidUrl('http://example.com/path?q=1')).toBe(true);
  });
  it('invalid — no protocol', () => {
    expect(validator.isValidUrl('example.com')).toBe(false);
  });
  it('invalid — empty', () => {
    expect(validator.isValidUrl('')).toBe(false);
  });
  it('invalid — random string', () => {
    expect(validator.isValidUrl('not a url')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  validateField
// ═══════════════════════════════════════
describe('validateField', () => {
  it('string type — valid', () => {
    expect(validator.validateField('hello', 'string')).toBe(true);
  });
  it('string type — invalid', () => {
    expect(validator.validateField(123, 'string')).toBe(false);
  });
  it('number type — valid', () => {
    expect(validator.validateField(42, 'number')).toBe(true);
  });
  it('number type — NaN invalid', () => {
    expect(validator.validateField(NaN, 'number')).toBe(false);
  });
  it('boolean type — valid', () => {
    expect(validator.validateField(true, 'boolean')).toBe(true);
  });
  it('array type — valid', () => {
    expect(validator.validateField([1, 2], 'array')).toBe(true);
  });
  it('array type — non-array invalid', () => {
    expect(validator.validateField('not array', 'array')).toBe(false);
  });
  it('object type — valid', () => {
    expect(validator.validateField({ a: 1 }, 'object')).toBe(true);
  });
  it('email type — valid', () => {
    expect(validator.validateField('a@b.com', 'email')).toBe(true);
  });
  it('email type — invalid', () => {
    expect(validator.validateField('notanemail', 'email')).toBe(false);
  });
  it('phone type — valid', () => {
    expect(validator.validateField('+966501234567', 'phone')).toBe(true);
  });
  it('url type — valid', () => {
    expect(validator.validateField('https://x.com', 'url')).toBe(true);
  });
  it('date type — valid', () => {
    expect(validator.validateField('2025-01-15', 'date')).toBe(true);
  });
  it('date type — invalid', () => {
    expect(validator.validateField('not-a-date', 'date')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  validate (schema-based)
// ═══════════════════════════════════════
describe('validate', () => {
  beforeEach(() => {
    validator.registerSchema('testSchema', {
      name: { type: 'string', required: true, minLength: 2, maxLength: 50 },
      age: { type: 'number', required: true, min: 0, max: 150 },
      email: { type: 'email', required: false },
      role: { type: 'string', enum: ['admin', 'user', 'guest'] },
    });
  });

  it('valid data → no errors', () => {
    const r = validator.validate({ name: 'أحمد', age: 30 }, 'testSchema');
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('missing required field → error', () => {
    const r = validator.validate({ age: 30 }, 'testSchema');
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('wrong type → error', () => {
    const r = validator.validate({ name: 'أحمد', age: 'thirty' }, 'testSchema');
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('age'))).toBe(true);
  });

  it('minLength violation → error', () => {
    const r = validator.validate({ name: 'A', age: 30 }, 'testSchema');
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('maxLength violation → error', () => {
    const r = validator.validate({ name: 'A'.repeat(51), age: 30 }, 'testSchema');
    expect(r.valid).toBe(false);
  });

  it('min violation → error', () => {
    const r = validator.validate({ name: 'أحمد', age: -1 }, 'testSchema');
    expect(r.valid).toBe(false);
  });

  it('max violation → error', () => {
    const r = validator.validate({ name: 'أحمد', age: 200 }, 'testSchema');
    expect(r.valid).toBe(false);
  });

  it('enum violation → error', () => {
    const r = validator.validate({ name: 'أحمد', age: 30, role: 'superadmin' }, 'testSchema');
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('role'))).toBe(true);
  });

  it('enum valid → ok', () => {
    const r = validator.validate({ name: 'أحمد', age: 30, role: 'admin' }, 'testSchema');
    expect(r.valid).toBe(true);
  });

  it('optional field missing → ok', () => {
    const r = validator.validate({ name: 'أحمد', age: 30 }, 'testSchema');
    expect(r.valid).toBe(true);
  });

  it('invalid email field → error', () => {
    const r = validator.validate({ name: 'أحمد', age: 30, email: 'bademail' }, 'testSchema');
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('email'))).toBe(true);
  });
});

// ═══════════════════════════════════════
//  sanitize
// ═══════════════════════════════════════
describe('sanitize', () => {
  it('strips < and >', () => {
    const r = validator.sanitize({ name: '<script>alert("x")</script>' });
    expect(r.name).not.toContain('<');
    expect(r.name).not.toContain('>');
  });

  it('leaves clean data unchanged', () => {
    const r = validator.sanitize({ name: 'أحمد', age: 30 });
    expect(r.name).toBe('أحمد');
    expect(r.age).toBe(30);
  });

  it('handles nested strings', () => {
    const r = validator.sanitize({ data: { html: '<b>bold</b>' } });
    if (r.data && typeof r.data.html === 'string') {
      expect(r.data.html).not.toContain('<');
    }
  });
});

// ═══════════════════════════════════════
//  validateRange
// ═══════════════════════════════════════
describe('validateRange', () => {
  it('within range', () => {
    expect(validator.validateRange(5, 1, 10)).toBe(true);
  });
  it('at min', () => {
    expect(validator.validateRange(1, 1, 10)).toBe(true);
  });
  it('at max', () => {
    expect(validator.validateRange(10, 1, 10)).toBe(true);
  });
  it('below min', () => {
    expect(validator.validateRange(0, 1, 10)).toBe(false);
  });
  it('above max', () => {
    expect(validator.validateRange(11, 1, 10)).toBe(false);
  });
});

// ═══════════════════════════════════════
//  validateUnique
// ═══════════════════════════════════════
describe('validateUnique', () => {
  it('unique array', () => {
    expect(validator.validateUnique([1, 2, 3])).toBe(true);
  });
  it('duplicates', () => {
    expect(validator.validateUnique([1, 2, 2])).toBe(false);
  });
  it('empty', () => {
    expect(validator.validateUnique([])).toBe(true);
  });
  it('strings', () => {
    expect(validator.validateUnique(['a', 'b', 'c'])).toBe(true);
    expect(validator.validateUnique(['a', 'a'])).toBe(false);
  });
});

// ═══════════════════════════════════════
//  registerRule + applyCustomRule
// ═══════════════════════════════════════
describe('custom rules', () => {
  it('register and apply', () => {
    validator.registerRule('isPositive', v => v > 0);
    expect(validator.applyCustomRule('isPositive', 5)).toBe(true);
    expect(validator.applyCustomRule('isPositive', -1)).toBe(false);
  });

  it('register and apply string rule', () => {
    validator.registerRule('startsWithA', v => typeof v === 'string' && v.startsWith('A'));
    expect(validator.applyCustomRule('startsWithA', 'Ahmad')).toBe(true);
    expect(validator.applyCustomRule('startsWithA', 'Basem')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  registerSchema
// ═══════════════════════════════════════
describe('registerSchema', () => {
  it('allows using registered schema', () => {
    validator.registerSchema('mini', { x: { type: 'number', required: true } });
    const r = validator.validate({ x: 5 }, 'mini');
    expect(r.valid).toBe(true);
  });
});

// ═══════════════════════════════════════
//  getStats
// ═══════════════════════════════════════
describe('getStats', () => {
  it('returns stats object with schemas and customRules', () => {
    const s = validator.getStats();
    expect(s).toBeDefined();
    expect(typeof s.schemas).toBe('number');
    expect(typeof s.customRules).toBe('number');
    expect(Array.isArray(s.schemaList)).toBe(true);
    expect(Array.isArray(s.rulesList)).toBe(true);
  });
});
