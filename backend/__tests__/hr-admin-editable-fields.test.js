/**
 * hr-admin-editable-fields.test.js — Phase 11 Commit 10 (4.0.27).
 *
 * Pure coverage of the admin write-tier matrix + validators + patch
 * validator. No DB.
 */

'use strict';

const { ROLES } = require('../config/rbac.config');
const {
  WRITE_TIERS,
  ROLE_WRITE_TIER,
  ADMIN_FIELDS,
  writeTierForRole,
  canWrite,
  fieldSpec,
  validatePatch,
} = require('../config/hr-admin-editable-fields');

describe('role → write tier', () => {
  it('HR_MANAGER + HR_SUPERVISOR + GROUP_CHRO + SUPER_ADMIN + COMPLIANCE_OFFICER are MANAGER', () => {
    for (const r of [
      ROLES.HR_MANAGER,
      ROLES.HR_SUPERVISOR,
      ROLES.GROUP_CHRO,
      ROLES.SUPER_ADMIN,
      ROLES.HEAD_OFFICE_ADMIN,
      ROLES.COMPLIANCE_OFFICER,
    ]) {
      expect(writeTierForRole(r)).toBe(WRITE_TIERS.MANAGER);
    }
  });

  it('HR_OFFICER + HR + FINANCE_SUPERVISOR are OFFICER', () => {
    for (const r of [ROLES.HR_OFFICER, ROLES.HR, ROLES.FINANCE_SUPERVISOR]) {
      expect(writeTierForRole(r)).toBe(WRITE_TIERS.OFFICER);
    }
  });

  it('non-HR roles have no write tier', () => {
    for (const r of [ROLES.THERAPIST, ROLES.RECEPTIONIST, ROLES.BRANCH_MANAGER, ROLES.CEO]) {
      expect(writeTierForRole(r)).toBe('none');
    }
  });

  it('null/unknown role falls back to none', () => {
    expect(writeTierForRole(null)).toBe('none');
    expect(writeTierForRole('typo')).toBe('none');
  });
});

describe('canWrite', () => {
  it('MANAGER can write manager + officer tiers', () => {
    expect(canWrite(ROLES.HR_MANAGER, 'officer')).toBe(true);
    expect(canWrite(ROLES.HR_MANAGER, 'manager')).toBe(true);
  });

  it('OFFICER can write officer only', () => {
    expect(canWrite(ROLES.HR_OFFICER, 'officer')).toBe(true);
    expect(canWrite(ROLES.HR_OFFICER, 'manager')).toBe(false);
  });

  it('non-HR roles can write nothing', () => {
    expect(canWrite(ROLES.THERAPIST, 'officer')).toBe(false);
    expect(canWrite(ROLES.THERAPIST, 'manager')).toBe(false);
  });
});

describe('field tier assignments', () => {
  it('contact fields are OFFICER tier', () => {
    for (const f of [
      'phone',
      'phone2',
      'email',
      'personal_email',
      'address',
      'emergency_contact.phone',
    ]) {
      expect(fieldSpec(f).tier).toBe('officer');
    }
  });

  it('assignment fields are OFFICER tier', () => {
    for (const f of ['department', 'specialization', 'job_title_ar']) {
      expect(fieldSpec(f).tier).toBe('officer');
    }
  });

  it('compensation fields are MANAGER tier', () => {
    for (const f of ['basic_salary', 'housing_allowance', 'iban', 'bank_account_number']) {
      expect(fieldSpec(f).tier).toBe('manager');
    }
  });

  it('identity fields are MANAGER tier', () => {
    for (const f of ['national_id', 'iqama_number', 'passport_number']) {
      expect(fieldSpec(f).tier).toBe('manager');
    }
  });

  it('status + employment lifecycle are MANAGER tier', () => {
    for (const f of ['status', 'contract_type', 'hire_date', 'probation_end_date', 'branch_id']) {
      expect(fieldSpec(f).tier).toBe('manager');
    }
  });

  it('SCFHS licensing is OFFICER (admin may correct)', () => {
    for (const f of ['scfhs_number', 'scfhs_classification', 'scfhs_expiry']) {
      expect(fieldSpec(f).tier).toBe('officer');
    }
  });

  it('unknown fields return null', () => {
    expect(fieldSpec('never_existed')).toBeNull();
    expect(fieldSpec('user_type')).toBeNull();
  });
});

