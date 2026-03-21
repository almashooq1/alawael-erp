/**
 * appConstants.test.js — Tests for app-wide constants and regex patterns.
 * اختبارات الثوابت العامة وأنماط التحقق
 */
import {
  ROLES,
  ROLE_LABELS,
  STATUS,
  STATUS_LABELS,
  PRIORITY,
  PRIORITY_LABELS,
  GENDER,
  GENDER_LABELS,
  BLOOD_TYPES,
  WEEKDAYS,
  PAGINATION,
  DATE_FORMATS,
  UPLOAD,
  NOTIFICATION_TYPES,
  AUTH,
  DEBOUNCE,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  PATTERNS,
} from '../utils/appConstants';

/* ====================================================================
 * ROLES
 * ==================================================================== */
describe('ROLES', () => {
  test('has 15 role keys', () => {
    expect(Object.keys(ROLES).length).toBe(15);
  });

  test('values are lowercase strings', () => {
    Object.values(ROLES).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v).toBe(v.toLowerCase());
    });
  });

  test('ROLE_LABELS has an Arabic label for every role', () => {
    Object.values(ROLES).forEach(roleVal => {
      expect(ROLE_LABELS).toHaveProperty(roleVal);
      expect(ROLE_LABELS[roleVal].length).toBeGreaterThan(0);
    });
  });
});

/* ====================================================================
 * STATUS / STATUS_LABELS
 * ==================================================================== */
describe('STATUS', () => {
  test('has at least 14 statuses', () => {
    expect(Object.keys(STATUS).length).toBeGreaterThanOrEqual(14);
  });

  test('STATUS_LABELS matches every STATUS value', () => {
    Object.values(STATUS).forEach(s => {
      expect(STATUS_LABELS).toHaveProperty(s);
    });
  });
});

/* ====================================================================
 * PRIORITY / GENDER
 * ==================================================================== */
describe('PRIORITY', () => {
  test('has 4 levels: urgent, high, medium, low', () => {
    expect(Object.values(PRIORITY).sort()).toEqual(['high', 'low', 'medium', 'urgent']);
  });

  test('PRIORITY_LABELS keys match PRIORITY values', () => {
    Object.values(PRIORITY).forEach(p => {
      expect(PRIORITY_LABELS).toHaveProperty(p);
    });
  });
});

describe('GENDER', () => {
  test('has male and female', () => {
    expect(GENDER.MALE).toBe('male');
    expect(GENDER.FEMALE).toBe('female');
  });

  test('GENDER_LABELS exist', () => {
    expect(GENDER_LABELS[GENDER.MALE]).toBeDefined();
    expect(GENDER_LABELS[GENDER.FEMALE]).toBeDefined();
  });
});

/* ====================================================================
 * BLOOD_TYPES
 * ==================================================================== */
describe('BLOOD_TYPES', () => {
  test('has exactly 8 types', () => {
    expect(BLOOD_TYPES).toHaveLength(8);
  });

  test('includes all standard ABO+Rh types', () => {
    ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].forEach(bt => {
      expect(BLOOD_TYPES).toContain(bt);
    });
  });
});

/* ====================================================================
 * WEEKDAYS
 * ==================================================================== */
