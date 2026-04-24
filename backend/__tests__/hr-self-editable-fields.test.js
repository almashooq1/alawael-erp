/**
 * hr-self-editable-fields.test.js — Phase 11 Commit 9 (4.0.26).
 *
 * Pure-function coverage over the self-update whitelist + validators.
 * No DB, no mongoose.
 */

'use strict';

const {
  WHITELIST,
  isEditable,
  validatePatch,
  __validators,
} = require('../config/hr-self-editable-fields');

// ─── Whitelist shape ────────────────────────────────────────────

describe('whitelist shape', () => {
  it('freezes the whitelist map', () => {
    expect(Object.isFrozen(WHITELIST)).toBe(true);
  });

  it('only contains contact/address/emergency_contact paths', () => {
    const expected = new Set([
      'phone',
      'phone2',
      'personal_email',
      'address',
      'city',
      'postal_code',
      'emergency_contact.name',
      'emergency_contact.phone',
      'emergency_contact.relation',
    ]);
    expect(new Set(Object.keys(WHITELIST))).toEqual(expected);
  });

  it('rejects employment-defining fields', () => {
    const denied = [
      'basic_salary',
      'housing_allowance',
      'job_title_ar',
      'department',
      'status',
      'contract_type',
      'hire_date',
      'probation_end_date',
      'branch_id',
      'user_id',
      'national_id',
      'iqama_number',
      'passport_number',
      'scfhs_number',
      'scfhs_expiry',
      'iban',
      'email', // work email is managed by IT/HR, not self
    ];
    for (const f of denied) expect(isEditable(f)).toBe(false);
  });
});

// ─── Saudi phone validator ──────────────────────────────────────

describe('validateSaudiPhone', () => {
  const v = __validators.validateSaudiPhone;

  it.each([
    ['0501234567', null],
    ['0599999999', null],
    ['501234567', null],
    ['+966501234567', null],
    ['00966501234567', null],
    ['', null], // optional — empty clears
    [null, null],
    [undefined, null],
  ])('accepts %s', (input, expected) => {
    expect(v(input)).toBe(expected);
  });

  it.each([
    ['0412345678', 'must be a valid Saudi mobile number'],
    ['050123', 'must be a valid Saudi mobile number'],
    ['050123456789', 'must be a valid Saudi mobile number'],
    ['abcdefghij', 'must be a valid Saudi mobile number'],
  ])('rejects %s', (input, expected) => {
    expect(v(input)).toBe(expected);
  });
});

// ─── Other validators ───────────────────────────────────────────

describe('validateOptionalEmail', () => {
  const v = __validators.validateOptionalEmail;
  it('accepts valid email', () => expect(v('a@b.co')).toBeNull());
  it('accepts empty', () => expect(v('')).toBeNull());
  it('rejects missing @', () => expect(v('abc.co')).toMatch(/valid email/));
  it('rejects non-string', () => expect(v(123)).toMatch(/string/));
});

describe('validateOptionalPostalCode', () => {
  const v = __validators.validateOptionalPostalCode;
  it('accepts 5-digit', () => expect(v('12345')).toBeNull());
  it('rejects 4-digit', () => expect(v('1234')).toMatch(/5-digit/));
  it('rejects letters', () => expect(v('1234a')).toMatch(/5-digit/));
  it('accepts empty', () => expect(v('')).toBeNull());
});

describe('validateRelation', () => {
  const v = __validators.validateRelation;
  it.each(['spouse', 'parent', 'sibling', 'child', 'relative', 'other'])('accepts %s', r =>
    expect(v(r)).toBeNull()
  );
  it('accepts empty', () => expect(v('')).toBeNull());
  it('rejects unknown value', () => expect(v('friend')).toMatch(/must be one of/));
});

// ─── validatePatch ──────────────────────────────────────────────

