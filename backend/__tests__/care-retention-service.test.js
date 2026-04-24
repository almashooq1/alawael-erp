'use strict';

/**
 * care-retention-service.test.js — Phase 17 Commit 8 (4.0.90).
 *
 * Exercises the retention-risk scorer + auto-intervention
 * orchestrator. Uses stub b360 service returning canned profile
 * + health-score shapes, and stub psych/social services to
 * verify the auto-intervention plumbing.
 */

process.env.NODE_ENV = 'test';

const { createRetentionService } = require('../services/care/retention.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeAssessmentModel() {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `ret-${++n}`,
      assessmentNumber: `RET-TEST-${n}`,
      interventions: [],
      factors: [],
      healthScoreSnapshot: {},
      ...data,
      save: async function () {
        for (const iv of this.interventions || []) {
          if (!iv._id) iv._id = `iv-${Math.random().toString(36).slice(2, 10)}`;
        }
        return this;
      },
    };
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v === null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
          } else if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (r, rj) => Promise.resolve(rows).then(r, rj),
      };
      return api;
    },
  };
}

function stubB360({
  profile = {},
  healthScore = {
    overall: 70,
    band: 'stable',
    subscores: { mentalWellbeing: 75, functionalIndependence: 65, socialIntegration: 70 },
  },
} = {}) {
  const defaultProfile = {
    activeSocialCase: null,
    homeVisits: [],
    iadlTrend: { series: [] },
    participationAnalytics: null,
    participationLogs: [],
    riskFlags: [],
    welfareApplications: [],
    communityLinkages: [],
    mdtMeetings: [],
    ...profile,
  };
  return {
    getProfile: async () => defaultProfile,
    getHealthScore: async () => healthScore,
  };
}

function stubPsych() {
  const raised = [];
  const mdtScheduled = [];
  return {
    raised,
    mdtScheduled,
    async raiseFlag(data) {
      const f = { _id: `f-${raised.length + 1}`, flagNumber: `RF-T-${raised.length + 1}`, ...data };
      raised.push(f);
      return f;
    },
    async scheduleMdt(data) {
      const m = {
        _id: `m-${mdtScheduled.length + 1}`,
        meetingNumber: `MDT-T-${mdtScheduled.length + 1}`,
        ...data,
      };
      mdtScheduled.push(m);
      return m;
    },
  };
}

