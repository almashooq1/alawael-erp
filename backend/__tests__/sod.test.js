/**
 * Segregation of Duties registry + checker tests.
 */

const {
  findConflict,
  rulesInvolving,
  allRules,
  check,
  assess,
  SodViolationError,
} = require('../authorization/sod');

describe('SoD registry', () => {
  test('contains expected core rules', () => {
    const ids = allRules().map(r => r.id);
    expect(ids).toContain('sod-invoice-create-approve');
    expect(ids).toContain('sod-payroll-run-disburse');
    expect(ids).toContain('sod-irp-author-approve');
  });

  test('findConflict detects pair in either direction', () => {
    const c1 = findConflict('invoice.approve', ['invoice.create']);
    expect(c1.rule.id).toBe('sod-invoice-create-approve');
    expect(c1.conflictingWith).toBe('invoice.create');

    const c2 = findConflict('invoice.create', ['invoice.approve']);
    expect(c2.rule.id).toBe('sod-invoice-create-approve');
    expect(c2.conflictingWith).toBe('invoice.approve');
  });

  test('findConflict returns null when unrelated', () => {
    expect(findConflict('invoice.read', ['invoice.create'])).toBeNull();
    expect(findConflict('unknown.action', [])).toBeNull();
  });

  test('rulesInvolving returns all rules that mention an action', () => {
    const rules = rulesInvolving('invoice.create');
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules.every(r => r.pair.includes('invoice.create'))).toBe(true);
  });
});

describe('SoD checker — throwing API', () => {
  test('throws SodViolationError on conflict', () => {
    expect.assertions(4);
    try {
      check('invoice.approve', ['invoice.create']);
    } catch (err) {
      expect(err).toBeInstanceOf(SodViolationError);
      expect(err.code).toBe('SOD_VIOLATION');
      expect(err.ruleId).toBe('sod-invoice-create-approve');
      expect(err.conflictingWith).toBe('invoice.create');
    }
  });

  test('returns null when no conflict', () => {
    expect(check('invoice.approve', ['invoice.read'])).toBeNull();
  });
});

describe('SoD checker — non-throwing API', () => {
  test('assess returns ok=true for safe action', () => {
    expect(assess('invoice.approve', [])).toEqual({ ok: true });
  });

  test('assess returns rule for conflict', () => {
    const r = assess('payroll.disburse', ['payroll.run']);
    expect(r.ok).toBe(false);
    expect(r.rule.id).toBe('sod-payroll-run-disburse');
    expect(r.allowEscalation).toBe(false);
  });

  test('assess surfaces allowEscalation for escalatable rules', () => {
    const r = assess('invoice.approve', ['invoice.create']);
    expect(r.allowEscalation).toBe(true);
  });
});