describe('WEEKDAYS', () => {
  test('has 7 days', () => {
    expect(WEEKDAYS).toHaveLength(7);
  });

  test('values go from 0 to 6', () => {
    expect(WEEKDAYS.map(d => d.value)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('each day has a non-empty Arabic label', () => {
    WEEKDAYS.forEach(d => {
      expect(d.label.length).toBeGreaterThan(0);
    });
  });
});

/* ====================================================================
 * PAGINATION / DATE_FORMATS / UPLOAD / AUTH / DEBOUNCE
 * ==================================================================== */
describe('PAGINATION', () => {
  test('DEFAULT_PAGE is 1', () => {
    expect(PAGINATION.DEFAULT_PAGE).toBe(1);
  });

  test('DEFAULT_LIMIT is 10', () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBe(10);
  });

  test('LIMIT_OPTIONS is sorted ascending', () => {
    const sorted = [...PAGINATION.LIMIT_OPTIONS].sort((a, b) => a - b);
    expect(PAGINATION.LIMIT_OPTIONS).toEqual(sorted);
  });
});

describe('DATE_FORMATS', () => {
  test('has DATE, DATETIME, TIME formats', () => {
    expect(DATE_FORMATS.DATE).toBeDefined();
    expect(DATE_FORMATS.DATETIME).toBeDefined();
    expect(DATE_FORMATS.TIME).toBeDefined();
  });
});

describe('UPLOAD', () => {
  test('MAX_IMAGE_SIZE is 5 MB', () => {
    expect(UPLOAD.MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
  });

  test('MAX_DOC_SIZE is 20 MB', () => {
    expect(UPLOAD.MAX_DOC_SIZE).toBe(20 * 1024 * 1024);
  });

  test('ALLOWED_IMAGE_EXT includes .jpg and .png', () => {
    expect(UPLOAD.ALLOWED_IMAGE_EXT).toContain('.jpg');
    expect(UPLOAD.ALLOWED_IMAGE_EXT).toContain('.png');
  });

  test('ALLOWED_DOC_EXT includes .pdf', () => {
    expect(UPLOAD.ALLOWED_DOC_EXT).toContain('.pdf');
  });
});

describe('AUTH', () => {
  test('SESSION_TIMEOUT is 30 minutes', () => {
    expect(AUTH.SESSION_TIMEOUT).toBe(30 * 60 * 1000);
  });
});

describe('DEBOUNCE', () => {
  test('SEARCH is 300ms', () => {
    expect(DEBOUNCE.SEARCH).toBe(300);
  });

  test('all values are positive numbers', () => {
    Object.values(DEBOUNCE).forEach(v => {
      expect(v).toBeGreaterThan(0);
    });
  });
});

/* ====================================================================
 * APPOINTMENT_STATUS / PAYMENT_STATUS / LEAVE_TYPES
 * ==================================================================== */
describe('APPOINTMENT_STATUS', () => {
  test('has at least 6 statuses', () => {
    expect(Object.keys(APPOINTMENT_STATUS).length).toBeGreaterThanOrEqual(6);
  });

  test('labels match all statuses', () => {
    Object.values(APPOINTMENT_STATUS).forEach(s => {
      expect(APPOINTMENT_STATUS_LABELS).toHaveProperty(s);
    });
  });
});

describe('PAYMENT_STATUS', () => {
  test('includes pending, paid, partial', () => {
    expect(PAYMENT_STATUS.PENDING).toBe('pending');
    expect(PAYMENT_STATUS.PAID).toBe('paid');
    expect(PAYMENT_STATUS.PARTIAL).toBe('partial');
  });

  test('labels match all statuses', () => {
    Object.values(PAYMENT_STATUS).forEach(s => {
      expect(PAYMENT_STATUS_LABELS).toHaveProperty(s);
    });
  });
});

describe('LEAVE_TYPES', () => {
  test('has at least 7 leave types', () => {
    expect(Object.keys(LEAVE_TYPES).length).toBeGreaterThanOrEqual(7);
  });

  test('labels match all types', () => {
    Object.values(LEAVE_TYPES).forEach(lt => {
      expect(LEAVE_TYPE_LABELS).toHaveProperty(lt);
    });
  });

  test('includes hajj (Saudi-specific)', () => {
    expect(LEAVE_TYPES.HAJJ).toBe('hajj');
  });
});

/* ====================================================================
 * PATTERNS — Regex validation (most critical tests)
 * ==================================================================== */
describe('PATTERNS.SAUDI_ID', () => {
  const p = PATTERNS.SAUDI_ID;

  test.each([
    ['1012345678', true], // starts with 1 (citizen)
    ['2012345678', true], // starts with 2 (resident)
  ])('%s → %s', (id, expected) => {
    expect(p.test(id)).toBe(expected);
  });

  test.each([
    ['3012345678', false], // starts with 3
    ['101234567', false], // 9 digits
    ['10123456789', false], // 11 digits
    ['abcdefghij', false],
  ])('%s → %s (invalid)', (id, expected) => {
    expect(p.test(id)).toBe(expected);
  });
});

describe('PATTERNS.SAUDI_PHONE', () => {
  const p = PATTERNS.SAUDI_PHONE;

  test.each([
    ['0512345678', true],
    ['0598765432', true],
    ['966512345678', true],
    ['+966512345678', true],
  ])('%s → valid', (phone, expected) => {
    expect(p.test(phone)).toBe(expected);
  });

  test.each([
    ['0612345678', false], // 06 not 05
    ['05123456', false], // too short
    ['051234567890', false], // too long
    ['abc', false],
  ])('%s → invalid', (phone, expected) => {
    expect(p.test(phone)).toBe(expected);
  });
});

describe('PATTERNS.EMAIL', () => {
  const p = PATTERNS.EMAIL;

  test.each([
    ['test@example.com', true],
    ['user.name@domain.co', true],
    ['a@b.c', true],
  ])('%s → valid', (email, expected) => {
    expect(p.test(email)).toBe(expected);
  });

  test.each([
    ['@example.com', false],
    ['test@', false],
    ['test@ .com', false],
    ['', false],
  ])('%s → invalid', (email, expected) => {
    expect(p.test(email)).toBe(expected);
  });
});

describe('PATTERNS.SAUDI_IBAN', () => {
  const p = PATTERNS.SAUDI_IBAN;

  test('valid IBAN format', () => {
    expect(p.test('SA0380000000608010167519')).toBe(true);
  });

  test.each([
    ['US0380000000608010167519', false], // wrong country
    ['SA03', false], // too short
    ['sa0380000000608010167519', true], // case insensitive
  ])('%s → %s', (iban, expected) => {
    expect(p.test(iban)).toBe(expected);
  });
});

describe('PATTERNS.VAT_NUMBER', () => {
  const p = PATTERNS.VAT_NUMBER;

  test('valid: starts with 3, 15 digits, ends with 3', () => {
    expect(p.test('300012345678903')).toBe(true);
  });

  test.each([
    ['200012345678903', false], // starts with 2
    ['300012345678904', false], // ends with 4
    ['30001234567890', false], // 14 digits
  ])('%s → invalid', (vat, expected) => {
    expect(p.test(vat)).toBe(expected);
  });
});

describe('PATTERNS.CR_NUMBER', () => {
  const p = PATTERNS.CR_NUMBER;

  test('valid: 10 digits', () => {
    expect(p.test('1234567890')).toBe(true);
  });

  test.each([
    ['123456789', false], // 9 digits
    ['12345678901', false], // 11 digits
    ['abcdefghij', false],
  ])('%s → invalid', (cr, expected) => {
    expect(p.test(cr)).toBe(expected);
  });
});

describe('PATTERNS.ARABIC_ONLY', () => {
  const p = PATTERNS.ARABIC_ONLY;

  test('accepts Arabic text', () => {
    expect(p.test('مرحبا بالعالم')).toBe(true);
  });

  test('accepts Arabic with numbers and punctuation', () => {
    expect(p.test('الفاتورة رقم 123، بقيمة 500!')).toBe(true);
  });

  test('rejects English text', () => {
    expect(p.test('Hello World')).toBe(false);
  });

  test('rejects mixed Arabic and English', () => {
    expect(p.test('مرحبا Hello')).toBe(false);
  });
});

/* ====================================================================
 * NOTIFICATION_TYPES
 * ==================================================================== */
describe('NOTIFICATION_TYPES', () => {
  test('has success, error, warning, info', () => {
    expect(NOTIFICATION_TYPES.SUCCESS).toBe('success');
    expect(NOTIFICATION_TYPES.ERROR).toBe('error');
    expect(NOTIFICATION_TYPES.WARNING).toBe('warning');
    expect(NOTIFICATION_TYPES.INFO).toBe('info');
  });
});
