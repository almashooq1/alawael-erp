/**
 * Smart Alerts engine tests — verify registration, evaluation, dedupe,
 * auto-resolve, and the 5 bundled rules.
 */

const { AlertsEngine, buildEngine, rules } = require('../alerts');

function finder(rows) {
  return { find: async q => rows.filter(r => shallowMatch(r, q)) };
}
function shallowMatch(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    const docVal = k.includes('.')
      ? k.split('.').reduce((o, p) => (o ? o[p] : undefined), doc)
      : doc[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(docVal);
      if ('$nin' in v) return !v.$nin.includes(docVal);
      if ('$gte' in v || '$lte' in v) {
        if (docVal == null) return false;
        const d = docVal instanceof Date ? docVal.getTime() : docVal;
        if (v.$gte != null) {
          const g = v.$gte instanceof Date ? v.$gte.getTime() : v.$gte;
          if (d < g) return false;
        }
        if (v.$lte != null) {
          const l = v.$lte instanceof Date ? v.$lte.getTime() : v.$lte;
          if (d > l) return false;
        }
        return true;
      }
    }
    return docVal === v;
  });
}

describe('AlertsEngine — registration', () => {
  test('register and registerAll', () => {
    const eng = new AlertsEngine();
    eng.register({ id: 'a', evaluate: async () => [] });
    eng.registerAll([{ id: 'b', evaluate: async () => [] }]);
    expect(eng.rules.size).toBe(2);
  });

  test('throws on duplicate id', () => {
    const eng = new AlertsEngine();
    eng.register({ id: 'x', evaluate: async () => [] });
    expect(() => eng.register({ id: 'x', evaluate: async () => [] })).toThrow('duplicate');
  });

  test('throws on missing evaluate', () => {
    const eng = new AlertsEngine();
    expect(() => eng.register({ id: 'x' })).toThrow();
  });
});

describe('AlertsEngine — evaluation', () => {
  test('raises new alerts and dedupes on second run', async () => {
    const eng = new AlertsEngine();
    eng.register({
      id: 'test-rule',
      severity: 'warning',
      category: 'hr',
      description: 'test',
      evaluate: async () => [
        { key: 'k1', message: 'one' },
        { key: 'k2', message: 'two' },
      ],
    });
    const first = await eng.runAll({});
    expect(first.raised.length).toBe(2);

    const second = await eng.runAll({});
    expect(second.raised.length).toBe(0); // dedup'd
    expect(second.activeCount).toBe(2);
  });

  test('auto-resolves when condition clears', async () => {
    const eng = new AlertsEngine();
    let findings = [{ key: 'k1', message: 'x' }];
    eng.register({
      id: 'test',
      evaluate: async () => findings,
    });
    await eng.runAll({});
    expect(eng.activeAlerts.size).toBe(1);

    findings = [];
    const run = await eng.runAll({});
    expect(run.resolved.length).toBe(1);
    expect(eng.activeAlerts.size).toBe(0);
  });

  test('swallows rule errors without crashing', async () => {
    const eng = new AlertsEngine();
    eng.register({
      id: 'bad',
      evaluate: async () => {
        throw new Error('oops');
      },
    });
    eng.register({ id: 'good', evaluate: async () => [{ key: 'k', message: 'ok' }] });
    const result = await eng.runAll({ logger: { error: () => {} } });
    expect(result.raised.length).toBe(1);
    expect(result.raised[0].ruleId).toBe('good');
  });
});

describe('buildEngine() with bundled rules', () => {
  test('registers all 5 rules', () => {
    expect(rules.length).toBe(5);
    const eng = buildEngine();
    expect(eng.rules.size).toBe(5);
  });

  test('credential-expiry-30d fires on near-expiry records', async () => {
    const eng = buildEngine();
    const now = new Date('2026-04-17');
    const Credential = finder([
      {
        _id: 'c1',
        verificationStatus: 'verified',
        expiryDate: new Date('2026-04-30'),
        licenseNumber: 'L-1',
        branchId: 'br-1',
        employeeId: 'e-1',
      },
      {
        _id: 'c2',
        verificationStatus: 'verified',
        expiryDate: new Date('2026-10-10'),
        licenseNumber: 'L-2',
        branchId: 'br-1',
      }, // > 30d
      {
        _id: 'c3',
        verificationStatus: 'pending',
        expiryDate: new Date('2026-04-25'),
        licenseNumber: 'L-3',
        branchId: 'br-1',
      }, // not verified
    ]);
    const result = await eng.runAll({ now: () => now, models: { Credential } });
    const cred = result.raised.filter(a => a.ruleId === 'credential-expiry-30d');
    expect(cred.length).toBe(1);
    expect(cred[0].message).toContain('L-1');
  });

  test('incident-major fires on open major incidents', async () => {
    const eng = buildEngine();
    const Incident = finder([
      { _id: 'i1', severity: 'major', status: 'open', incidentNumber: 'INC-1', branchId: 'br-1' },
      { _id: 'i2', severity: 'minor', status: 'open', branchId: 'br-1' },
      { _id: 'i3', severity: 'catastrophic', status: 'closed', branchId: 'br-1' },
    ]);
    const result = await eng.runAll({ models: { Incident } });
    const inc = result.raised.filter(a => a.ruleId === 'incident-major');
    expect(inc.length).toBe(1);
    expect(inc[0].severity).toBe('critical');
  });

  test('invoice-overdue-60d fires on old unpaid invoices', async () => {
    const eng = buildEngine();
    const now = new Date('2026-04-17');
    const Invoice = finder([
      {
        _id: 'inv-1',
        status: 'sent',
        dueDate: new Date('2026-01-01'),
        invoiceNumber: 'INV-1',
        branchId: 'br-1',
      },
      {
        _id: 'inv-2',
        status: 'sent',
        dueDate: new Date('2026-04-01'),
        invoiceNumber: 'INV-2',
        branchId: 'br-1',
      }, // only 16d old
      {
        _id: 'inv-3',
        status: 'paid',
        dueDate: new Date('2026-01-01'),
        invoiceNumber: 'INV-3',
        branchId: 'br-1',
      },
    ]);
    const result = await eng.runAll({ now: () => now, models: { Invoice } });
    const ov = result.raised.filter(a => a.ruleId === 'invoice-overdue-60d');
    expect(ov.length).toBe(1);
    expect(ov[0].message).toContain('INV-1');
  });
});
