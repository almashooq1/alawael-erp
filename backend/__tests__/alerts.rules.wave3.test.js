/**
 * Wave 3 alert rules — coverage for the 13 rules added in 2026-05-16.
 *
 * Each rule gets a single canonical test that exercises the
 * happy-path filter (one matching row, one non-matching row) so
 * regressions on the predicate surface immediately. Edge cases
 * (boundary dates, missing fields) are validated by the rule
 * engine's own swallow-errors and dedup tests in alerts.engine.test.js.
 */

'use strict';

const { AlertsEngine } = require('../alerts');
const rules = require('../alerts/rules');

// ─── Test helpers (mirror of alerts.engine.test.js) ──────────────
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
      if ('$lt' in v || '$gt' in v || '$gte' in v || '$lte' in v) {
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
        if (v.$lt != null) {
          const lt = v.$lt instanceof Date ? v.$lt.getTime() : v.$lt;
          if (d >= lt) return false;
        }
        if (v.$gt != null) {
          const gt = v.$gt instanceof Date ? v.$gt.getTime() : v.$gt;
          if (d <= gt) return false;
        }
        return true;
      }
    }
    return docVal === v;
  });
}

function ruleById(id) {
  const r = rules.find(x => x.id === id);
  if (!r) throw new Error(`Rule ${id} not registered`);
  return r;
}

async function runOne(ruleId, models, now = new Date('2026-05-16')) {
  const eng = new AlertsEngine({ now: () => now });
  eng.register(ruleById(ruleId));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === ruleId);
}

// ─── Compliance & documents ──────────────────────────────────────
describe('document-expiring-30d', () => {
  test('fires on docs expiring within 30d, skips others', async () => {
    const Document = finder([
      {
        _id: 'd1',
        status: 'active',
        expiryDate: new Date('2026-06-01'),
        title: 'License A',
        branchId: 'br-1',
      },
      {
        _id: 'd2',
        status: 'active',
        expiryDate: new Date('2026-12-01'),
        title: 'License B',
        branchId: 'br-1',
      }, // >30d
      {
        _id: 'd3',
        status: 'archived',
        expiryDate: new Date('2026-06-01'),
        title: 'License C',
        branchId: 'br-1',
      }, // not active
    ]);
    const raised = await runOne('document-expiring-30d', { Document });
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('d1');
    expect(raised[0].message).toContain('License A');
  });
});

describe('document-expired', () => {
  test('fires on expired active docs', async () => {
    const Document = finder([
      {
        _id: 'd1',
        status: 'active',
        expiryDate: new Date('2026-04-01'),
        title: 'OldDoc',
        branchId: 'br-1',
      },
      {
        _id: 'd2',
        status: 'active',
        expiryDate: new Date('2026-06-01'),
        title: 'FreshDoc',
        branchId: 'br-1',
      },
    ]);
    const raised = await runOne('document-expired', { Document });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('high');
    expect(raised[0].subject.id).toBe('d1');
  });
});

describe('pdpl-dsar-approaching-sla', () => {
  test('fires on 25-30 day window, skips fresh and breached', async () => {
    const now = new Date('2026-05-16');
    const PdplRequest = finder([
      { _id: 'r1', status: 'received', requestType: 'access', requestedAt: new Date('2026-04-19') }, // ~27d → warn
      {
        _id: 'r2',
        status: 'under_review',
        requestType: 'erasure',
        requestedAt: new Date('2026-05-10'),
      }, // 6d → fresh
      { _id: 'r3', status: 'received', requestType: 'access', requestedAt: new Date('2026-04-10') }, // 36d → breach (other rule)
    ]);
    const raised = await runOne('pdpl-dsar-approaching-sla', { PdplRequest }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('r1');
  });
});

describe('pdpl-dsar-sla-breach', () => {
  test('fires on requests older than 30d still open', async () => {
    const now = new Date('2026-05-16');
    const PdplRequest = finder([
      { _id: 'r1', status: 'received', requestType: 'access', requestedAt: new Date('2026-04-10') }, // 36d
      {
        _id: 'r2',
        status: 'completed',
        requestType: 'access',
        requestedAt: new Date('2026-04-10'),
      }, // resolved
      {
        _id: 'r3',
        status: 'under_review',
        requestType: 'access',
        requestedAt: new Date('2026-05-01'),
      }, // 15d → not yet
    ]);
    const raised = await runOne('pdpl-dsar-sla-breach', { PdplRequest }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].subject.id).toBe('r1');
  });
});

