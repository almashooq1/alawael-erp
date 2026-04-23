'use strict';

/**
 * quality-wrap-up-schedulers.test.js — Phase 13 Commits 6/7/8 (4.0.62).
 *
 * Tests the CAPA aging scheduler, Risk re-assessment scheduler,
 * and NCR auto-link pipeline. Uses in-memory fake models (not
 * mongodb-memory-server) because the underlying CAPA + NCR models
 * have heavy legacy schemas and we only care about behaviour, not
 * index validation. Risk uses a minimal fake too.
 */

process.env.NODE_ENV = 'test';

const {
  createCapaAgingScheduler,
  AGING_WINDOWS,
} = require('../services/quality/capaAgingScheduler.service');
const {
  createRiskReassessmentScheduler,
  computeOverdue,
  CADENCE_DAYS,
} = require('../services/quality/riskReassessmentScheduler.service');
const {
  createNcrAutoLinkPipeline,
  SEVERITIES_TRIGGERING,
} = require('../services/quality/ncrAutoLinkPipeline.service');
const { createQualityEventBus } = require('../services/quality/qualityEventBus.service');

function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000);
}

// ─── Fake mongoose-ish model ──────────────────────────────────────

function makeFakeModel(initial = []) {
  const docs = initial.map(d => ({
    ...d,
    save: async function () {
      return this;
    },
  }));

  function matches(query, doc) {
    for (const [key, cond] of Object.entries(query)) {
      const val = _get(doc, key);
      if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
        if (cond.$in && !cond.$in.includes(val)) return false;
        if (cond.$lt != null && !(val < cond.$lt)) return false;
        if (cond.$gt != null && !(val > cond.$gt)) return false;
        if (cond.$gte != null && !(val >= cond.$gte)) return false;
        if (cond.$lte != null && !(val <= cond.$lte)) return false;
        if (cond.$ne !== undefined && val === cond.$ne) return false;
      } else if (cond !== val) {
        return false;
      }
    }
    return true;
  }

  function _get(obj, path) {
    return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  }

  return {
    docs,
    create: async data => {
      const d = {
        _id: `mock-${docs.length + 1}`,
        ...data,
        save: async function () {
          return this;
        },
      };
      docs.push(d);
      return d;
    },
    find: filter => {
      const rows = docs.filter(d => matches(filter || {}, d));
      const api = {
        limit: () => api,
        sort: () => api,
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
  };
}

// ─── CAPA scheduler ─────────────────────────────────────────────────

describe('CapaAgingScheduler', () => {
  function dispatcher() {
    const events = [];
    return {
      events,
      async emit(name, payload) {
        events.push({ name, payload });
      },
    };
  }

  it('flips past-target non-completed CAPAs to delayed', async () => {
    const d = dispatcher();
    const capaModel = makeFakeModel([
      {
        _id: 'c1',
        actionId: 'CAPA-2026-001',
        type: 'corrective',
        implementation: {
          status: 'in-progress',
          targetCompletionDate: daysFromNow(-10),
          actualCompletionDate: null,
        },
      },
      {
        _id: 'c2',
        actionId: 'CAPA-2026-002',
        type: 'corrective',
        implementation: {
          status: 'completed',
          targetCompletionDate: daysFromNow(-10),
          actualCompletionDate: daysFromNow(-5),
        },
      },
    ]);
    const s = createCapaAgingScheduler({ capaModel, dispatcher: d });
    const report = await s.tick();
    expect(report.flippedDelayed).toBe(1);
    expect(capaModel._docs()[0].implementation.status).toBe('delayed');
    expect(capaModel._docs()[1].implementation.status).toBe('completed');
    expect(d.events.find(e => e.name === 'quality.capa.overdue')).toBeDefined();
  });

  it('emits effectiveness-check reminder 30d after completion', async () => {
    const d = dispatcher();
    const capaModel = makeFakeModel([
      {
        _id: 'c3',
        actionId: 'CAPA-2026-003',
        type: 'corrective',
        implementation: {
          status: 'completed',
          actualCompletionDate: daysFromNow(-30),
          targetCompletionDate: daysFromNow(-45),
        },
      },
    ]);
    const s = createCapaAgingScheduler({ capaModel, dispatcher: d });
    const r = await s.tick();
    expect(r.effectivenessDue).toBe(1);
    expect(d.events.find(e => e.name === 'quality.capa.effectiveness_check_due')).toBeDefined();
  });

  it('emits aging alert at windows 7/30/60 when crossing', async () => {
    const d = dispatcher();
    const capaModel = makeFakeModel([
      {
        _id: 'c4',
        actionId: 'CAPA-2026-004',
        type: 'corrective',
        implementation: {
          status: 'delayed',
          targetCompletionDate: daysFromNow(-7), // just crossed 7-day window
          actualCompletionDate: null,
        },
      },
    ]);
    const s = createCapaAgingScheduler({ capaModel, dispatcher: d });
    const r = await s.tick();
    expect(r.agingAlerts).toBeGreaterThanOrEqual(1);
    expect(d.events.some(e => e.name === 'quality.capa.aging')).toBe(true);
  });

  it('exports AGING_WINDOWS as [7, 30, 60]', () => {
    expect(AGING_WINDOWS).toEqual([7, 30, 60]);
  });
});

// ─── Risk re-assessment scheduler ───────────────────────────────────

describe('RiskReassessmentScheduler', () => {
  describe('computeOverdue helper', () => {
    it('returns null for closed/accepted risks', () => {
      expect(computeOverdue({ status: 'closed' })).toBeNull();
      expect(computeOverdue({ status: 'accepted' })).toBeNull();
    });

    it('uses cadence per riskLevel', () => {
      const base = new Date('2026-04-01');
      const r = {
        status: 'open',
        riskLevel: 'critical',
        reviewDate: new Date('2026-02-15'), // 45d back
      };
      const out = computeOverdue(r, base);
      expect(out.cadenceDays).toBe(30);
      expect(out.overdue).toBe(true);
      expect(out.daysSinceReview).toBeGreaterThan(30);
    });

    it('not overdue when within window', () => {
      const base = new Date('2026-04-01');
      const r = {
        status: 'open',
        riskLevel: 'low',
        reviewDate: new Date('2026-03-15'),
      };
      const out = computeOverdue(r, base);
      expect(out.cadenceDays).toBe(180);
      expect(out.overdue).toBe(false);
    });

    it('falls back to createdAt when reviewDate is null', () => {
      const out = computeOverdue(
        { status: 'open', riskLevel: 'medium', reviewDate: null, createdAt: daysFromNow(-200) },
        new Date()
      );
      expect(out.overdue).toBe(true);
    });
  });

  it('emits reassessment_due for overdue risks (dedup 24h)', async () => {
    const d = {
      events: [],
      async emit(n, p) {
        this.events.push({ name: n, payload: p });
      },
    };
    const riskModel = makeFakeModel([
      {
        _id: 'r1',
        riskNumber: 'RSK-2026-001',
        riskLevel: 'high',
        status: 'mitigating',
        reviewDate: daysFromNow(-200),
      },
    ]);
    const s = createRiskReassessmentScheduler({ riskModel, dispatcher: d });
    const r1 = await s.tick();
    expect(r1.overdue).toBe(1);
    // Second tick within 24h → dedup, no re-emit.
    const r2 = await s.tick();
    expect(r2.overdue).toBe(0);
  });

  it('emits due_soon at ≥80% of cadence', async () => {
    const d = {
      events: [],
      async emit(n, p) {
        this.events.push({ name: n, payload: p });
      },
    };
    const riskModel = makeFakeModel([
      {
        _id: 'r2',
        riskNumber: 'RSK-2026-002',
        riskLevel: 'medium',
        status: 'monitoring',
        reviewDate: daysFromNow(-80), // cadence 90, 80/90 = 0.88 → due_soon
      },
    ]);
    const s = createRiskReassessmentScheduler({ riskModel, dispatcher: d });
    const r = await s.tick();
    expect(r.dueSoon).toBe(1);
    expect(d.events.find(e => e.name === 'quality.risk.reassessment_due_soon')).toBeDefined();
  });

  it('resetDedup allows immediate re-emit', async () => {
    const d = {
      events: [],
      async emit(n, p) {
        this.events.push({ name: n, payload: p });
      },
    };
    const riskModel = makeFakeModel([
      {
        _id: 'r3',
        riskNumber: 'RSK-2026-003',
        riskLevel: 'critical',
        status: 'open',
        reviewDate: daysFromNow(-100),
      },
    ]);
    const s = createRiskReassessmentScheduler({ riskModel, dispatcher: d });
    await s.tick();
    s.resetDedup();
    const r2 = await s.tick();
    expect(r2.overdue).toBe(1);
  });

  it('exports CADENCE_DAYS with critical/high/medium/low', () => {
    expect(CADENCE_DAYS.critical).toBe(30);
    expect(CADENCE_DAYS.high).toBe(60);
    expect(CADENCE_DAYS.medium).toBe(90);
    expect(CADENCE_DAYS.low).toBe(180);
  });
});

// ─── NCR auto-link pipeline ─────────────────────────────────────────

describe('NcrAutoLinkPipeline', () => {
  it('SEVERITIES_TRIGGERING covers major/catastrophic/critical/sentinel', () => {
    expect(SEVERITIES_TRIGGERING).toEqual(
      expect.arrayContaining(['major', 'catastrophic', 'critical', 'sentinel'])
    );
  });

  it('runChain: below threshold → skipped', async () => {
    const bus = createQualityEventBus();
    const p = createNcrAutoLinkPipeline({
      bus,
      incidentModel: makeFakeModel(),
      ncrModel: makeFakeModel(),
      capaModel: makeFakeModel(),
    });
    const result = await p.runChain({ incidentId: 'i1', severity: 'minor' });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('severity_below_threshold');
  });

  it('runChain: creates NCR + CAPA for major incident and emits auto_linked', async () => {
    const bus = createQualityEventBus();
    const ncrModel = makeFakeModel();
    const capaModel = makeFakeModel();
    const events = [];
    bus.on('quality.ncr.auto_linked', p => events.push(p));

    const pipeline = createNcrAutoLinkPipeline({
      bus,
      incidentModel: makeFakeModel(),
      ncrModel,
      capaModel,
    });

    const result = await pipeline.runChain({
      incidentId: 'incident-42',
      severity: 'major',
      title: 'Fall with injury',
      branchId: 'b1',
      reportedBy: 'user-1',
    });

    await bus.flush();

    expect(result.skipped).toBe(false);
    expect(result.ncrId).toMatch(/^NCR-\d{4}-/);
    expect(result.capaId).toMatch(/^CAPA-\d{4}-/);
    expect(ncrModel._docs()).toHaveLength(1);
    expect(capaModel._docs()).toHaveLength(1);
    expect(capaModel._docs()[0].linkedNcr.ncrId).toBe(result.ncrId);
    expect(events).toHaveLength(1);
    expect(events[0].ncrId).toBe(result.ncrId);
  });

  it('runChain: idempotent — same incidentId twice → second is skipped', async () => {
    const bus = createQualityEventBus();
    const ncrModel = makeFakeModel();
    const capaModel = makeFakeModel();
    const pipeline = createNcrAutoLinkPipeline({
      bus,
      incidentModel: makeFakeModel(),
      ncrModel,
      capaModel,
    });

    await pipeline.runChain({ incidentId: 'i-same', severity: 'catastrophic' });
    const second = await pipeline.runChain({ incidentId: 'i-same', severity: 'catastrophic' });

    expect(second.skipped).toBe(true);
    expect(second.reason).toBe('already_processed');
    expect(ncrModel._docs()).toHaveLength(1);
    expect(capaModel._docs()).toHaveLength(1);
  });

  it('start() subscribes to quality.incident.reported', async () => {
    const bus = createQualityEventBus();
    const ncrModel = makeFakeModel();
    const capaModel = makeFakeModel();
    const pipeline = createNcrAutoLinkPipeline({
      bus,
      incidentModel: makeFakeModel(),
      ncrModel,
      capaModel,
    });
    pipeline.start();

    await bus.emit('quality.incident.reported', {
      incidentId: 'i-bus',
      severity: 'sentinel',
      title: 'Test',
    });
    await bus.flush();

    expect(ncrModel._docs()).toHaveLength(1);
    pipeline.stop();
  });
});
