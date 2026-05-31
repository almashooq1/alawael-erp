'use strict';

/**
 * check-risk-rule-keys-script.test.js — self-test for the F10 regression guard
 * (scripts/check-risk-rule-keys.js): every risk-rule token must resolve to a
 * real seed permission key or role code. No DB, no boot.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-risk-rule-keys.js');
const { evaluate } = require('../scripts/check-risk-rule-keys');

const SEED = {
  permissions: [{ key: 'beneficiary:billing:approve' }, { key: 'beneficiary:billing:create' }],
  roles: [{ code: 'AUD' }, { code: 'BRM' }],
};

describe('check-risk-rule-keys — evaluate() resolution', () => {
  it('passes when every token resolves to a seed key or role code', () => {
    const rules = {
      rules: [
        {
          code: 'OK',
          match: {
            grantingAny: ['beneficiary:billing:approve'],
            conflictsWith: ['beneficiary:billing:create'],
          },
        },
      ],
    };
    const r = evaluate(rules, SEED);
    expect(r.unresolved).toEqual([]);
    expect(r.total).toBe(2);
  });

  it('flags a phantom permission key (the F10 bug)', () => {
    const rules = { rules: [{ code: 'BAD', match: { grantingAny: ['invoice:approve'] } }] };
    const r = evaluate(rules, SEED);
    expect(r.unresolved).toEqual([{ code: 'BAD', field: 'grantingAny', token: 'invoice:approve' }]);
  });

  it('resolves a role code via heldRoleAny', () => {
    const rules = { rules: [{ code: 'AUDR', match: { heldRoleAny: ['AUD'] } }] };
    expect(evaluate(rules, SEED).unresolved).toEqual([]);
  });

  it('skips wildcard class-matchers (not counted, never flagged)', () => {
    const rules = { rules: [{ code: 'W', match: { grantingAny: ['*:create', 'billing:*'] } }] };
    const r = evaluate(rules, SEED);
    expect(r.total).toBe(0);
    expect(r.unresolved).toEqual([]);
  });
});

describe('check-risk-rule-keys — real catalog + CLI', () => {
  it('the live authz-risk-rules.json resolves cleanly against the seed (F10 stays closed)', () => {
    const rules = require('../../docs/architecture/authz-risk-rules.json');
    const seed = require('../../docs/architecture/role-permissions.seed.json');
    expect(evaluate(rules, seed).unresolved).toEqual([]);
  });

  it('CLI exits 0 with the intact message', () => {
    const out = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(out).toMatch(/risk-rule keys intact/);
  });
});
