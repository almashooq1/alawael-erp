'use strict';

/**
 * health-score-adapters.test.js — Phase 14 Commit 1 (4.0.63).
 *
 * Pure unit tests for the six cross-module HealthScoreAggregator
 * adapters. Uses in-memory fake models (not mongodb-memory-server)
 * so the tests stay fast and don't require the legacy schemas to
 * cooperate.
 */

process.env.NODE_ENV = 'test';

const {
  createIncidentsHealthAdapter,
} = require('../services/quality/adapters/incidentsHealthAdapter');
const {
  createComplaintsHealthAdapter,
} = require('../services/quality/adapters/complaintsHealthAdapter');
const { createCapaHealthAdapter } = require('../services/quality/adapters/capaHealthAdapter');
const {
  createSatisfactionHealthAdapter,
} = require('../services/quality/adapters/satisfactionHealthAdapter');
const {
  createTrainingHealthAdapter,
} = require('../services/quality/adapters/trainingHealthAdapter');
const {
  createDocumentsHealthAdapter,
} = require('../services/quality/adapters/documentsHealthAdapter');
const { buildHealthScoreAdapters } = require('../services/quality/adapters');

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

function makeFakeModel(initial = []) {
  const docs = [...initial];
  return {
    find: filter => {
      const rows = docs.filter(d => _matchQuery(filter || {}, d));
      return { limit: () => Promise.resolve(rows) };
    },
    _docs: () => docs,
  };
}

function _matchQuery(q, d) {
  for (const [key, cond] of Object.entries(q)) {
    const val = _get(d, key);
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      if (cond.$in && !cond.$in.includes(val)) return false;
      if (cond.$gte != null && !(val >= cond.$gte)) return false;
      if (cond.$lte != null && !(val <= cond.$lte)) return false;
      // $ne: null should match both null and undefined (mongo semantics).
      if (cond.$ne !== undefined) {
        if (cond.$ne === null && (val === null || val === undefined)) return false;
        if (cond.$ne !== null && val === cond.$ne) return false;
      }
    } else if (cond === null) {
      // Mongo semantics: field === null matches null or missing.
      if (val !== null && val !== undefined) return false;
    } else if (cond !== val) {
      return false;
    }
  }
  return true;
}
function _get(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

const quietLogger = { warn: () => {}, info: () => {} };

// ─── Incidents ─────────────────────────────────────────────────────

describe('IncidentsHealthAdapter', () => {
  it('returns zero-rate payload on empty set', async () => {
    const a = createIncidentsHealthAdapter({ model: makeFakeModel(), logger: quietLogger });
    const res = await a.getSummary({});
    expect(res.closureRate).toBeNull();
    expect(res.sentinelOpen).toEqual([]);
  });

  it('computes seriousRate + sentinelOpen + closureRate', async () => {
    const rows = [
      // open catastrophic → sentinel + serious
      {
        _id: 'i1',
        incidentNumber: 'INC-2026-001',
        severity: 'catastrophic',
        status: 'investigating',
        occurredAt: daysAgo(10),
        closedAt: null,
      },
      // closed within SLA (major: 3d)
      {
        _id: 'i2',
        incidentNumber: 'INC-2026-002',
        severity: 'major',
        status: 'closed',
        occurredAt: daysAgo(5),
        closedAt: daysAgo(3),
      },
      // closed outside SLA
      {
        _id: 'i3',
        incidentNumber: 'INC-2026-003',
        severity: 'minor',
        status: 'closed',
        occurredAt: daysAgo(60),
        closedAt: daysAgo(30),
      },
      // open minor (not serious)
      {
        _id: 'i4',
        incidentNumber: 'INC-2026-004',
        severity: 'minor',
        status: 'reported',
        occurredAt: daysAgo(2),
        closedAt: null,
      },
    ];
    const a = createIncidentsHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
    const res = await a.getSummary({});
    expect(res.sentinelOpen).toHaveLength(1);
    expect(res.sentinelOpen[0].severity).toBe('catastrophic');
    // 2 closed total, 1 on-time → closureRate = 0.5
    expect(res.closureRate).toBeCloseTo(0.5);
    expect(res.seriousRate).toBeGreaterThan(0);
  });

  it('caps sentinelOpen list', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      _id: `s${i}`,
      incidentNumber: `INC-${i}`,
      severity: 'catastrophic',
      status: 'reported',
      occurredAt: daysAgo(1),
    }));
    const a = createIncidentsHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
    const res = await a.getSummary({});
    expect(res.sentinelOpen.length).toBeLessThanOrEqual(10);
  });
});

