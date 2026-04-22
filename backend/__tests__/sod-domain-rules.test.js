/**
 * sod-domain-rules.test.js — Phase-7 domain SoD enforcement.
 *
 * Verifies the 7 Phase-7 domain rules deny the right (role,
 * resource:action) pairs and don't false-positive on adjacent
 * combinations. Also enforces drift invariants: every blockedRole in
 * a rule must exist in the rbac config (otherwise a typo here would
 * silently disable a critical separation).
 */

'use strict';

const {
  DOMAIN_RULES,
  checkDomainSoD,
  rulesForRole,
  allDomainRules,
  permMatches,
} = require('../authorization/sod/domain-rules');
const { ROLES } = require('../config/rbac.config');

describe('domain-rules — pattern matching helper', () => {
  it('exact match', () => {
    expect(permMatches('invoices:create', 'invoices:create')).toBe(true);
  });
  it('wildcard action', () => {
    expect(permMatches('invoices:approve', 'invoices:*')).toBe(true);
    expect(permMatches('invoices:read', 'invoices:*')).toBe(true);
  });
  it('wildcard resource', () => {
    expect(permMatches('invoices:create', '*:create')).toBe(true);
    expect(permMatches('care_plans:create', '*:create')).toBe(true);
  });
  it('mismatched resource is denied', () => {
    expect(permMatches('invoices:create', 'expenses:create')).toBe(false);
  });
  it('mismatched action is denied', () => {
    expect(permMatches('invoices:create', 'invoices:approve')).toBe(false);
  });
});

describe('domain-rules — HR ↔ Finance separation', () => {
  it.each([
    ['hr', 'invoices:create'],
    ['hr_manager', 'invoices:approve'],
    ['hr_officer', 'expenses:create'],
    ['hr_supervisor', 'expenses:approve'],
    ['group_chro', 'invoices:approve'],
    ['group_chro', 'purchase_orders:approve'],
  ])('blocks %s from %s', (role, perm) => {
    const c = checkDomainSoD(role, perm);
    expect(c).not.toBeNull();
    expect(c.rule.id).toBe('sod-hr-cannot-touch-finance');
    expect(c.rule.severity).toBe('high');
  });

  it.each([
    ['accountant', 'employees:create'],
    ['finance', 'employees:update'],
    ['finance_supervisor', 'employees:delete'],
    ['group_cfo', 'employees:update'],
  ])('blocks %s from %s', (role, perm) => {
    const c = checkDomainSoD(role, perm);
    expect(c).not.toBeNull();
    expect(c.rule.id).toBe('sod-finance-cannot-edit-employee-pii');
  });

  it('allows hr from reading employees (not writing finance)', () => {
    expect(checkDomainSoD('hr', 'employees:read')).toBeNull();
    expect(checkDomainSoD('hr_officer', 'attendance:read')).toBeNull();
  });

  it('allows accountant from reading invoices', () => {
    expect(checkDomainSoD('accountant', 'invoices:read')).toBeNull();
  });
});

describe('domain-rules — Clinical ↔ Finance separation', () => {
  it.each([
    ['therapist', 'invoices:create'],
    ['therapist_slp', 'invoices:approve'],
    ['therapist_psych', 'finance:approve'],
    ['clinical_director', 'invoices:create'],
    ['therapy_supervisor', 'invoices:create'],
  ])('blocks clinical role %s from %s', (role, perm) => {
    const c = checkDomainSoD(role, perm);
    expect(c?.rule?.id).toBe('sod-clinical-cannot-bill');
  });

  it.each([
    ['accountant', 'clinical_assessments:read'],
    ['finance', 'care_plans:read'],
    ['finance_supervisor', 'care_plans_ddd:export'],
  ])('blocks finance role %s from %s', (role, perm) => {
    const c = checkDomainSoD(role, perm);
    expect(c?.rule?.id).toBe('sod-finance-cannot-read-clinical');
  });

  it('allows therapist to read clinical_assessments + care_plans', () => {
    expect(checkDomainSoD('therapist', 'clinical_assessments:read')).toBeNull();
    expect(checkDomainSoD('therapist', 'care_plans:update')).toBeNull();
  });
});

