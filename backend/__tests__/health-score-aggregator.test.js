'use strict';

/**
 * health-score-aggregator.test.js — Phase 13 Commit 9 (4.0.59).
 *
 * Pure in-memory tests for the executive health score. No DB —
 * all 10 pillar sources are injected as fakes so we can exercise
 * the weighting, renormalisation, grade banding, hotspot ordering,
 * and graceful-degradation paths deterministically.
 */

process.env.NODE_ENV = 'test';

const {
  createHealthScoreAggregator,
} = require('../services/quality/healthScoreAggregator.service');
const {
  PILLARS,
  GRADE_BANDS,
  weightedTotal,
  gradeFor,
} = require('../config/health-score.registry');

// ── fake source factories ──────────────────────────────────────────

function fakeControlLibrary(opts = {}) {
  return {
    getCoverage: async () => ({
      total: opts.total ?? 58,
      byOutcome: {
        pass: opts.pass ?? 45,
        fail: opts.fail ?? 3,
        partial: opts.partial ?? 2,
        not_tested: opts.not_tested ?? 8,
      },
      byCriticality: {
        critical: { total: 15, pass: 13, fail: opts.criticalFails ?? 0, partial: 0 },
      },
    }),
    list: async () =>
      Array.from({ length: opts.criticalFails ?? 0 }, (_, i) => ({
        controlId: `fake.critical.${i + 1}`,
        nameEn: `Fake critical ${i + 1}`,
      })),
  };
}

function fakeManagementReview({ closed = 2, overdue = 0 } = {}) {
  return {
    countClosedInWindow: async () => closed,
    getDashboard: async () => ({ total: 4, open: 2, closed, overdue }),
  };
}

function fakeEvidenceVault({ valid = 90, expiring = 8, expired = 2 } = {}) {
  return {
    getStats: async () => ({
      total: valid + expiring + expired,
      valid,
      expiring,
      expired,
      superseded: 0,
      revoked: 0,
      legalHold: 0,
    }),
  };
}

function fakeCalendar({ total = 20, overdue = 2 } = {}) {
  return {
    getStats: async () => ({
      total,
      byStatus: { upcoming: total - overdue - 5, due_soon: 5, urgent: 0, overdue, snoozed: 0 },
      bySeverity: { info: 10, warning: 5, critical: 5 },
      byType: {},
    }),
  };
}

function fakeIncidents({ seriousRate = 0.15, closureRate = 0.9, sentinelOpen = 0 } = {}) {
  return {
    getSummary: async () => ({
      seriousRate,
      closureRate,
      sentinelOpen: Array.from({ length: sentinelOpen }, (_, i) => ({ id: `inc-${i}` })),
    }),
  };
}

function fakeComplaints({ slaRate = 0.95 } = {}) {
  return { getSlaRate: async () => slaRate };
}

function fakeCapa({ slaRate = 0.88 } = {}) {
  return { getClosureSlaRate: async () => slaRate };
}

function fakeSatisfaction({ nps = 55, responseCount = 120 } = {}) {
  return { getLatestNps: async () => ({ nps, responseCount }) };
}

function fakeTraining({ rate = 0.96 } = {}) {
  return { getMandatoryCompletionRate: async () => rate };
}

function fakeDocuments({ rate = 0.98 } = {}) {
  return { getValidDocsRate: async () => rate };
}

function allSources(overrides = {}) {
  return {
    controlLibrary: fakeControlLibrary(overrides.controlLibrary),
    managementReview: fakeManagementReview(overrides.managementReview),
    evidenceVault: fakeEvidenceVault(overrides.evidenceVault),
    complianceCalendar: fakeCalendar(overrides.calendar),
    incidents: fakeIncidents(overrides.incidents),
    complaints: fakeComplaints(overrides.complaints),
    capa: fakeCapa(overrides.capa),
    satisfaction: fakeSatisfaction(overrides.satisfaction),
    training: fakeTraining(overrides.training),
    documents: fakeDocuments(overrides.documents),
  };
}

function svc(sources) {
  return createHealthScoreAggregator({ sources });
}

// ── tests ──────────────────────────────────────────────────────────