describe('validatePatch — structure + authorization', () => {
  it('rejects null / array / primitive', () => {
    expect(validatePatch(null, ROLES.HR_MANAGER).ok).toBe(false);
    expect(validatePatch([], ROLES.HR_MANAGER).ok).toBe(false);
    expect(validatePatch('oops', ROLES.HR_MANAGER).ok).toBe(false);
  });

  it('rejects unknown fields with "not admin-editable"', () => {
    const res = validatePatch({ never_existed: 1 }, ROLES.HR_MANAGER);
    expect(res.ok).toBe(false);
    expect(res.errors.never_existed).toBe('field is not admin-editable');
  });

  it('rejects manager-tier field for OFFICER caller with "requires manager tier"', () => {
    const res = validatePatch({ basic_salary: 20000 }, ROLES.HR_OFFICER);
    expect(res.ok).toBe(false);
    expect(res.errors.basic_salary).toBe('requires manager tier');
  });

  it('OFFICER can set assignment + contact fields together', () => {
    const res = validatePatch(
      {
        phone: '0501234567',
        department: 'clinical',
        job_title_ar: 'معالج نطق',
      },
      ROLES.HR_OFFICER
    );
    expect(res.ok).toBe(true);
    expect(Object.keys(res.flat)).toHaveLength(3);
  });

  it('MANAGER can set salary + status + national_id together', () => {
    const res = validatePatch(
      {
        basic_salary: 15000,
        status: 'active',
        national_id: '1234567890',
      },
      ROLES.HR_MANAGER
    );
    expect(res.ok).toBe(true);
    expect(res.flat.basic_salary).toBe(15000);
    expect(res.flat.national_id).toBe('1234567890');
  });

  it('empty patch → no_op', () => {
    const res = validatePatch({}, ROLES.HR_MANAGER);
    expect(res.ok).toBe(true);
    expect(res.empty).toBe(true);
  });
});

describe('validatePatch — validators', () => {
  it('rejects invalid Saudi phone', () => {
    const res = validatePatch({ phone: '0412345678' }, ROLES.HR_OFFICER);
    expect(res.errors.phone).toMatch(/Saudi/);
  });

  it('rejects invalid IBAN', () => {
    const res = validatePatch({ iban: 'SA00123' }, ROLES.HR_MANAGER);
    expect(res.errors.iban).toMatch(/Saudi IBAN/);
  });

  it('rejects non-numeric basic_salary', () => {
    const res = validatePatch({ basic_salary: 'lots' }, ROLES.HR_MANAGER);
    expect(res.errors.basic_salary).toMatch(/non-negative number/);
  });

  it('rejects negative basic_salary', () => {
    const res = validatePatch({ basic_salary: -1 }, ROLES.HR_MANAGER);
    expect(res.errors.basic_salary).toMatch(/non-negative number/);
  });

  it('rejects invalid national_id (9 digits)', () => {
    const res = validatePatch({ national_id: '123456789' }, ROLES.HR_MANAGER);
    expect(res.errors.national_id).toMatch(/10 digits/);
  });

  it('rejects invalid status enum value', () => {
    const res = validatePatch({ status: 'vacation' }, ROLES.HR_MANAGER);
    expect(res.errors.status).toMatch(/must be one of/);
  });

  it('accepts valid IBAN', () => {
    const res = validatePatch({ iban: 'SA0380000000000000012345' }, ROLES.HR_MANAGER);
    expect(res.ok).toBe(true);
    expect(res.flat.iban).toBe('SA0380000000000000012345');
  });

  it('accepts Date objects for date fields', () => {
    const res = validatePatch({ hire_date: new Date('2024-01-15') }, ROLES.HR_MANAGER);
    expect(res.ok).toBe(true);
  });
});

describe('validatePatch — nested emergency_contact', () => {
  it('flattens nested object for OFFICER', () => {
    const res = validatePatch(
      { emergency_contact: { name: 'Sarah', phone: '0501234567', relation: 'spouse' } },
      ROLES.HR_OFFICER
    );
    expect(res.ok).toBe(true);
    expect(Object.keys(res.flat)).toEqual(
      expect.arrayContaining([
        'emergency_contact.name',
        'emergency_contact.phone',
        'emergency_contact.relation',
      ])
    );
  });
});

describe('validatePatch — atomic rejection', () => {
  it('one bad field rejects the whole patch', () => {
    const res = validatePatch(
      {
        phone: '0501234567', // ok
        basic_salary: 20000, // ok for MANAGER
        national_id: '12345', // fails validator
      },
      ROLES.HR_MANAGER
    );
    expect(res.ok).toBe(false);
    // No partial flat written on failure
    expect(res.flat).toBeUndefined();
    expect(res.errors.national_id).toBeDefined();
  });
});
