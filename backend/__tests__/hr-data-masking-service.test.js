/**
 * hr-data-masking-service.test.js — Phase 11 Commit 5 (4.0.22).
 *
 * Pure-function coverage over the PDPL masking service. No DB, no
 * mongoose — just the classification config + masking logic.
 */

'use strict';

const { ROLES } = require('../config/rbac.config');
const {
  CLASSIFICATIONS,
  REDACTED,
  classificationOf,
  maxClassificationForRole,
  canSeeClassification,
  ENTITY_FIELD_MAPS,
} = require('../config/hr-data-classification');
const {
  maskRecord,
  maskCollection,
  visibleFields,
  redactedFields,
} = require('../services/hr/hrDataMaskingService');

// ─── Shape + invariants ─────────────────────────────────────────

describe('hr-data-classification — shape', () => {
  it('classification ranks are strictly increasing', () => {
    const ranks = [
      CLASSIFICATIONS.PUBLIC,
      CLASSIFICATIONS.INTERNAL,
      CLASSIFICATIONS.CONFIDENTIAL,
      CLASSIFICATIONS.RESTRICTED,
    ];
    expect(ranks).toEqual(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']);
  });

  it('entity maps are non-empty', () => {
    expect(Object.keys(ENTITY_FIELD_MAPS.employee).length).toBeGreaterThan(20);
    expect(Object.keys(ENTITY_FIELD_MAPS.employment_contract).length).toBeGreaterThan(10);
    expect(Object.keys(ENTITY_FIELD_MAPS.leave).length).toBeGreaterThan(5);
  });

  it('classificationOf returns RESTRICTED for unknown fields (fail-closed)', () => {
    expect(classificationOf('employee', 'never_seen_field')).toBe(CLASSIFICATIONS.RESTRICTED);
  });

  it('classificationOf returns RESTRICTED for unknown entity', () => {
    expect(classificationOf('not_a_thing', 'whatever')).toBe(CLASSIFICATIONS.RESTRICTED);
  });

  it('ALL sensitive PII fields on Employee are RESTRICTED', () => {
    const sensitive = [
      'national_id',
      'national_id_expiry',
      'iqama_number',
      'iqama_expiry',
      'passport_number',
      'personal_email',
      'address',
      'emergency_contact.name',
      'emergency_contact.phone',
    ];
    for (const f of sensitive) {
      expect(classificationOf('employee', f)).toBe(CLASSIFICATIONS.RESTRICTED);
    }
  });

  it('ALL compensation fields on Employee are CONFIDENTIAL', () => {
    const comp = [
      'basic_salary',
      'housing_allowance',
      'iban',
      'bank_account_number',
      'gosi_number',
    ];
    for (const f of comp) {
      expect(classificationOf('employee', f)).toBe(CLASSIFICATIONS.CONFIDENTIAL);
    }
  });
});

// ─── Role → classification ──────────────────────────────────────

describe('maxClassificationForRole', () => {
  it('HR_MANAGER, GROUP_CHRO, COMPLIANCE_OFFICER see RESTRICTED', () => {
    for (const role of [
      ROLES.HR_MANAGER,
      ROLES.GROUP_CHRO,
      ROLES.COMPLIANCE_OFFICER,
      ROLES.SUPER_ADMIN,
      ROLES.INTERNAL_AUDITOR,
      ROLES.HR_SUPERVISOR,
    ]) {
      expect(maxClassificationForRole(role)).toBe(CLASSIFICATIONS.RESTRICTED);
    }
  });

  it('HR_OFFICER + FINANCE_SUPERVISOR see CONFIDENTIAL', () => {
    expect(maxClassificationForRole(ROLES.HR_OFFICER)).toBe(CLASSIFICATIONS.CONFIDENTIAL);
    expect(maxClassificationForRole(ROLES.FINANCE_SUPERVISOR)).toBe(CLASSIFICATIONS.CONFIDENTIAL);
  });

  it('BRANCH_MANAGER, CLINICAL_DIRECTOR see INTERNAL (not salary)', () => {
    expect(maxClassificationForRole(ROLES.BRANCH_MANAGER)).toBe(CLASSIFICATIONS.INTERNAL);
    expect(maxClassificationForRole(ROLES.CLINICAL_DIRECTOR)).toBe(CLASSIFICATIONS.INTERNAL);
  });

  it('THERAPIST, RECEPTIONIST, unknown roles get PUBLIC baseline', () => {
    expect(maxClassificationForRole(ROLES.THERAPIST)).toBe(CLASSIFICATIONS.PUBLIC);
    expect(maxClassificationForRole(ROLES.RECEPTIONIST)).toBe(CLASSIFICATIONS.PUBLIC);
    expect(maxClassificationForRole('typo_role')).toBe(CLASSIFICATIONS.PUBLIC);
    expect(maxClassificationForRole(null)).toBe(CLASSIFICATIONS.PUBLIC);
  });

  it('canSeeClassification respects role hierarchy', () => {
    expect(canSeeClassification(ROLES.HR_MANAGER, CLASSIFICATIONS.RESTRICTED)).toBe(true);
    expect(canSeeClassification(ROLES.HR_OFFICER, CLASSIFICATIONS.RESTRICTED)).toBe(false);
    expect(canSeeClassification(ROLES.HR_OFFICER, CLASSIFICATIONS.CONFIDENTIAL)).toBe(true);
    expect(canSeeClassification(ROLES.BRANCH_MANAGER, CLASSIFICATIONS.CONFIDENTIAL)).toBe(false);
    expect(canSeeClassification(ROLES.BRANCH_MANAGER, CLASSIFICATIONS.INTERNAL)).toBe(true);
    expect(canSeeClassification(ROLES.THERAPIST, CLASSIFICATIONS.INTERNAL)).toBe(false);
    expect(canSeeClassification(ROLES.THERAPIST, CLASSIFICATIONS.PUBLIC)).toBe(true);
  });
});

// ─── Employee masking ───────────────────────────────────────────

describe('maskRecord — employee', () => {
  const rawEmployee = {
    _id: 'emp-001',
    employee_number: 'EMP-2026-0001',
    name_ar: 'أحمد محمد',
    name_en: 'Ahmed Mohammed',
    job_title_ar: 'أخصائي نطق',
    department: 'clinical',
    specialization: 'speech',
    status: 'active',
    email: 'ahmed@org.sa',
    phone: '0501234567',
    hire_date: new Date('2024-01-15'),
    probation_end_date: new Date('2024-04-15'),
    scfhs_expiry: new Date('2027-01-01'),
    basic_salary: 15000,
    housing_allowance: 3000,
    iban: 'SA03800000000000000012345',
    gosi_number: '12345678',
    national_id: '1234567890',
    iqama_number: null,
    passport_number: 'A12345678',
    personal_email: 'ahmed.personal@gmail.com',
    address: 'الرياض',
    emergency_contact: { name: 'Sarah', phone: '0509999999', relation: 'spouse' },
  };

  it('THERAPIST sees PUBLIC only; everything else redacted', () => {
    const masked = maskRecord(rawEmployee, 'employee', { role: ROLES.THERAPIST });
    expect(masked.name_ar).toBe('أحمد محمد');
    expect(masked.job_title_ar).toBe('أخصائي نطق');
    expect(masked.department).toBe('clinical');
    expect(masked.status).toBe('active');
    // Internal redacted
    expect(masked.email).toBe(REDACTED);
    expect(masked.phone).toBe(REDACTED);
    expect(masked.hire_date).toBe(REDACTED);
    // Confidential redacted
    expect(masked.basic_salary).toBe(REDACTED);
    expect(masked.iban).toBe(REDACTED);
    // Restricted redacted
    expect(masked.national_id).toBe(REDACTED);
    expect(masked.emergency_contact.phone).toBe(REDACTED);
  });

  it('BRANCH_MANAGER sees PUBLIC + INTERNAL (email, phone, hire_date) but not salary or national_id', () => {
    const masked = maskRecord(rawEmployee, 'employee', { role: ROLES.BRANCH_MANAGER });
    expect(masked.email).toBe('ahmed@org.sa');
    expect(masked.phone).toBe('0501234567');
    expect(masked.hire_date).toEqual(new Date('2024-01-15'));
    expect(masked.scfhs_expiry).toEqual(new Date('2027-01-01'));
    // Confidential still redacted
    expect(masked.basic_salary).toBe(REDACTED);
    expect(masked.iban).toBe(REDACTED);
    // Restricted still redacted
    expect(masked.national_id).toBe(REDACTED);
    expect(masked.personal_email).toBe(REDACTED);
  });

  it('HR_OFFICER sees CONFIDENTIAL (salary, bank) but NOT national_id', () => {
    const masked = maskRecord(rawEmployee, 'employee', { role: ROLES.HR_OFFICER });
    expect(masked.basic_salary).toBe(15000);
    expect(masked.iban).toBe('SA03800000000000000012345');
    expect(masked.gosi_number).toBe('12345678');
    // Restricted still redacted for HR_OFFICER
    expect(masked.national_id).toBe(REDACTED);
    expect(masked.personal_email).toBe(REDACTED);
    expect(masked.emergency_contact.phone).toBe(REDACTED);
  });

  it('HR_MANAGER sees RESTRICTED (everything)', () => {
    const masked = maskRecord(rawEmployee, 'employee', { role: ROLES.HR_MANAGER });
    expect(masked.name_ar).toBe('أحمد محمد');
    expect(masked.basic_salary).toBe(15000);
    expect(masked.national_id).toBe('1234567890');
    expect(masked.passport_number).toBe('A12345678');
    expect(masked.personal_email).toBe('ahmed.personal@gmail.com');
    expect(masked.address).toBe('الرياض');
    expect(masked.emergency_contact).toEqual({
      name: 'Sarah',
      phone: '0509999999',
      relation: 'spouse',
    });
  });

  it('SELF-access — employee viewing own record sees RESTRICTED regardless of role', () => {
    const masked = maskRecord(rawEmployee, 'employee', {
      role: ROLES.THERAPIST,
      selfEmployeeId: 'emp-001',
    });
    expect(masked.basic_salary).toBe(15000);
    expect(masked.national_id).toBe('1234567890');
    expect(masked.iban).toBe('SA03800000000000000012345');
    expect(masked.emergency_contact.phone).toBe('0509999999');
  });

  it('SELF-access for a DIFFERENT employee does NOT upgrade', () => {
    const masked = maskRecord(rawEmployee, 'employee', {
      role: ROLES.THERAPIST,
      selfEmployeeId: 'other-emp',
    });
    expect(masked.basic_salary).toBe(REDACTED);
    expect(masked.national_id).toBe(REDACTED);
  });

  it('does NOT mutate the input record', () => {
    // Verify key sensitive fields survive masking intact on the input.
    // (Structured clone would be simpler, but JSON round-trip stringifies
    // dates — so assert per-field instead.)
    maskRecord(rawEmployee, 'employee', { role: ROLES.THERAPIST });
    expect(rawEmployee.basic_salary).toBe(15000);
    expect(rawEmployee.national_id).toBe('1234567890');
    expect(rawEmployee.iban).toBe('SA03800000000000000012345');
    expect(rawEmployee.emergency_contact.phone).toBe('0509999999');
    expect(rawEmployee.hire_date).toBeInstanceOf(Date);
  });

  it('handles null input', () => {
    expect(maskRecord(null, 'employee', { role: ROLES.HR_MANAGER })).toBeNull();
  });

  it('handles Mongoose-like docs via toObject()', () => {
    const fakeDoc = {
      toObject() {
        return rawEmployee;
      },
    };
    const masked = maskRecord(fakeDoc, 'employee', { role: ROLES.BRANCH_MANAGER });
    expect(masked.email).toBe('ahmed@org.sa');
    expect(masked.basic_salary).toBe(REDACTED);
  });
});

// ─── EmploymentContract masking ─────────────────────────────────

describe('maskRecord — employment_contract', () => {
  const contract = {
    _id: 'c-001',
    contract_number: 'EMP-CONTRACT-2026-0001',
    employee_id: 'emp-999',
    branch_id: 'br-001',
    contract_type: 'fixed_term',
    start_date: new Date('2025-01-01'),
    end_date: new Date('2026-12-31'),
    position: 'Therapist',
    department: 'clinical',
    basic_salary: 12000,
    housing_allowance: 2000,
    contract_file_path: '/docs/contracts/c-001.pdf',
    notes: 'probation extended at request',
    status: 'active',
  };

  it('THERAPIST sees PUBLIC fields only', () => {
    const masked = maskRecord(contract, 'employment_contract', { role: ROLES.THERAPIST });
    expect(masked.contract_number).toBe('EMP-CONTRACT-2026-0001');
    expect(masked.position).toBe('Therapist');
    expect(masked.status).toBe('active');
    expect(masked.contract_type).toBe(REDACTED); // INTERNAL
    expect(masked.basic_salary).toBe(REDACTED); // CONFIDENTIAL
    expect(masked.contract_file_path).toBe(REDACTED); // RESTRICTED
  });

  it('HR_OFFICER sees CONFIDENTIAL but NOT RESTRICTED (file path, notes)', () => {
    const masked = maskRecord(contract, 'employment_contract', { role: ROLES.HR_OFFICER });
    expect(masked.contract_type).toBe('fixed_term');
    expect(masked.basic_salary).toBe(12000);
    expect(masked.housing_allowance).toBe(2000);
    expect(masked.contract_file_path).toBe(REDACTED);
    expect(masked.notes).toBe(REDACTED);
  });

  it('SELF-access — employee viewing own contract sees everything', () => {
    const masked = maskRecord(contract, 'employment_contract', {
      role: ROLES.THERAPIST,
      selfEmployeeId: 'emp-999',
    });
    expect(masked.basic_salary).toBe(12000);
    expect(masked.contract_file_path).toBe('/docs/contracts/c-001.pdf');
    expect(masked.notes).toBe('probation extended at request');
  });
});

// ─── Leave masking ──────────────────────────────────────────────

describe('maskRecord — leave', () => {
  const leave = {
    _id: 'lv-001',
    leave_number: 'LV-2026-00001',
    employee_id: 'emp-777',
    branch_id: 'br-001',
    leave_type: 'sick',
    start_date: new Date('2026-05-01'),
    end_date: new Date('2026-05-05'),
    days_requested: 5,
    status: 'pending',
    reason: 'chronic pain flare-up',
    attachment_path: '/uploads/med-cert.pdf',
    notes: 'approved verbally by supervisor',
  };

  it('THERAPIST sees leave_type + status (PUBLIC) only', () => {
    const masked = maskRecord(leave, 'leave', { role: ROLES.THERAPIST });
    expect(masked.leave_number).toBe('LV-2026-00001');
    expect(masked.leave_type).toBe('sick');
    expect(masked.status).toBe('pending');
    expect(masked.start_date).toBe(REDACTED); // INTERNAL
    expect(masked.reason).toBe(REDACTED); // CONFIDENTIAL
    expect(masked.attachment_path).toBe(REDACTED);
  });

  it('BRANCH_MANAGER sees INTERNAL (dates, days_requested) but not reason/attachment', () => {
    const masked = maskRecord(leave, 'leave', { role: ROLES.BRANCH_MANAGER });
    expect(masked.start_date).toEqual(new Date('2026-05-01'));
    expect(masked.days_requested).toBe(5);
    expect(masked.reason).toBe(REDACTED);
    expect(masked.attachment_path).toBe(REDACTED);
  });

  it('SELF-access — employee viewing own leave sees their own reason + attachment', () => {
    const masked = maskRecord(leave, 'leave', {
      role: ROLES.THERAPIST,
      selfEmployeeId: 'emp-777',
    });
    expect(masked.reason).toBe('chronic pain flare-up');
    expect(masked.attachment_path).toBe('/uploads/med-cert.pdf');
    expect(masked.notes).toBe('approved verbally by supervisor');
  });
});

// ─── maskCollection ─────────────────────────────────────────────

describe('maskCollection', () => {
  it('maps over an array', () => {
    const emps = [
      { _id: 'a', name_ar: 'A', basic_salary: 1000, national_id: '1' },
      { _id: 'b', name_ar: 'B', basic_salary: 2000, national_id: '2' },
    ];
    const masked = maskCollection(emps, 'employee', { role: ROLES.THERAPIST });
    expect(masked.map(e => e.name_ar)).toEqual(['A', 'B']);
    expect(masked.every(e => e.basic_salary === REDACTED)).toBe(true);
    expect(masked.every(e => e.national_id === REDACTED)).toBe(true);
  });

  it('handles self-access per-item', () => {
    const emps = [
      { _id: 'emp-self', basic_salary: 1000 },
      { _id: 'emp-other', basic_salary: 2000 },
    ];
    const masked = maskCollection(emps, 'employee', {
      role: ROLES.THERAPIST,
      selfEmployeeId: 'emp-self',
    });
    expect(masked[0].basic_salary).toBe(1000);
    expect(masked[1].basic_salary).toBe(REDACTED);
  });

  it('passes null through', () => {
    expect(maskCollection(null, 'employee', {})).toBeNull();
  });

  it('throws on non-array input', () => {
    expect(() => maskCollection({}, 'employee', {})).toThrow(/must be an array/);
  });
});

// ─── visibleFields / redactedFields ─────────────────────────────

describe('visibleFields & redactedFields', () => {
  it('THERAPIST visible fields are PUBLIC-only', () => {
    const vis = visibleFields('employee', { role: ROLES.THERAPIST });
    expect(vis).toContain('name_ar');
    expect(vis).toContain('job_title_ar');
    expect(vis).not.toContain('basic_salary');
    expect(vis).not.toContain('national_id');
  });

  it('HR_MANAGER sees ALL fields', () => {
    const vis = visibleFields('employee', { role: ROLES.HR_MANAGER });
    const all = Object.keys(ENTITY_FIELD_MAPS.employee);
    expect(new Set(vis)).toEqual(new Set(all));
    expect(redactedFields('employee', { role: ROLES.HR_MANAGER })).toEqual([]);
  });

  it('HR_OFFICER redacts only RESTRICTED fields', () => {
    const red = redactedFields('employee', { role: ROLES.HR_OFFICER });
    expect(red).toContain('national_id');
    expect(red).toContain('passport_number');
    expect(red).not.toContain('basic_salary'); // Confidential, visible
  });

  it('unknown entity returns empty arrays', () => {
    expect(visibleFields('nope', { role: ROLES.HR_MANAGER })).toEqual([]);
    expect(redactedFields('nope', { role: ROLES.HR_MANAGER })).toEqual([]);
  });
});