// ─── Complaints ────────────────────────────────────────────────────

describe('ComplaintsHealthAdapter', () => {
  function build(rows) {
    return createComplaintsHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
  }

  it('returns null when no resolved complaints', async () => {
    expect(await build([]).getSlaRate({})).toBeNull();
  });

  it('computes fraction resolved within priority SLA', async () => {
    const a = build([
      // critical → 24h SLA, resolved in 10h → on time
      {
        priority: 'critical',
        status: 'resolved',
        createdAt: new Date('2026-03-01T00:00:00Z'),
        resolvedAt: new Date('2026-03-01T10:00:00Z'),
      },
      // medium → 168h SLA, resolved in 200h → late
      {
        priority: 'medium',
        status: 'resolved',
        createdAt: new Date('2026-03-01T00:00:00Z'),
        resolvedAt: new Date('2026-03-09T08:00:00Z'),
      },
      // high → 72h SLA, resolved in 48h → on time
      {
        priority: 'high',
        status: 'closed',
        createdAt: new Date('2026-03-01T00:00:00Z'),
        resolvedAt: new Date('2026-03-03T00:00:00Z'),
      },
    ]);
    const rate = await a.getSlaRate({});
    expect(rate).toBeCloseTo(2 / 3);
  });

  it('unknown priority falls back to medium SLA', async () => {
    const a = build([
      {
        priority: 'unknown-xx',
        status: 'resolved',
        createdAt: new Date('2026-03-01T00:00:00Z'),
        resolvedAt: new Date('2026-03-02T00:00:00Z'), // 24h, well within medium 168
      },
    ]);
    expect(await a.getSlaRate({})).toBe(1);
  });
});

// ─── CAPA ──────────────────────────────────────────────────────────

describe('CapaHealthAdapter', () => {
  function build(rows) {
    return createCapaHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
  }

  it('returns null when no completed CAPAs', async () => {
    expect(await build([]).getClosureSlaRate({})).toBeNull();
  });

  it('counts on-time when actual ≤ target', async () => {
    const a = build([
      {
        implementation: {
          targetCompletionDate: daysAgo(10),
          actualCompletionDate: daysAgo(12),
        },
      },
      {
        implementation: {
          targetCompletionDate: daysAgo(10),
          actualCompletionDate: daysAgo(5),
        },
      },
    ]);
    expect(await a.getClosureSlaRate({})).toBeCloseTo(0.5);
  });

  it('missing target counts as on-time (no penalty for incomplete data)', async () => {
    const a = build([
      { implementation: { actualCompletionDate: daysAgo(10) } }, // no target
    ]);
    expect(await a.getClosureSlaRate({})).toBe(1);
  });
});

// ─── Satisfaction ──────────────────────────────────────────────────

describe('SatisfactionHealthAdapter', () => {
  function build(rows) {
    return createSatisfactionHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
  }

  it('returns null NPS + 0 count when no recent surveys', async () => {
    const res = await build([]).getLatestNps({});
    expect(res).toEqual({ nps: null, responseCount: 0 });
  });

  it('computes NPS from promoters − detractors / total', async () => {
    const a = build([
      { npsScore: 10, createdAt: daysAgo(5) }, // promoter
      { npsScore: 9, createdAt: daysAgo(5) }, // promoter
      { npsScore: 8, createdAt: daysAgo(5) }, // passive
      { npsScore: 6, createdAt: daysAgo(5) }, // detractor
      { npsScore: 3, createdAt: daysAgo(5) }, // detractor
    ]);
    const res = await a.getLatestNps({});
    // 2 promoters - 2 detractors = 0. 0/5 * 100 = 0
    expect(res.nps).toBe(0);
    expect(res.responseCount).toBe(5);
  });

  it('ignores surveys outside the window', async () => {
    const a = build([
      { npsScore: 10, createdAt: daysAgo(200) }, // too old
      { npsScore: 10, createdAt: daysAgo(5) }, // in-window promoter
    ]);
    const res = await a.getLatestNps({});
    expect(res.nps).toBe(100); // single promoter
    expect(res.responseCount).toBe(1);
  });
});