describe('Health Score registry', () => {
  it('pillar weights sum to 100', () => {
    const sum = PILLARS.reduce((a, p) => a + p.weight, 0);
    expect(sum).toBe(100);
  });

  it('every pillar has stable id and non-empty names', () => {
    const ids = PILLARS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PILLARS) {
      expect(p.nameAr.length).toBeGreaterThan(0);
      expect(p.nameEn.length).toBeGreaterThan(0);
    }
  });

  it('gradeFor returns expected band', () => {
    expect(gradeFor(95).grade).toBe('A');
    expect(gradeFor(85).grade).toBe('B');
    expect(gradeFor(75).grade).toBe('C');
    expect(gradeFor(65).grade).toBe('D');
    expect(gradeFor(50).grade).toBe('F');
    expect(gradeFor(null)).toBeNull();
  });

  it('gradeFor covers every GRADE_BAND', () => {
    for (const band of GRADE_BANDS) {
      expect(gradeFor(band.min).grade).toBe(band.grade);
    }
  });
});

describe('weightedTotal renormalisation', () => {
  it('full set returns straight weighted average', () => {
    const scores = {
      controls: 100,
      management_review: 100,
      evidence: 100,
      calendar: 100,
      incidents: 100,
      complaints: 100,
      capa: 100,
      satisfaction: 100,
      training: 100,
      documents: 100,
    };
    const out = weightedTotal(scores);
    expect(out.score).toBe(100);
    expect(out.pillarsAvailable).toBe(10);
    expect(out.weightsUsed).toBe(100);
  });

  it('drops null pillars and renormalises', () => {
    // Only controls (weight 25) available, scores 80 → total should be 80.
    const only = { controls: 80 };
    for (const p of PILLARS) if (p.id !== 'controls') only[p.id] = null;
    const out = weightedTotal(only);
    expect(out.score).toBe(80);
    expect(out.pillarsAvailable).toBe(1);
    expect(out.weightsUsed).toBe(25);
  });

  it('returns null when no pillar available', () => {
    const all = {};
    for (const p of PILLARS) all[p.id] = null;
    expect(weightedTotal(all)).toEqual({ score: null, pillarsAvailable: 0, weightsUsed: 0 });
  });
});

describe('HealthScoreAggregator — happy path', () => {
  it('computes a score + grade + pillar breakdown', async () => {
    const result = await svc(allSources()).compute({});
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.grade).toHaveProperty('grade');
    expect(result.pillars).toHaveLength(10);
    expect(result.summary.pillarsAvailable).toBe(10);
    expect(result.summary.weightsUsed).toBe(100);
    expect(result.warnings).toEqual([]);
  });

  it('perfect inputs → score = 100 grade A', async () => {
    const s = svc(
      allSources({
        controlLibrary: { pass: 58, fail: 0, partial: 0, not_tested: 0, criticalFails: 0 },
        managementReview: { closed: 3, overdue: 0 },
        evidenceVault: { valid: 100, expiring: 0, expired: 0 },
        calendar: { total: 20, overdue: 0 },
        incidents: { seriousRate: 0, closureRate: 1 },
        complaints: { slaRate: 1 },
        capa: { slaRate: 1 },
        satisfaction: { nps: 100 },
        training: { rate: 1 },
        documents: { rate: 1 },
      })
    );
    const res = await s.compute({});
    expect(res.score).toBe(100);
    expect(res.grade.grade).toBe('A');
  });

  it('window respects windowDays option', async () => {
    const s = svc(allSources());
    const res = await s.compute({ windowDays: 30 });
    expect(res.window.days).toBe(30);
    const diff = (res.window.to.getTime() - res.window.from.getTime()) / 86400000;
    expect(Math.round(diff)).toBe(30);
  });
});

describe('HealthScoreAggregator — penalty for critical-control failures', () => {
  it('applies -15 per critical fail to the controls pillar', async () => {
    const baseline = await svc(allSources({ controlLibrary: { criticalFails: 0 } })).compute({});
    const penalised = await svc(allSources({ controlLibrary: { criticalFails: 2 } })).compute({});
    const baselineControls = baseline.pillars.find(p => p.id === 'controls').score;
    const penalisedControls = penalised.pillars.find(p => p.id === 'controls').score;
    expect(baselineControls - penalisedControls).toBe(30); // 2 * 15
  });

  it('penalty floors at 0', async () => {
    const res = await svc(
      allSources({
        controlLibrary: {
          pass: 30,
          fail: 20,
          partial: 0,
          not_tested: 8,
          criticalFails: 20, // huge number — should still floor at 0
        },
      })
    ).compute({});
    const controls = res.pillars.find(p => p.id === 'controls').score;
    expect(controls).toBe(0);
  });
});

