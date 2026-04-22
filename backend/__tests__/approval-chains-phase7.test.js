/**
 * approval-chains-phase7.test.js — Phase 7 additions to the
 * approval-chain catalog.
 *
 * Verifies:
 *   • The 7 new chains are registered (4 expense bands + payroll +
 *     2 care-plan variants).
 *   • selectChain() picks the right band based on amount / flags.
 *   • Every step uses a role that exists in rbac.config ROLES
 *     (drift invariant — a typo in a chain would silently route
 *     approvals to nobody).
 *   • SLA dueHours are sane (1 ≤ hours ≤ 336).
 *   • The payroll chain has the dual-sign-off property — the final
 *     two steps are different roles (hr_officer → group_chro →
 *     group_cfo: three distinct roles enforcing SoD).
 */

'use strict';

const { CHAINS, selectChain } = require('../authorization/approvals/chains');
const { ROLES } = require('../config/rbac.config');

const PHASE7_CHAIN_IDS = [
  'A-12-expense-small',
  'A-12-expense-mid',
  'A-12-expense-large',
  'A-12-expense-huge',
  'A-14-payroll',
  'A-16-careplan',
  'A-16-careplan-complex',
];

describe('Phase-7 approval chains — registration', () => {
  it.each(PHASE7_CHAIN_IDS)('chain "%s" is registered with ≥1 step', id => {
    const chain = CHAINS[id];
    expect(chain).toBeDefined();
    expect(chain.name).toMatch(/.+/);
    expect(chain.resourceType).toMatch(/.+/);
    expect(Array.isArray(chain.steps)).toBe(true);
    expect(chain.steps.length).toBeGreaterThanOrEqual(1);
  });
});

describe('selectChain — expense thresholds', () => {
  it.each([
    [0, 'A-12-expense-small'],
    [2500, 'A-12-expense-small'],
    [5000, 'A-12-expense-small'],
    [5001, 'A-12-expense-mid'],
    [25000, 'A-12-expense-mid'],
    [49999, 'A-12-expense-mid'],
    [50000, 'A-12-expense-large'],
    [100000, 'A-12-expense-large'],
    [200000, 'A-12-expense-large'],
    [200001, 'A-12-expense-huge'],
    [500000, 'A-12-expense-huge'],
  ])('amount %i → %s', (amount, expected) => {
    expect(selectChain('A-12', { amount })).toBe(expected);
  });

  it('uses `total` if `amount` is missing (same precedence as legacy A-07)', () => {
    expect(selectChain('A-12', { total: 10000 })).toBe('A-12-expense-mid');
  });
});

describe('selectChain — care plan complexity', () => {
  it('plain care plan → 2-step chain', () => {
    expect(selectChain('A-16', {})).toBe('A-16-careplan');
  });
  it('complex multidisciplinary → 3-step chain', () => {
    expect(selectChain('A-16', { complexMultidisciplinary: true })).toBe('A-16-careplan-complex');
  });
});

describe('Phase-7 chains — SoD property on payroll', () => {
  it('payroll chain uses 3 distinct roles enforcing separation', () => {
    const payroll = CHAINS['A-14-payroll'];
    const roles = payroll.steps.map(s => s.role);
    expect(new Set(roles).size).toBe(roles.length); // all distinct
    // Initiator is HR, signatories are CHRO + CFO (different domains)
    expect(roles[0]).toBe('hr_officer');
    expect(roles).toContain('group_chro');
    expect(roles).toContain('group_cfo');
  });
});

describe('drift invariants — every step role exists in rbac config', () => {
  // Some chain steps use pseudo-role labels for external / non-user
  // approvers (parent_nafath_sign, parent_portal_ack, legal_reviewer,
  // procurement_officer, department_owner, dpo, clinical_supervisor,
  // hq_cmo, hq_chro, hq_cfo, hq_cqo, branch_hr_manager, quality_officer).
  // Those are LEGACY pre-Phase-7 entries — we only assert the drift
  // invariant on the Phase-7 chains this commit adds, so a typo HERE
  // doesn't silently misroute the new expense/payroll/care flows.
  const knownRoles = new Set(Object.values(ROLES));

  it('every Phase-7 chain role resolves to a real rbac role', () => {
    const errors = [];
    for (const id of PHASE7_CHAIN_IDS) {
      const chain = CHAINS[id];
      for (const step of chain.steps) {
        if (!knownRoles.has(step.role)) {
          errors.push(`${id} → "${step.role}" not in rbac config ROLES`);
        }
      }
    }
    if (errors.length) throw new Error('Unknown roles:\n  ' + errors.join('\n  '));
  });

  it('every Phase-7 chain step has a sane dueHours (1..336)', () => {
    const errors = [];
    for (const id of PHASE7_CHAIN_IDS) {
      const chain = CHAINS[id];
      for (const [i, step] of chain.steps.entries()) {
        if (typeof step.dueHours !== 'number' || step.dueHours < 1 || step.dueHours > 336) {
          errors.push(`${id}[${i}] dueHours=${step.dueHours} (must be 1..336)`);
        }
      }
    }
    if (errors.length) throw new Error('Out-of-range dueHours:\n  ' + errors.join('\n  '));
  });

  it('every Phase-7 chain step has a valid branchScope', () => {
    const validScopes = new Set([
      'branch',
      'region',
      'group',
      'external',
      'sending_branch',
      'receiving_branch',
    ]);
    for (const id of PHASE7_CHAIN_IDS) {
      for (const step of CHAINS[id].steps) {
        expect(validScopes.has(step.branchScope)).toBe(true);
      }
    }
  });
});