describe('domain-rules — Quality independence', () => {
  it('quality_coordinator cannot approve care_plans', () => {
    const c = checkDomainSoD('quality_coordinator', 'care_plans:approve');
    expect(c?.rule?.id).toBe('sod-quality-cannot-approve-care');
  });
  it('regional_quality cannot approve care_plans_ddd', () => {
    const c = checkDomainSoD('regional_quality', 'care_plans_ddd:approve');
    expect(c?.rule?.id).toBe('sod-quality-cannot-approve-care');
  });
  it('group_quality_officer is intentionally NOT blocked (HQ independence)', () => {
    expect(checkDomainSoD('group_quality_officer', 'care_plans:approve')).toBeNull();
  });
  it('quality_coordinator can still read care_plans', () => {
    expect(checkDomainSoD('quality_coordinator', 'care_plans:read')).toBeNull();
  });
});

describe('domain-rules — IT Admin ↔ Audit', () => {
  it('it_admin cannot mutate audit_logs', () => {
    expect(checkDomainSoD('it_admin', 'audit_logs:update')?.rule?.id).toBe(
      'sod-it-admin-cannot-write-audit'
    );
    expect(checkDomainSoD('it_admin', 'audit_logs:delete')?.rule?.id).toBe(
      'sod-it-admin-cannot-write-audit'
    );
    expect(checkDomainSoD('it_admin', 'audit_logs:create')?.rule?.id).toBe(
      'sod-it-admin-cannot-write-audit'
    );
  });
  it('it_admin can still read audit_logs', () => {
    expect(checkDomainSoD('it_admin', 'audit_logs:read')).toBeNull();
  });
});

describe('domain-rules — Internal Auditor read-only', () => {
  it.each([
    ['employees:create'],
    ['invoices:approve'],
    ['care_plans_ddd:update'],
    ['users:delete'],
    ['settings:create'],
  ])('blocks internal_auditor from %s', perm => {
    const c = checkDomainSoD('internal_auditor', perm);
    expect(c?.rule?.id).toBe('sod-internal-auditor-readonly');
  });

  it.each([['employees:read'], ['invoices:read'], ['audit_logs:read'], ['care_plans:export']])(
    'allows internal_auditor to %s',
    perm => {
      expect(checkDomainSoD('internal_auditor', perm)).toBeNull();
    }
  );
});

describe('domain-rules — operations roles (driver, bus_assistant)', () => {
  it.each([
    ['driver', 'beneficiaries:update'],
    ['driver', 'clinical_assessments:read'],
    ['bus_assistant', 'care_plans:read'],
    ['bus_assistant', 'sessions:update'],
  ])('blocks %s from %s', (role, perm) => {
    const c = checkDomainSoD(role, perm);
    expect(c?.rule?.id).toBe('sod-ops-cannot-touch-phi');
  });

  it('driver can still read attendance + vehicles', () => {
    expect(checkDomainSoD('driver', 'vehicles:read')).toBeNull();
    expect(checkDomainSoD('driver', 'attendance:create')).toBeNull();
  });
});

describe('domain-rules — drift invariants', () => {
  it('every blockedRole in every rule exists in rbac.config ROLES', () => {
    const knownRoles = new Set(Object.values(ROLES));
    const errors = [];
    for (const rule of DOMAIN_RULES) {
      for (const role of rule.blockedRoles) {
        if (!knownRoles.has(role)) {
          errors.push(`rule "${rule.id}" → unknown role "${role}"`);
        }
      }
    }
    if (errors.length) throw new Error('Stale role refs:\n  ' + errors.join('\n  '));
  });

  it('every rule has a description, severity, and at least 1 blocked action', () => {
    for (const rule of DOMAIN_RULES) {
      expect(rule.description?.length).toBeGreaterThan(10);
      expect(['high', 'medium', 'low']).toContain(rule.severity);
      expect(rule.blockedActions?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('rule ids are unique', () => {
    const ids = DOMAIN_RULES.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('domain-rules — helpers', () => {
  it('rulesForRole filters correctly', () => {
    expect(rulesForRole('hr_officer').length).toBeGreaterThanOrEqual(1);
    expect(rulesForRole('hr_officer').every(r => r.blockedRoles.includes('hr_officer'))).toBe(true);
    expect(rulesForRole('parent')).toEqual([]); // parent has no domain SoD
  });

  it('allDomainRules returns clones (mutation-safe)', () => {
    const a = allDomainRules();
    a[0].id = 'mutated';
    const b = allDomainRules();
    expect(b[0].id).not.toBe('mutated');
  });
});