describe('HealthScoreAggregator — graceful degradation', () => {
  it('missing sources are excluded and noted', async () => {
    const partial = {
      controlLibrary: fakeControlLibrary(),
      managementReview: fakeManagementReview(),
      // no other sources
    };
    const res = await svc(partial).compute({});
    expect(res.score).toBeGreaterThan(0);
    expect(res.summary.pillarsAvailable).toBe(2);
    expect(res.summary.weightsUsed).toBe(35); // 25 + 10
    expect(res.summary.weightsMissing).toBe(65);
    const nullPillars = res.pillars.filter(p => p.score == null);
    expect(nullPillars.length).toBe(8);
  });

  it('throwing source is caught and turned into a warning', async () => {
    const badEvidence = {
      getStats: async () => {
        throw new Error('mongo down');
      },
    };
    const sources = { ...allSources(), evidenceVault: badEvidence };
    const res = await svc(sources).compute({});
    expect(res.warnings.some(w => w.pillar === 'evidence')).toBe(true);
    expect(res.pillars.find(p => p.id === 'evidence').score).toBeNull();
    // Overall score still computed from remaining 9 pillars
    expect(typeof res.score).toBe('number');
  });

  it('returns null score when all sources are missing', async () => {
    const res = await svc({}).compute({});
    expect(res.score).toBeNull();
    expect(res.grade).toBeNull();
    expect(res.summary.pillarsAvailable).toBe(0);
  });
});

describe('HealthScoreAggregator — hotspots', () => {
  it('surfaces open sentinel incidents', async () => {
    const res = await svc(allSources({ incidents: { seriousRate: 0.5, sentinelOpen: 2 } })).compute(
      {}
    );
    const hotspot = res.hotspots.find(h => h.kind === 'open_sentinel_incident');
    expect(hotspot).toBeDefined();
    expect(hotspot.severity).toBe('critical');
  });

  it('surfaces expired evidence', async () => {
    const res = await svc(
      allSources({ evidenceVault: { valid: 50, expiring: 5, expired: 10 } })
    ).compute({});
    expect(res.hotspots.some(h => h.kind === 'expired_evidence')).toBe(true);
  });

  it('surfaces overdue management reviews', async () => {
    const res = await svc(allSources({ managementReview: { closed: 1, overdue: 2 } })).compute({});
    expect(res.hotspots.some(h => h.kind === 'overdue_management_review')).toBe(true);
  });

  it('lists failing critical controls', async () => {
    const res = await svc(allSources({ controlLibrary: { criticalFails: 3 } })).compute({});
    const critFails = res.hotspots.filter(h => h.kind === 'critical_control_fail');
    expect(critFails.length).toBe(3);
  });

  it('hotspots sorted with critical first', async () => {
    const res = await svc(
      allSources({
        controlLibrary: { criticalFails: 1 },
        complaints: { slaRate: 0.5 },
        evidenceVault: { valid: 40, expiring: 5, expired: 3 },
      })
    ).compute({});
    // First hotspot should be critical severity
    expect(res.hotspots[0].severity).toBe('critical');
  });

  it('caps hotspots list', async () => {
    const res = await svc(allSources({ controlLibrary: { criticalFails: 20 } })).compute({});
    expect(res.hotspots.length).toBeLessThanOrEqual(8);
  });
});

describe('HealthScoreAggregator — contributions', () => {
  it('sum of contributions ≈ score', async () => {
    const res = await svc(allSources()).compute({});
    const sum = res.pillars.reduce((a, p) => a + (p.contribution || 0), 0);
    // Rounding noise up to ±2 acceptable
    expect(Math.abs(sum - res.score)).toBeLessThanOrEqual(2);
  });
});

describe('HealthScoreAggregator — caching', () => {
  it('second call returns cached value within TTL', async () => {
    const cache = new Map();
    const cacheApi = {
      get: k => cache.get(k),
      set: (k, v) => cache.set(k, v),
    };
    const sources = allSources();
    let controlCalls = 0;
    const origCoverage = sources.controlLibrary.getCoverage;
    sources.controlLibrary.getCoverage = async () => {
      controlCalls++;
      return origCoverage();
    };
    const agg = createHealthScoreAggregator({ sources, cache: cacheApi });
    await agg.compute({});
    await agg.compute({});
    expect(controlCalls).toBe(1);
  });
});