// ─── Training ──────────────────────────────────────────────────────

describe('TrainingHealthAdapter', () => {
  function build(rows) {
    return createTrainingHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
  }

  it('returns null when no records', async () => {
    expect(await build([]).getMandatoryCompletionRate({})).toBeNull();
  });

  it('excludes waived from denominator', async () => {
    const a = build([
      { status: 'completed' },
      { status: 'pending' },
      { status: 'waived' },
      { status: 'waived' },
    ]);
    // 1 completed / (1 completed + 1 pending) = 0.5
    expect(await a.getMandatoryCompletionRate({})).toBeCloseTo(0.5);
  });

  it('counts overdue as not-completed (in denominator only)', async () => {
    const a = build([{ status: 'completed' }, { status: 'overdue' }, { status: 'overdue' }]);
    expect(await a.getMandatoryCompletionRate({})).toBeCloseTo(1 / 3);
  });
});

// ─── Documents ─────────────────────────────────────────────────────

describe('DocumentsHealthAdapter', () => {
  function build(rows) {
    return createDocumentsHealthAdapter({ model: makeFakeModel(rows), logger: quietLogger });
  }

  it('returns null when no documents', async () => {
    expect(await build([]).getValidDocsRate({})).toBeNull();
  });

  it('counts active + non-expired as valid', async () => {
    const a = build([
      { status: 'نشط', isArchived: false, expiryDate: null }, // valid
      { status: 'نشط', isArchived: false, expiryDate: daysAgo(-30) }, // future expiry → valid
      { status: 'نشط', isArchived: false, expiryDate: daysAgo(1) }, // expired
      { status: 'نشط', isArchived: true }, // archived → not valid
      { status: 'مؤرشف', isArchived: false }, // non-active status → not valid
    ]);
    const rate = await a.getValidDocsRate({});
    expect(rate).toBeCloseTo(2 / 5);
  });

  it('accepts english status values too', async () => {
    const a = build([
      { status: 'active', isArchived: false, expiryDate: null },
      { status: 'published', isArchived: false, expiryDate: null },
      { status: 'archived', isArchived: false },
    ]);
    expect(await a.getValidDocsRate({})).toBeCloseTo(2 / 3);
  });
});

// ─── Factory ───────────────────────────────────────────────────────

describe('buildHealthScoreAdapters factory', () => {
  it('uses injected models when provided', () => {
    const models = {
      incidents: makeFakeModel(),
      complaints: makeFakeModel(),
      capa: makeFakeModel(),
      satisfaction: makeFakeModel(),
      training: makeFakeModel(),
      documents: makeFakeModel(),
    };
    const adapters = buildHealthScoreAdapters({ logger: quietLogger, models });
    expect(adapters.incidents).toBeTruthy();
    expect(adapters.complaints).toBeTruthy();
    expect(adapters.capa).toBeTruthy();
    expect(adapters.satisfaction).toBeTruthy();
    expect(adapters.training).toBeTruthy();
    expect(adapters.documents).toBeTruthy();
    // The expected method exists on each:
    expect(typeof adapters.incidents.getSummary).toBe('function');
    expect(typeof adapters.complaints.getSlaRate).toBe('function');
    expect(typeof adapters.capa.getClosureSlaRate).toBe('function');
    expect(typeof adapters.satisfaction.getLatestNps).toBe('function');
    expect(typeof adapters.training.getMandatoryCompletionRate).toBe('function');
    expect(typeof adapters.documents.getValidDocsRate).toBe('function');
  });

  it('returns null slot when a model fails to resolve', () => {
    const adapters = buildHealthScoreAdapters({
      logger: quietLogger,
      models: { incidents: null }, // explicit null sends it through the try-require path
    });
    // At least some real models should still be resolvable; we're
    // smoke-testing that the structure is consistent regardless.
    expect(adapters).toHaveProperty('incidents');
    expect(adapters).toHaveProperty('complaints');
  });
});
