'use strict';

/**
 * hr-approval-rules.test.js — Phase 11 Commit 11 (4.0.28).
 *
 * Pure coverage of the approval-rule matchers. No DB.
 */

const { RULES, detectTriggeredRules, findRule } = require('../config/hr-approval-rules');

describe('RULES shape', () => {
  it('every rule has id + label + matcher', () => {
    for (const r of RULES) {
      expect(typeof r.id).toBe('string');
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.label).toBe('string');
      expect(typeof r.matcher).toBe('function');
    }
  });

  it('ids are unique', () => {
    const ids = RULES.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('findRule returns the rule or null', () => {
    expect(findRule('salary.increase_gt_15pct').id).toBe('salary.increase_gt_15pct');
    expect(findRule('nope')).toBeNull();
  });
});

describe('salary.increase_gt_15pct', () => {
  it('triggers when salary jumps by > 15%', () => {
    expect(
      detectTriggeredRules({
        patch: { basic_salary: 12000 },
        existing: { basic_salary: 10000 }, // 20% bump
      })
    ).toContain('salary.increase_gt_15pct');
  });

  it('does NOT trigger for 10% bump', () => {
    expect(
      detectTriggeredRules({
        patch: { basic_salary: 11000 },
        existing: { basic_salary: 10000 },
      })
    ).not.toContain('salary.increase_gt_15pct');
  });

  it('edge: exactly 15% does NOT trigger', () => {
    expect(
      detectTriggeredRules({
        patch: { basic_salary: 11500 },
        existing: { basic_salary: 10000 },
      })
    ).not.toContain('salary.increase_gt_15pct');
  });

  it('triggers when setting non-zero salary on zero baseline', () => {
    expect(
      detectTriggeredRules({
        patch: { basic_salary: 5000 },
        existing: { basic_salary: 0 },
      })
    ).toContain('salary.increase_gt_15pct');
  });
});

describe('salary.decrease_any', () => {
  it('triggers on any decrease', () => {
    expect(
      detectTriggeredRules({
        patch: { basic_salary: 9500 },
        existing: { basic_salary: 10000 },
      })
    ).toContain('salary.decrease_any');
  });

  it('does NOT trigger when patch omits salary', () => {
    expect(
      detectTriggeredRules({
        patch: { department: 'clinical' },
        existing: { basic_salary: 10000 },
      })
    ).not.toContain('salary.decrease_any');
  });
});

describe('employment.termination + suspension', () => {
  it('termination triggers', () => {
    expect(
      detectTriggeredRules({
        patch: { status: 'terminated' },
        existing: { status: 'active' },
      })
    ).toContain('employment.termination');
  });

  it('suspension triggers', () => {
    expect(
      detectTriggeredRules({
        patch: { status: 'suspended' },
        existing: { status: 'active' },
      })
    ).toContain('employment.suspension');
  });

  it('active/on_leave does NOT trigger either', () => {
    const fired = detectTriggeredRules({
      patch: { status: 'on_leave' },
      existing: { status: 'active' },
    });
    expect(fired).not.toContain('employment.termination');
    expect(fired).not.toContain('employment.suspension');
  });
});

describe('employment.branch_transfer', () => {
  it('triggers when branch changes', () => {
    expect(
      detectTriggeredRules({
        patch: { branch_id: 'branch-B' },
        existing: { branch_id: 'branch-A' },
      })
    ).toContain('employment.branch_transfer');
  });

  it('does NOT trigger when branch unchanged', () => {
    expect(
      detectTriggeredRules({
        patch: { branch_id: 'branch-A' },
        existing: { branch_id: 'branch-A' },
      })
    ).not.toContain('employment.branch_transfer');
  });
});

describe('identity.national_id_change', () => {
  it('triggers when an existing id changes', () => {
    expect(
      detectTriggeredRules({
        patch: { national_id: '1111111111' },
        existing: { national_id: '2222222222' },
      })
    ).toContain('identity.national_id_change');
  });

  it('does NOT trigger when field is set for the first time (no prior value)', () => {
    expect(
      detectTriggeredRules({
        patch: { national_id: '1111111111' },
        existing: {},
      })
    ).not.toContain('identity.national_id_change');
  });

  it('catches iqama + passport changes too', () => {
    const fired = detectTriggeredRules({
      patch: { iqama_number: '2222222222' },
      existing: { iqama_number: '1111111111' },
    });
    expect(fired).toContain('identity.national_id_change');
  });
});

describe('compensation.material_allowance_change', () => {
  it('triggers when housing allowance jumps > 20%', () => {
    expect(
      detectTriggeredRules({
        patch: { housing_allowance: 2500 },
        existing: { housing_allowance: 2000 }, // 25% bump
      })
    ).toContain('compensation.material_allowance_change');
  });

  it('triggers on large decrease too', () => {
    expect(
      detectTriggeredRules({
        patch: { housing_allowance: 1000 },
        existing: { housing_allowance: 2000 }, // 50% drop
      })
    ).toContain('compensation.material_allowance_change');
  });

  it('does NOT trigger for 10% bump', () => {
    expect(
      detectTriggeredRules({
        patch: { housing_allowance: 2200 },
        existing: { housing_allowance: 2000 },
      })
    ).not.toContain('compensation.material_allowance_change');
  });
});

describe('detectTriggeredRules — composition', () => {
  it('returns empty when no rule triggers', () => {
    expect(
      detectTriggeredRules({
        patch: { phone: '0501234567', department: 'clinical' },
        existing: { phone: '0509999999', department: 'support' },
      })
    ).toEqual([]);
  });

  it('returns multiple rule ids when many trigger at once', () => {
    const fired = detectTriggeredRules({
      patch: {
        basic_salary: 15000, // +50%
        status: 'suspended', // suspension
        branch_id: 'branch-NEW', // transfer
      },
      existing: {
        basic_salary: 10000,
        status: 'active',
        branch_id: 'branch-OLD',
      },
    });
    expect(fired).toEqual(
      expect.arrayContaining([
        'salary.increase_gt_15pct',
        'employment.suspension',
        'employment.branch_transfer',
      ])
    );
  });

  it('handles null/undefined input gracefully', () => {
    expect(detectTriggeredRules({ patch: null, existing: {} })).toEqual([]);
    expect(detectTriggeredRules({ patch: {}, existing: null })).toEqual([]);
    expect(detectTriggeredRules({})).toEqual([]);
  });
});
