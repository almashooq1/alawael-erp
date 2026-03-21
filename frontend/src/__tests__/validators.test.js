/**
 * validators.js — Unit Tests
 * اختبارات وحدة لمكتبة التحقق من البيانات
 */
import {
  isValidSaudiId,
  isValidSaudiPhone,
  isValidEmail,
  isValidSaudiIBAN,
  isValidCR,
  isValidVAT,
  isRequired,
  minLength,
  maxLength,
  inRange,
  isPositiveNumber,
  isValidUrl,
  isArabicOnly,
  validatePassword,
  createFieldValidator,
} from 'utils/validators';

// ═══════════════════════════════════════════════════════════════════
// isValidSaudiId
// ═══════════════════════════════════════════════════════════════════
describe('isValidSaudiId', () => {
  test('accepts valid citizen ID starting with 1', () => {
    expect(isValidSaudiId('1234567890')).toBe(true);
  });

  test('accepts valid resident ID starting with 2', () => {
    expect(isValidSaudiId('2345678901')).toBe(true);
  });

  test('rejects ID starting with 3', () => {
    expect(isValidSaudiId('3456789012')).toBe(false);
  });

  test('rejects short ID (less than 10 digits)', () => {
    expect(isValidSaudiId('123456789')).toBe(false);
  });

  test('rejects long ID (more than 10 digits)', () => {
    expect(isValidSaudiId('12345678901')).toBe(false);
  });

  test('trims whitespace', () => {
    expect(isValidSaudiId('1234 567890')).toBe(true);
  });

  test('rejects null/undefined/empty', () => {
    expect(isValidSaudiId(null)).toBe(false);
    expect(isValidSaudiId(undefined)).toBe(false);
    expect(isValidSaudiId('')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(isValidSaudiId(1234567890)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isValidSaudiPhone
// ═══════════════════════════════════════════════════════════════════
describe('isValidSaudiPhone', () => {
  test('accepts 05xxxxxxxx format', () => {
    expect(isValidSaudiPhone('0512345678')).toBe(true);
  });

  test('accepts 9665xxxxxxxx format', () => {
    expect(isValidSaudiPhone('966512345678')).toBe(true);
  });

  test('accepts +9665xxxxxxxx format', () => {
    expect(isValidSaudiPhone('+966512345678')).toBe(true);
  });

  test('strips dashes and spaces', () => {
    expect(isValidSaudiPhone('05-1234-5678')).toBe(true);
    expect(isValidSaudiPhone('051 234 5678')).toBe(true);
  });

  test('rejects non-Saudi numbers', () => {
    expect(isValidSaudiPhone('0612345678')).toBe(false);
    expect(isValidSaudiPhone('+1234567890')).toBe(false);
  });

  test('rejects null/empty', () => {
    expect(isValidSaudiPhone(null)).toBe(false);
    expect(isValidSaudiPhone('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isValidEmail
// ═══════════════════════════════════════════════════════════════════
describe('isValidEmail', () => {
  test('accepts valid emails', () => {
    expect(isValidEmail('user@domain.com')).toBe(true);
    expect(isValidEmail('test.name@domain.co')).toBe(true);
    expect(isValidEmail('admin@alawael.com')).toBe(true);
  });

  test('trims whitespace', () => {
    expect(isValidEmail(' user@domain.com ')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user domain.com')).toBe(false);
    expect(isValidEmail('nodomain')).toBe(false);
  });

  test('rejects null/empty', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isValidSaudiIBAN
// ═══════════════════════════════════════════════════════════════════
describe('isValidSaudiIBAN', () => {
  test('accepts valid IBAN (SA + 2 digits + 20 chars)', () => {
    expect(isValidSaudiIBAN('SA0380000000608010167519')).toBe(true);
  });

  test('handles spaces and lowercase', () => {
    expect(isValidSaudiIBAN('sa03 8000 0000 6080 1016 7519')).toBe(true);
  });

  test('rejects non-SA IBANs', () => {
    expect(isValidSaudiIBAN('AE070331234567890123456')).toBe(false);
  });

  test('rejects short/null', () => {
    expect(isValidSaudiIBAN('SA123')).toBe(false);
    expect(isValidSaudiIBAN(null)).toBe(false);
    expect(isValidSaudiIBAN('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isValidCR (Commercial Registration)
// ═══════════════════════════════════════════════════════════════════
describe('isValidCR', () => {
  test('accepts 10-digit CR', () => {
    expect(isValidCR('1234567890')).toBe(true);
  });

  test('strips spaces', () => {
    expect(isValidCR('12345 67890')).toBe(true);
  });

  test('rejects wrong length', () => {
    expect(isValidCR('123456789')).toBe(false);
    expect(isValidCR('12345678901')).toBe(false);
  });

  test('rejects null/empty', () => {
    expect(isValidCR(null)).toBe(false);
    expect(isValidCR('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isValidVAT
// ═══════════════════════════════════════════════════════════════════
describe('isValidVAT', () => {
  test('accepts valid 15-digit VAT (starts and ends with 3)', () => {
    expect(isValidVAT('300000000000003')).toBe(true);
    expect(isValidVAT('312345678901233')).toBe(true);
  });

  test('rejects VAT not starting with 3', () => {
    expect(isValidVAT('200000000000003')).toBe(false);
  });

  test('rejects VAT not ending with 3', () => {
    expect(isValidVAT('300000000000001')).toBe(false);
  });

  test('rejects null/empty', () => {
    expect(isValidVAT(null)).toBe(false);
    expect(isValidVAT('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isRequired
// ═══════════════════════════════════════════════════════════════════
describe('isRequired', () => {
  test('returns true for non-empty strings', () => {
    expect(isRequired('hello')).toBe(true);
    expect(isRequired('0')).toBe(true);
  });

  test('returns false for empty/whitespace strings', () => {
    expect(isRequired('')).toBe(false);
    expect(isRequired('   ')).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(isRequired(null)).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// minLength / maxLength
// ═══════════════════════════════════════════════════════════════════
describe('minLength', () => {
  test('returns true when value meets minimum', () => {
    expect(minLength('abc', 3)).toBe(true);
    expect(minLength('abcd', 3)).toBe(true);
  });

  test('returns false when value is too short', () => {
    expect(minLength('ab', 3)).toBe(false);
  });

  test('handles null/undefined by treating as empty string', () => {
    expect(minLength(null, 1)).toBe(false);
    expect(minLength(undefined, 1)).toBe(false);
  });
});

describe('maxLength', () => {
  test('returns true when value is within limit', () => {
    expect(maxLength('ab', 3)).toBe(true);
    expect(maxLength('abc', 3)).toBe(true);
  });

  test('returns false when value exceeds limit', () => {
    expect(maxLength('abcd', 3)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// inRange / isPositiveNumber
// ═══════════════════════════════════════════════════════════════════
describe('inRange', () => {
  test('returns true for value within range', () => {
    expect(inRange(5, 1, 10)).toBe(true);
    expect(inRange(1, 1, 10)).toBe(true);
    expect(inRange(10, 1, 10)).toBe(true);
  });

  test('returns false for value outside range', () => {
    expect(inRange(0, 1, 10)).toBe(false);
    expect(inRange(11, 1, 10)).toBe(false);
  });

  test('handles string numbers', () => {
    expect(inRange('5', 1, 10)).toBe(true);
  });

  test('returns false for NaN', () => {
    expect(inRange('abc', 1, 10)).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  test('returns true for positive', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0.5)).toBe(true);
  });

  test('returns false for zero, negative, NaN', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber('abc')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isValidUrl
// ═══════════════════════════════════════════════════════════════════
describe('isValidUrl', () => {
  test('accepts valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  test('rejects invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isArabicOnly
// ═══════════════════════════════════════════════════════════════════
describe('isArabicOnly', () => {
  test('accepts Arabic text', () => {
    expect(isArabicOnly('مرحبا بالعالم')).toBe(true);
    expect(isArabicOnly('اختبار 123')).toBe(true);
  });

  test('rejects English text', () => {
    expect(isArabicOnly('Hello')).toBe(false);
  });

  test('rejects null/empty', () => {
    expect(isArabicOnly(null)).toBe(false);
    expect(isArabicOnly('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// validatePassword
// ═══════════════════════════════════════════════════════════════════
describe('validatePassword', () => {
  test('accepts strong password', () => {
    const result = validatePassword('Admin@123456');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects short password', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects password without uppercase', () => {
    const result = validatePassword('admin@123456');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('يجب أن تحتوي على حرف كبير');
  });

  test('rejects password without lowercase', () => {
    const result = validatePassword('ADMIN@123456');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('يجب أن تحتوي على حرف صغير');
  });

  test('rejects password without digit', () => {
    const result = validatePassword('Admin@abcde');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('يجب أن تحتوي على رقم');
  });

  test('rejects password without special char', () => {
    const result = validatePassword('Admin12345a');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('يجب أن تحتوي على رمز خاص');
  });

  test('rejects null/undefined', () => {
    expect(validatePassword(null).valid).toBe(false);
    expect(validatePassword(undefined).valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// createFieldValidator
// ═══════════════════════════════════════════════════════════════════
describe('createFieldValidator', () => {
  test('validates required fields', () => {
    const validate = createFieldValidator({ required: true });
    expect(validate('')).toBe('هذا الحقل مطلوب');
    expect(validate('hello')).toBeNull();
  });

  test('validates email fields', () => {
    const validate = createFieldValidator({ email: true });
    expect(validate('bad')).toBe('البريد الإلكتروني غير صالح');
    expect(validate('ok@test.com')).toBeNull();
  });

  test('validates phone fields', () => {
    const validate = createFieldValidator({ phone: true });
    expect(validate('123')).toBe('رقم الجوال غير صالح');
    expect(validate('0512345678')).toBeNull();
  });

  test('validates Saudi ID fields', () => {
    const validate = createFieldValidator({ saudiId: true });
    expect(validate('123')).toBe('رقم الهوية غير صالح');
    expect(validate('1234567890')).toBeNull();
  });

  test('validates minLength', () => {
    const validate = createFieldValidator({ minLength: 5 });
    expect(validate('ab')).toBe('الحد الأدنى 5 حرف');
    expect(validate('abcde')).toBeNull();
  });

  test('validates maxLength', () => {
    const validate = createFieldValidator({ maxLength: 3 });
    expect(validate('abcd')).toBe('الحد الأقصى 3 حرف');
    expect(validate('abc')).toBeNull();
  });

  test('validates custom pattern', () => {
    const validate = createFieldValidator({ pattern: /^\d+$/, patternMsg: 'أرقام فقط' });
    expect(validate('abc')).toBe('أرقام فقط');
    expect(validate('123')).toBeNull();
  });

  test('validates custom function', () => {
    const validate = createFieldValidator({
      custom: v => (v === 'bad' ? 'قيمة غير مقبولة' : null),
    });
    expect(validate('bad')).toBe('قيمة غير مقبولة');
    expect(validate('good')).toBeNull();
  });

  test('returns null for empty non-required fields', () => {
    const validate = createFieldValidator({ email: true });
    expect(validate('')).toBeNull();
  });
});