function stubSocialCase() {
  const flagged = [];
  return {
    flagged,
    async flagHighRisk(caseId, args) {
      flagged.push({ caseId, ...args });
      return { _id: caseId, riskLevel: 'high' };
    },
  };
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function mk({ profile, healthScore } = {}) {
  const assessmentModel = makeAssessmentModel();
  const beneficiary360Service = stubB360({ profile, healthScore });
  const psychService = stubPsych();
  const socialCaseService = stubSocialCase();
  const dispatcher = makeDispatcher();
  const svc = createRetentionService({
    assessmentModel,
    beneficiary360Service,
    psychService,
    socialCaseService,
    dispatcher,
    logger: { info: () => {}, warn: () => {} },
  });
  return { svc, assessmentModel, psychService, socialCaseService, dispatcher };
}

// ═══════════════════════════════════════════════════════════════════
// computeRiskScore — dry run
// ═══════════════════════════════════════════════════════════════════

describe('Retention — computeRiskScore (dry run)', () => {
  it('healthy profile → low band', async () => {
    const { svc } = mk({
      healthScore: {
        overall: 90,
        band: 'thriving',
        subscores: { mentalWellbeing: 90, functionalIndependence: 90, socialIntegration: 90 },
      },
      profile: {
        homeVisits: [{ status: 'scheduled', scheduledFor: new Date(Date.now() + 86400000) }], // upcoming
        communityLinkages: [{ status: 'active' }],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    expect(r.riskBand).toBe('low');
    // Should include upcoming_home_visit mitigating factor
    expect(r.factors.map(f => f.code)).toContain('upcoming_home_visit');
  });

  it('declining profile with multiple aggravators → imminent', async () => {
    const { svc } = mk({
      healthScore: {
        overall: 20,
        band: 'concerning',
        subscores: { mentalWellbeing: 20, functionalIndependence: 20, socialIntegration: 20 },
      },
      profile: {
        activeSocialCase: { _id: 'c1', status: 'active' },
        homeVisits: [], // no recent home visit
        iadlTrend: {
          series: [
            { at: new Date(), total: 8, band: 'partially_dependent' },
            { at: new Date(Date.now() - 30 * 86400000), total: 14, band: 'partially_dependent' },
          ],
        },
        riskFlags: [
          {
            _id: 'f1',
            flagNumber: 'RF-OLD',
            severity: 'critical',
            status: 'active',
            raisedAt: new Date(Date.now() - 10 * 86400000), // stale 10 days old
          },
        ],
        communityLinkages: [],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    expect(r.riskBand).toBe('imminent');
    const codes = r.factors.map(f => f.code);
    expect(codes).toContain('no_recent_home_visit');
    expect(codes).toContain('iadl_declining');
    expect(codes).toContain('stale_critical_flag');
    expect(codes).toContain('isolation_no_linkages');
  });

  it('welfare_stuck_info_requested triggers on 14+ day stale', async () => {
    const oldDate = new Date(Date.now() - 20 * 86400000);
    const { svc } = mk({
      profile: {
        welfareApplications: [
          {
            _id: 'w1',
            applicationNumber: 'WA-1',
            status: 'info_requested',
            updatedAt: oldDate,
          },
        ],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    expect(r.factors.map(f => f.code)).toContain('welfare_stuck_info_requested');
  });

  it('welfare_all_rejected_recent triggers with 2+ rejected apps in 6mo', async () => {
    const { svc } = mk({
      profile: {
        welfareApplications: [
          {
            _id: 'w1',
            status: 'rejected',
            createdAt: new Date(Date.now() - 30 * 86400000),
            applicationNumber: 'WA-1',
          },
          {
            _id: 'w2',
            status: 'appeal_rejected',
            createdAt: new Date(Date.now() - 60 * 86400000),
            applicationNumber: 'WA-2',
          },
        ],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    expect(r.factors.map(f => f.code)).toContain('welfare_all_rejected_recent');
  });

  it('safety_plan_overdue triggers on past safetyPlanReviewDue', async () => {
    const { svc } = mk({
      profile: {
        riskFlags: [
          {
            _id: 'f1',
            status: 'monitoring',
            safetyPlanReviewDue: new Date('2026-01-01'),
          },
        ],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    expect(r.factors.map(f => f.code)).toContain('safety_plan_overdue');
  });

  it('active_mdt is a mitigating factor', async () => {
    const { svc } = mk({
      profile: {
        mdtMeetings: [{ _id: 'm1', status: 'scheduled' }],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    const mdtFactor = r.factors.find(f => f.code === 'active_mdt');
    expect(mdtFactor).toBeTruthy();
    expect(mdtFactor.weight).toBeLessThan(0);
  });

  it('score clamped to 0..100', async () => {
    const { svc } = mk({
      healthScore: {
        overall: 0,
        band: 'concerning',
        subscores: { mentalWellbeing: 0, functionalIndependence: 0, socialIntegration: 0 },
      },
      profile: {
        activeSocialCase: { _id: 'c1' },
        homeVisits: [],
        riskFlags: [
          {
            severity: 'critical',
            status: 'active',
            raisedAt: new Date(Date.now() - 30 * 86400000),
          },
        ],
        communityLinkages: [],
      },
    });
    const r = await svc.computeRiskScore('ben-1');
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(100);
  });

  it('throws MISSING_FIELD without beneficiaryId', async () => {
    const { svc } = mk();
    await expect(svc.computeRiskScore(null)).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });
});

// ═══════════════════════════════════════════════════════════════════
// assess — persist + trigger
// ═══════════════════════════════════════════════════════════════════

describe('Retention — assess persists + emits', () => {
  it('creates assessment + emits ops.care.retention.assessed', async () => {
    const { svc, assessmentModel, dispatcher } = mk({
      healthScore: {
        overall: 50,
        band: 'watch',
        subscores: { mentalWellbeing: 50, functionalIndependence: 50, socialIntegration: 50 },
      },
      profile: { communityLinkages: [] },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.riskScore).toBeGreaterThan(0);
    expect(doc.riskBand).toBeTruthy();
    expect(assessmentModel.docs.length).toBe(1);
    expect(dispatcher.events.some(e => e.name === 'ops.care.retention.assessed')).toBe(true);
  });

  it('trend = unknown for first assessment', async () => {
    const { svc } = mk();
    const doc = await svc.assess('ben-1');
    expect(doc.trend).toBe('unknown');
    expect(doc.previousRiskScore).toBeNull();
  });

  it('trend = stable when score unchanged and force=true', async () => {
    const { svc } = mk();
    await svc.assess('ben-1');
    const doc2 = await svc.assess('ben-1', { force: true });
    // Same inputs → same score → trend stable, previousRiskScore set
    expect(doc2.trend).toBe('stable');
    expect(doc2.previousRiskScore).toBeGreaterThanOrEqual(0);
  });

  it('skip duplicate assessment when band+score unchanged unless force', async () => {
    const { svc, assessmentModel } = mk();
    await svc.assess('ben-1');
    await svc.assess('ben-1'); // same data → skip
    expect(assessmentModel.docs.length).toBe(1);
  });

  it('force=true always creates new assessment', async () => {
    const { svc, assessmentModel } = mk();
    await svc.assess('ben-1');
    await svc.assess('ben-1', { force: true });
    expect(assessmentModel.docs.length).toBe(2);
  });

  it('snapshots healthScore sub-scores on the assessment', async () => {
    const { svc } = mk({
      healthScore: {
        overall: 55,
        band: 'watch',
        subscores: { mentalWellbeing: 60, functionalIndependence: 50, socialIntegration: 55 },
      },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.healthScoreSnapshot.overall).toBe(55);
    expect(doc.healthScoreSnapshot.mentalWellbeing).toBe(60);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Auto-interventions
// ═══════════════════════════════════════════════════════════════════

describe('Retention — auto-interventions', () => {
  it('low band → only track_only intervention', async () => {
    const { svc, psychService, socialCaseService } = mk({
      healthScore: {
        overall: 95,
        band: 'thriving',
        subscores: { mentalWellbeing: 95, functionalIndependence: 95, socialIntegration: 95 },
      },
      profile: {
        homeVisits: [{ status: 'scheduled', scheduledFor: new Date(Date.now() + 86400000) }],
        communityLinkages: [{ status: 'active' }],
        mdtMeetings: [{ status: 'scheduled' }],
      },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.riskBand).toBe('low');
    expect(doc.interventions.map(i => i.kind)).toEqual(['track_only']);
    expect(psychService.raised.length).toBe(0);
    expect(socialCaseService.flagged.length).toBe(0);
  });

  it('moderate band → notify_retention_manager', async () => {
    const { svc, dispatcher } = mk({
      healthScore: {
        overall: 50,
        band: 'watch',
        subscores: { mentalWellbeing: 55, functionalIndependence: 50, socialIntegration: 45 },
      },
      profile: { communityLinkages: [] },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.riskBand).toBe('moderate');
    const kinds = doc.interventions.map(i => i.kind);
    expect(kinds).toContain('notify_retention_manager');
    expect(dispatcher.events.some(e => e.name === 'ops.care.retention.notify_manager')).toBe(true);
  });

  it('high band → request_home_visit event + notify', async () => {
    const { svc, dispatcher } = mk({
      healthScore: {
        overall: 25,
        band: 'concerning',
        subscores: { mentalWellbeing: 20, functionalIndependence: 25, socialIntegration: 30 },
      },
      profile: {
        activeSocialCase: { _id: 'c1' },
        homeVisits: [],
        communityLinkages: [],
      },
    });
    const doc = await svc.assess('ben-1');
    expect(['high', 'imminent']).toContain(doc.riskBand);
    const events = dispatcher.events.map(e => e.name);
    // Could be high or imminent depending on factor sum — but either way home visit or psych flag should fire
    expect(
      events.some(
        e =>
          e === 'ops.care.retention.home_visit_requested' ||
          e === 'ops.care.retention.notify_manager'
      )
    ).toBe(true);
  });

  it('imminent band → raises psych flag + schedules MDT + flags case', async () => {
    const { svc, psychService, socialCaseService } = mk({
      healthScore: {
        overall: 10,
        band: 'concerning',
        subscores: { mentalWellbeing: 10, functionalIndependence: 10, socialIntegration: 10 },
      },
      profile: {
        activeSocialCase: { _id: 'c1' },
        homeVisits: [],
        iadlTrend: { series: [{ total: 5 }, { total: 15 }] }, // declining
        riskFlags: [
          {
            severity: 'critical',
            status: 'active',
            raisedAt: new Date(Date.now() - 14 * 86400000),
          },
        ],
        communityLinkages: [],
      },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.riskBand).toBe('imminent');
    expect(psychService.raised.length).toBe(1);
    expect(psychService.raised[0].flagType).toBe('neglect_risk');
    expect(psychService.mdtScheduled.length).toBe(1);
    expect(socialCaseService.flagged.length).toBe(1);
    const executed = doc.interventions.filter(i => i.status === 'executed');
    expect(executed.length).toBeGreaterThanOrEqual(3);
  });

  it('flag_case_high_risk skipped when no active case', async () => {
    const { svc } = mk({
      healthScore: {
        overall: 5,
        band: 'concerning',
        subscores: { mentalWellbeing: 5, functionalIndependence: 5, socialIntegration: 5 },
      },
      profile: {
        activeSocialCase: null,
        homeVisits: [],
        riskFlags: [
          {
            severity: 'critical',
            status: 'active',
            raisedAt: new Date(Date.now() - 14 * 86400000),
          },
        ],
        communityLinkages: [],
      },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.riskBand).toBe('imminent');
    const caseIv = doc.interventions.find(i => i.kind === 'flag_case_high_risk');
    expect(caseIv.status).toBe('skipped');
    expect(caseIv.notes).toContain('no active social case');
  });

  it('intervention failure recorded but does not break assessment', async () => {
    const assessmentModel = makeAssessmentModel();
    const failingPsych = {
      async raiseFlag() {
        throw new Error('psych boom');
      },
      async scheduleMdt() {
        throw new Error('mdt boom');
      },
    };
    const svc = createRetentionService({
      assessmentModel,
      beneficiary360Service: stubB360({
        healthScore: {
          overall: 5,
          band: 'concerning',
          subscores: { mentalWellbeing: 5, functionalIndependence: 5, socialIntegration: 5 },
        },
        profile: {
          activeSocialCase: { _id: 'c1' },
          homeVisits: [], // → no_recent_home_visit (+15)
          riskFlags: [
            {
              severity: 'critical',
              status: 'active',
              raisedAt: new Date(Date.now() - 14 * 86400000), // → stale_critical_flag (+20)
            },
          ],
          communityLinkages: [], // → isolation_no_linkages (+10)
        },
      }),
      psychService: failingPsych,
      logger: { info: () => {}, warn: () => {} },
    });
    const doc = await svc.assess('ben-1');
    expect(doc.riskBand).toBe('imminent');
    const raiseIv = doc.interventions.find(i => i.kind === 'raise_psych_flag');
    expect(raiseIv.status).toBe('failed');
    expect(raiseIv.error).toBe('psych boom');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Reads + acknowledge + sweep
// ═══════════════════════════════════════════════════════════════════

describe('Retention — reads', () => {
  it('getLatest returns most recent', async () => {
    const { svc } = mk();
    const a = await svc.assess('ben-1');
    expect(await svc.getLatest('ben-1')).toBe(a);
  });

  it('getTrend orders latest first + returns series', async () => {
    const { svc } = mk();
    await svc.assess('ben-1', { force: true });
    await svc.assess('ben-1', { force: true });
    const trend = await svc.getTrend('ben-1');
    expect(trend.series.length).toBe(2);
    expect(trend.beneficiaryId).toBe('ben-1');
  });

  it('listHighRisk defaults to high+imminent', async () => {
    const assessmentModel = makeAssessmentModel();
    // Seed one low and one imminent
    await assessmentModel.create({ beneficiaryId: 'b1', riskScore: 10, riskBand: 'low' });
    await assessmentModel.create({ beneficiaryId: 'b2', riskScore: 90, riskBand: 'imminent' });
    const svc = createRetentionService({
      assessmentModel,
      beneficiary360Service: stubB360(),
      logger: { info: () => {}, warn: () => {} },
    });
    const rows = await svc.listHighRisk();
    expect(rows.length).toBe(1);
    expect(rows[0].riskBand).toBe('imminent');
  });

  it('acknowledge marks + emits', async () => {
    const { svc, dispatcher } = mk();
    const doc = await svc.assess('ben-1');
    const acked = await svc.acknowledge(doc._id, { actorId: 'u1', notes: 'reviewed' });
    expect(acked.acknowledged).toBe(true);
    expect(acked.acknowledgedAt).toBeTruthy();
    expect(acked.acknowledgementNotes).toBe('reviewed');
    expect(dispatcher.events.some(e => e.name === 'ops.care.retention.acknowledged')).toBe(true);
  });

  it('acknowledge unknown id throws NOT_FOUND', async () => {
    const { svc } = mk();
    await expect(svc.acknowledge('bogus')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('Retention — sweep', () => {
  it('sweep across provided ids', async () => {
    const { svc, assessmentModel } = mk();
    const res = await svc.sweep({ beneficiaryIds: ['ben-1', 'ben-2', 'ben-3'] });
    expect(res.assessed).toBe(3);
    expect(res.errors).toEqual([]);
    expect(assessmentModel.docs.length).toBe(3);
  });

  it('sweep with no ids + no beneficiaryModel → returns 0', async () => {
    const { svc } = mk();
    const res = await svc.sweep({});
    expect(res.assessed).toBe(0);
  });

  it('sweep continues past per-beneficiary failures', async () => {
    const assessmentModel = makeAssessmentModel();
    let calls = 0;
    const flakyB360 = {
      async getProfile(id) {
        if (id === 'ben-2') throw new Error('profile boom');
        return {
          activeSocialCase: null,
          homeVisits: [],
          iadlTrend: { series: [] },
          participationAnalytics: null,
          participationLogs: [],
          riskFlags: [],
          welfareApplications: [],
          communityLinkages: [],
          mdtMeetings: [],
        };
      },
      async getHealthScore() {
        calls++;
        return {
          overall: 70,
          band: 'stable',
          subscores: { mentalWellbeing: 75, functionalIndependence: 65, socialIntegration: 70 },
        };
      },
    };
    const svc = createRetentionService({
      assessmentModel,
      beneficiary360Service: flakyB360,
      logger: { info: () => {}, warn: () => {} },
    });
    const res = await svc.sweep({ beneficiaryIds: ['ben-1', 'ben-2', 'ben-3'] });
    expect(res.assessed).toBe(2); // ben-2 failed
    expect(res.errors.length).toBe(1);
    expect(res.errors[0].beneficiaryId).toBe('ben-2');
  });
});
