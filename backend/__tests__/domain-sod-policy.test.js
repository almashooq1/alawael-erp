/**
 * domain-sod-policy.test.js — ABAC policy adapter that wraps the
 * pure `checkDomainSoD()` function from authorization/sod/domain-rules.
 *
 * Logic coverage of the rules themselves lives in
 * __tests__/sod-domain-rules.test.js. This file only exercises the
 * thin policy-shaped wrapper that plugs into the PDP.
 */

'use strict';

const policy = require('../authorization/abac/policies/domain-sod');

describe('domain-sod ABAC policy — applies()', () => {
  it('applies when subject + role + action are present', () => {
    expect(policy.applies({ subject: { role: 'hr' }, action: 'invoices:create' })).toBe(true);
  });

  it('does not apply when no subject', () => {
    expect(policy.applies({ action: 'invoices:create' })).toBe(false);
  });

  it('does not apply when no role', () => {
    expect(policy.applies({ subject: {}, action: 'invoices:create' })).toBe(false);
  });

  it('does not apply when action is not resource:verb shaped', () => {
    expect(policy.applies({ subject: { role: 'hr' }, action: 'create' })).toBe(false);
  });

  it('does not apply when action is missing', () => {
    expect(policy.applies({ subject: { role: 'hr' } })).toBe(false);
  });
});

describe('domain-sod ABAC policy — evaluate()', () => {
  it('denies hr from invoices:create with structured reason + meta', () => {
    const result = policy.evaluate({
      subject: { role: 'hr' },
      action: 'invoices:create',
    });
    expect(result.effect).toBe('deny');
    expect(result.reason).toBe('domain_sod:sod-hr-cannot-touch-finance');
    expect(result.meta.severity).toBe('high');
    expect(result.meta.ruleId).toBe('sod-hr-cannot-touch-finance');
    expect(result.meta.description).toMatch(/HR/);
  });

  it('denies internal_auditor from any write action via wildcard rule', () => {
    const result = policy.evaluate({
      subject: { role: 'internal_auditor' },
      action: 'employees:create',
    });
    expect(result.effect).toBe('deny');
    expect(result.meta.ruleId).toBe('sod-internal-auditor-readonly');
  });

  it('denies therapist from invoices:approve', () => {
    const result = policy.evaluate({
      subject: { role: 'therapist_slp' },
      action: 'invoices:approve',
    });
    expect(result.effect).toBe('deny');
    expect(result.meta.ruleId).toBe('sod-clinical-cannot-bill');
  });

  it('denies finance from care_plans:read (PDPL minimization)', () => {
    const result = policy.evaluate({
      subject: { role: 'accountant' },
      action: 'care_plans:read',
    });
    expect(result.effect).toBe('deny');
    expect(result.meta.ruleId).toBe('sod-finance-cannot-read-clinical');
  });

  it('returns not_applicable when role is allowed', () => {
    expect(policy.evaluate({ subject: { role: 'hr' }, action: 'employees:read' })).toEqual({
      effect: 'not_applicable',
    });
    expect(policy.evaluate({ subject: { role: 'accountant' }, action: 'invoices:create' })).toEqual(
      { effect: 'not_applicable' }
    );
  });

  it('lowercases the role before checking (case-insensitive)', () => {
    const result = policy.evaluate({
      subject: { role: 'HR_OFFICER' },
      action: 'invoices:create',
    });
    expect(result.effect).toBe('deny');
  });

  it('returns not_applicable when role is unknown (not in any rule)', () => {
    expect(
      policy.evaluate({ subject: { role: 'some_random_role' }, action: 'invoices:create' })
    ).toEqual({ effect: 'not_applicable' });
  });
});