// ─── Clinical & safety ───────────────────────────────────────────
describe('care-plan-unsigned-14d', () => {
  test('fires on plans requiring signature unsigned >14d', async () => {
    const now = new Date('2026-05-16');
    const CarePlan = finder([
      {
        _id: 'p1',
        status: 'ACTIVE',
        requiresSignature: true,
        signedAt: null,
        createdAt: new Date('2026-04-01'),
        planNumber: 'CP-1',
        beneficiary: 'b1',
      },
      {
        _id: 'p2',
        status: 'ACTIVE',
        requiresSignature: true,
        signedAt: new Date('2026-04-10'),
        createdAt: new Date('2026-04-01'),
        planNumber: 'CP-2',
        beneficiary: 'b2',
      }, // signed
      {
        _id: 'p3',
        status: 'ACTIVE',
        requiresSignature: false,
        signedAt: null,
        createdAt: new Date('2026-04-01'),
        planNumber: 'CP-3',
        beneficiary: 'b3',
      }, // doesn't require
      {
        _id: 'p4',
        status: 'ACTIVE',
        requiresSignature: true,
        signedAt: null,
        createdAt: new Date('2026-05-10'),
        planNumber: 'CP-4',
        beneficiary: 'b4',
      }, // 6d only
    ]);
    const raised = await runOne('care-plan-unsigned-14d', { CarePlan }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('p1');
  });
});

describe('care-plan-review-overdue', () => {
  test('fires on active plans past reviewDate', async () => {
    const now = new Date('2026-05-16');
    const CarePlan = finder([
      {
        _id: 'p1',
        status: 'ACTIVE',
        reviewDate: new Date('2026-05-01'),
        planNumber: 'CP-1',
        beneficiary: 'b1',
      },
      {
        _id: 'p2',
        status: 'ACTIVE',
        reviewDate: new Date('2026-06-01'),
        planNumber: 'CP-2',
        beneficiary: 'b2',
      },
      {
        _id: 'p3',
        status: 'ARCHIVED',
        reviewDate: new Date('2026-05-01'),
        planNumber: 'CP-3',
        beneficiary: 'b3',
      },
    ]);
    const raised = await runOne('care-plan-review-overdue', { CarePlan }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('p1');
  });
});

describe('goal-stalled-30d', () => {
  test('fires on in-progress goals with no update for 30d', async () => {
    const now = new Date('2026-05-16');
    const Goal = finder([
      {
        _id: 'g1',
        status: 'in-progress',
        lastProgressAt: new Date('2026-04-01'),
        title: 'Stalled-1',
        branchId: 'br-1',
      },
      {
        _id: 'g2',
        status: 'in-progress',
        lastProgressAt: new Date('2026-05-10'),
        title: 'Active-1',
        branchId: 'br-1',
      },
      {
        _id: 'g3',
        status: 'achieved',
        lastProgressAt: new Date('2026-04-01'),
        title: 'Done-1',
        branchId: 'br-1',
      },
    ]);
    const raised = await runOne('goal-stalled-30d', { Goal }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('g1');
  });
});

describe('vaccination-overdue', () => {
  test('fires on scheduled vaccinations past dueDate', async () => {
    const now = new Date('2026-05-16');
    const Vaccination = finder([
      {
        _id: 'v1',
        status: 'scheduled',
        dueDate: new Date('2026-05-01'),
        vaccineName: 'MMR',
        branchId: 'br-1',
        beneficiaryId: 'b1',
      },
      {
        _id: 'v2',
        status: 'scheduled',
        dueDate: new Date('2026-06-01'),
        vaccineName: 'DTaP',
        branchId: 'br-1',
        beneficiaryId: 'b2',
      },
      {
        _id: 'v3',
        status: 'administered',
        dueDate: new Date('2026-05-01'),
        vaccineName: 'Polio',
        branchId: 'br-1',
        beneficiaryId: 'b3',
      },
    ]);
    const raised = await runOne('vaccination-overdue', { Vaccination }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('v1');
    expect(raised[0].message).toContain('MMR');
  });
});

// ─── HR escalations ──────────────────────────────────────────────
describe('credential-expired', () => {
  test('fires only on past-expiry verified credentials', async () => {
    const now = new Date('2026-05-16');
    const Credential = finder([
      {
        _id: 'c1',
        verificationStatus: 'verified',
        expiryDate: new Date('2026-04-30'),
        licenseNumber: 'L-1',
        branchId: 'br-1',
        employeeId: 'e1',
      },
      {
        _id: 'c2',
        verificationStatus: 'verified',
        expiryDate: new Date('2026-06-30'),
        licenseNumber: 'L-2',
        branchId: 'br-1',
        employeeId: 'e2',
      },
      {
        _id: 'c3',
        verificationStatus: 'pending',
        expiryDate: new Date('2026-04-30'),
        licenseNumber: 'L-3',
        branchId: 'br-1',
        employeeId: 'e3',
      },
    ]);
    const raised = await runOne('credential-expired', { Credential }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].subject.id).toBe('c1');
  });
});

describe('employment-contract-expiring-60d', () => {
  test('fires within 60d window on active contracts', async () => {
    const now = new Date('2026-05-16');
    const EmploymentContract = finder([
      {
        _id: 'ec1',
        status: 'active',
        endDate: new Date('2026-06-15'),
        contractNumber: 'EC-1',
        branchId: 'br-1',
        employeeId: 'e1',
      }, // ~30d → fires
      {
        _id: 'ec2',
        status: 'active',
        endDate: new Date('2026-09-01'),
        contractNumber: 'EC-2',
        branchId: 'br-1',
        employeeId: 'e2',
      }, // ~108d → skip
      {
        _id: 'ec3',
        status: 'terminated',
        endDate: new Date('2026-06-15'),
        contractNumber: 'EC-3',
        branchId: 'br-1',
        employeeId: 'e3',
      }, // not active
    ]);
    const raised = await runOne('employment-contract-expiring-60d', { EmploymentContract }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('ec1');
  });
});

describe('employment-contract-expired', () => {
  test('fires on active contracts past endDate (data hole)', async () => {
    const now = new Date('2026-05-16');
    const EmploymentContract = finder([
      {
        _id: 'ec1',
        status: 'active',
        endDate: new Date('2026-04-01'),
        contractNumber: 'EC-1',
        branchId: 'br-1',
        employeeId: 'e1',
      },
      {
        _id: 'ec2',
        status: 'expired',
        endDate: new Date('2026-04-01'),
        contractNumber: 'EC-2',
        branchId: 'br-1',
        employeeId: 'e2',
      }, // correctly marked
      {
        _id: 'ec3',
        status: 'active',
        endDate: new Date('2026-06-01'),
        contractNumber: 'EC-3',
        branchId: 'br-1',
        employeeId: 'e3',
      }, // still in-window
    ]);
    const raised = await runOne('employment-contract-expired', { EmploymentContract }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].subject.id).toBe('ec1');
  });
});

// ─── Financial & quality escalations ─────────────────────────────
describe('invoice-overdue-90d-critical', () => {
  test('fires only at 90+ day mark', async () => {
    const now = new Date('2026-05-16');
    const Invoice = finder([
      {
        _id: 'inv1',
        status: 'sent',
        dueDate: new Date('2026-01-01'),
        invoiceNumber: 'INV-1',
        branchId: 'br-1',
      }, // 135d
      {
        _id: 'inv2',
        status: 'sent',
        dueDate: new Date('2026-03-01'),
        invoiceNumber: 'INV-2',
        branchId: 'br-1',
      }, // 76d → 60d tier only
      {
        _id: 'inv3',
        status: 'paid',
        dueDate: new Date('2026-01-01'),
        invoiceNumber: 'INV-3',
        branchId: 'br-1',
      },
    ]);
    const raised = await runOne('invoice-overdue-90d-critical', { Invoice }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].subject.id).toBe('inv1');
  });
});

describe('incident-critical-open-24h', () => {
  test('fires only on major/catastrophic incidents open >24h', async () => {
    const now = new Date('2026-05-16T12:00:00Z');
    const Incident = finder([
      {
        _id: 'i1',
        severity: 'major',
        status: 'open',
        createdAt: new Date('2026-05-14T00:00:00Z'),
        incidentNumber: 'INC-1',
        branchId: 'br-1',
      }, // 60h
      {
        _id: 'i2',
        severity: 'major',
        status: 'open',
        createdAt: new Date('2026-05-16T06:00:00Z'),
        incidentNumber: 'INC-2',
        branchId: 'br-1',
      }, // 6h → not yet
      {
        _id: 'i3',
        severity: 'minor',
        status: 'open',
        createdAt: new Date('2026-05-14T00:00:00Z'),
        incidentNumber: 'INC-3',
        branchId: 'br-1',
      }, // wrong severity
      {
        _id: 'i4',
        severity: 'catastrophic',
        status: 'closed',
        createdAt: new Date('2026-05-14T00:00:00Z'),
        incidentNumber: 'INC-4',
        branchId: 'br-1',
      }, // closed
    ]);
    const raised = await runOne('incident-critical-open-24h', { Incident }, now);
    expect(raised).toHaveLength(1);
    expect(raised[0].subject.id).toBe('i1');
  });
});

// ─── Cross-rule sanity ───────────────────────────────────────────
describe('rule registry shape', () => {
  test('every rule has id, severity, category, description, evaluate', () => {
    for (const r of rules) {
      expect(typeof r.id).toBe('string');
      expect(r.id.length).toBeGreaterThan(0);
      expect(['info', 'warning', 'high', 'critical']).toContain(r.severity);
      expect(['hr', 'financial', 'clinical', 'quality', 'compliance', 'operational']).toContain(
        r.category
      );
      expect(typeof r.description).toBe('string');
      expect(typeof r.evaluate).toBe('function');
    }
  });

  test('no duplicate rule IDs', () => {
    const ids = rules.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('each rule handles missing models gracefully', async () => {
    for (const r of rules) {
      const out = await r.evaluate({ models: {} });
      expect(Array.isArray(out)).toBe(true);
    }
  });
});