describe('validatePatch — structure', () => {
  it('rejects null', () => {
    expect(validatePatch(null).ok).toBe(false);
  });

  it('rejects array', () => {
    expect(validatePatch([]).ok).toBe(false);
  });

  it('rejects primitive', () => {
    expect(validatePatch('nope').ok).toBe(false);
  });

  it('flags empty patch as no-op (ok but empty)', () => {
    const res = validatePatch({});
    expect(res.ok).toBe(true);
    expect(res.empty).toBe(true);
    expect(res.flat).toEqual({});
  });
});

describe('validatePatch — whitelist enforcement', () => {
  it('rejects non-whitelisted fields with per-field errors', () => {
    const res = validatePatch({
      basic_salary: 99999,
      job_title_ar: 'CEO',
      phone: '0501234567',
    });
    expect(res.ok).toBe(false);
    expect(res.errors.basic_salary).toBe('field is not self-editable');
    expect(res.errors.job_title_ar).toBe('field is not self-editable');
    expect(res.errors.phone).toBeUndefined();
  });

  it('rejects national_id even with valid value', () => {
    const res = validatePatch({ national_id: '1234567890' });
    expect(res.ok).toBe(false);
    expect(res.errors.national_id).toBe('field is not self-editable');
  });

  it('accepts every whitelisted field', () => {
    const res = validatePatch({
      phone: '0501234567',
      phone2: '0599999999',
      personal_email: 'me@example.com',
      address: 'الرياض - حي النخيل',
      city: 'الرياض',
      postal_code: '12345',
      'emergency_contact.name': 'Sarah',
      'emergency_contact.phone': '0500000001',
      'emergency_contact.relation': 'spouse',
    });
    expect(res.ok).toBe(true);
    expect(Object.keys(res.flat)).toHaveLength(9);
  });
});

describe('validatePatch — nested emergency_contact expansion', () => {
  it('flattens nested emergency_contact object into dot-paths', () => {
    const res = validatePatch({
      phone: '0501112222',
      emergency_contact: { name: 'Omar', phone: '0503334444', relation: 'parent' },
    });
    expect(res.ok).toBe(true);
    expect(res.flat).toEqual({
      phone: '0501112222',
      'emergency_contact.name': 'Omar',
      'emergency_contact.phone': '0503334444',
      'emergency_contact.relation': 'parent',
    });
  });

  it('rejects unknown sub-keys under emergency_contact', () => {
    const res = validatePatch({
      emergency_contact: { name: 'Omar', mystery_field: 'x' },
    });
    expect(res.ok).toBe(false);
    expect(res.errors['emergency_contact.mystery_field']).toBe('field is not self-editable');
  });
});

describe('validatePatch — validator errors bubble up', () => {
  it('rejects bad phone with validator message', () => {
    const res = validatePatch({ phone: 'not-a-phone' });
    expect(res.ok).toBe(false);
    expect(res.errors.phone).toMatch(/Saudi mobile/);
  });

  it('rejects bad postal_code', () => {
    const res = validatePatch({ postal_code: '12' });
    expect(res.ok).toBe(false);
    expect(res.errors.postal_code).toMatch(/5-digit/);
  });

  it('collects multiple errors at once', () => {
    const res = validatePatch({
      phone: 'bad',
      personal_email: 'also-bad',
      'emergency_contact.relation': 'alien',
    });
    expect(res.ok).toBe(false);
    expect(res.errors.phone).toBeDefined();
    expect(res.errors.personal_email).toBeDefined();
    expect(res.errors['emergency_contact.relation']).toBeDefined();
  });
});

describe('validatePatch — normalization', () => {
  it('trims strings', () => {
    const res = validatePatch({ city: '  الرياض  ' });
    expect(res.flat.city).toBe('الرياض');
  });

  it('empty string after trim becomes null (clear field)', () => {
    const res = validatePatch({ city: '   ' });
    expect(res.flat.city).toBeNull();
  });

  it('preserves valid non-empty values untouched', () => {
    const res = validatePatch({ phone: '0501234567' });
    expect(res.flat.phone).toBe('0501234567');
  });
});
