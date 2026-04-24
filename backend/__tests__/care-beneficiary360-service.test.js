'use strict';

/**
 * care-beneficiary360-service.test.js — Phase 17 Commit 7 (4.0.89). ⭐
 *
 * The 360 service is a pure aggregator — tests pass stub services
 * with deterministic data and verify getProfile, getSummary,
 * getTimeline, getHealthScore, getAttention compose correctly.
 */

process.env.NODE_ENV = 'test';

const { createBeneficiary360Service } = require('../services/care/beneficiary360.service');

// ── Stub services ─────────────────────────────────────────────────

function stubLeadFunnel(data = { leads: [] }) {
  return {
    list: async () => data.leads,
  };
}

function stubSocialCase(data = { cases: [] }) {
  return {
    list: async () => data.cases,
  };
}

function stubHomeVisit(data = { visits: [] }) {
  return {
    list: async () => data.visits,
  };
}

function stubWelfare(data = { apps: [] }) {
  return {
    beneficiaryHistory: async () => data.apps,
  };
}

function stubCommunity(data = { linkages: [] }) {
  return {
    beneficiaryLinkages: async () => data.linkages,
  };
}

function stubPsych(data = { flags: [], scales: [], mdt: [] }) {
  return {
    listFlags: async () => data.flags,
    listAssessments: async () => data.scales,
    listMdt: async () => data.mdt,
  };
}

function stubIndependence(
  data = {
    activeTransition: null,
    iadlSeries: [],
    participation: [],
    analytics: null,
  }
) {
  return {
    beneficiaryActiveTransition: async () => data.activeTransition,
    beneficiaryIadlTrend: async () => ({ series: data.iadlSeries }),
    listParticipation: async () => data.participation,
    beneficiaryParticipationAnalytics: async () => data.analytics,
  };
}

function stubBeneficiaryModel(b) {
  return {
    findById: async id => (b && String(b._id) === String(id) ? b : null),
  };
}

// ═══════════════════════════════════════════════════════════════════
// getProfile
// ═══════════════════════════════════════════════════════════════════

describe('Beneficiary-360 — getProfile', () => {
  it('returns all sections when all services wired', async () => {
    const svc = createBeneficiary360Service({
      services: {
        leadFunnel: stubLeadFunnel({ leads: [{ _id: 'l1', leadNumber: 'LEAD-1' }] }),
        socialCase: stubSocialCase({
          cases: [{ _id: 'c1', caseNumber: 'SC-1', status: 'active', riskLevel: 'medium' }],
        }),
        homeVisit: stubHomeVisit({
          visits: [
            { _id: 'hv1', visitNumber: 'HV-1', status: 'scheduled', scheduledFor: new Date() },
          ],
        }),
        welfare: stubWelfare({
          apps: [
            {
              _id: 'w1',
              applicationNumber: 'WA-1',
              applicationType: 'ssa_pension',
              status: 'submitted',
              statusHistory: [],
            },
          ],
        }),
        community: stubCommunity({
          linkages: [
            { _id: 'cl1', partnerNameSnapshot: 'School', status: 'active', startDate: new Date() },
          ],
        }),
        psych: stubPsych({
          flags: [
            {
              _id: 'f1',
              flagNumber: 'RF-1',
              severity: 'high',
              status: 'active',
              flagType: 'severe_depression',
              raisedAt: new Date(),
            },
          ],
          scales: [
            {
              _id: 's1',
              scaleCode: 'phq9',
              totalScore: 12,
              band: 'moderate',
              administeredAt: new Date(),
            },
          ],
          mdt: [
            {
              _id: 'm1',
              meetingNumber: 'MDT-1',
              purpose: 'care_plan_review',
              status: 'scheduled',
              scheduledFor: new Date(),
            },
          ],
        }),
        independence: stubIndependence({
          activeTransition: {
            _id: 't1',
            assessmentNumber: 'TRA-1',
            targetTransition: 'independent_living',
            overallReadiness: 'developing',
            goals: [],
          },
          iadlSeries: [
            { assessmentId: 'i1', at: new Date(), total: 18, band: 'mostly_independent' },
          ],
          participation: [{ _id: 'p1', activityType: 'volunteering', occurredAt: new Date() }],
          analytics: { total: 5, positiveOutcomePct: 80 },
        }),
      },
    });
    const profile = await svc.getProfile('ben-1');
    expect(profile.beneficiaryId).toBe('ben-1');
    expect(profile.leads.length).toBe(1);
    expect(profile.socialCases.length).toBe(1);
    expect(profile.activeSocialCase).toBeTruthy();
    expect(profile.homeVisits.length).toBe(1);
    expect(profile.welfareApplications.length).toBe(1);
    expect(profile.communityLinkages.length).toBe(1);
    expect(profile.riskFlags.length).toBe(1);
    expect(profile.scaleAssessments.length).toBe(1);
    expect(profile.mdtMeetings.length).toBe(1);
    expect(profile.activeTransitionAssessment).toBeTruthy();
    expect(profile.iadlTrend.series.length).toBe(1);
    expect(profile.participationLogs.length).toBe(1);
    expect(profile.participationAnalytics).toBeTruthy();
  });

  it('missing services degrade gracefully (empty sections, no throw)', async () => {
    const svc = createBeneficiary360Service({ services: {} });
    const profile = await svc.getProfile('ben-1');
    expect(profile.beneficiaryId).toBe('ben-1');
    expect(profile.leads || []).toEqual([]);
  });

  it('include filter limits which sections fetch', async () => {
    const svc = createBeneficiary360Service({
      services: {
        psych: stubPsych({
          flags: [{ _id: 'f1', severity: 'high', status: 'active' }],
          scales: [],
          mdt: [],
        }),
        social: stubSocialCase({ cases: [{ _id: 'c1', status: 'active' }] }),
      },
    });
    const profile = await svc.getProfile('ben-1', { include: ['psych'] });
    expect(profile.riskFlags).toBeDefined();
    expect(profile.socialCases).toBeUndefined();
  });

  it('beneficiary snapshot loaded when model provided', async () => {
    const svc = createBeneficiary360Service({
      services: {},
      beneficiaryModel: stubBeneficiaryModel({
        _id: 'ben-1',
        fullName: 'Ahmad',
        fullNameAr: 'أحمد',
        gender: 'male',
      }),
    });
    const profile = await svc.getProfile('ben-1');
    expect(profile.beneficiary).toBeTruthy();
    expect(profile.beneficiary.fullName).toBe('Ahmad');
  });

  it('throws NOT_FOUND when beneficiaryId missing', async () => {
    const svc = createBeneficiary360Service({ services: {} });
    await expect(svc.getProfile(null)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('identifies activeSocialCase from non-terminal cases', async () => {
    const svc = createBeneficiary360Service({
      services: {
        socialCase: stubSocialCase({
          cases: [
            { _id: 'c1', caseNumber: 'SC-1', status: 'closed' },
            { _id: 'c2', caseNumber: 'SC-2', status: 'active' },
          ],
        }),
      },
    });
    const profile = await svc.getProfile('ben-1');
    expect(profile.activeSocialCase._id).toBe('c2');
  });
});

// ═══════════════════════════════════════════════════════════════════
// getSummary
// ═══════════════════════════════════════════════════════════════════

describe('Beneficiary-360 — getSummary', () => {
  it('summarizes open flags + active case + upcoming visit', async () => {
    const futureVisit = new Date(Date.now() + 86400000);
    const svc = createBeneficiary360Service({
      services: {
        socialCase: stubSocialCase({
          cases: [{ _id: 'c1', caseNumber: 'SC-10', status: 'active', riskLevel: 'high' }],
        }),
        homeVisit: stubHomeVisit({
          visits: [
            {
              _id: 'hv1',
              visitNumber: 'HV-1',
              status: 'completed',
              scheduledFor: new Date('2026-01-01'),
            },
            { _id: 'hv2', visitNumber: 'HV-2', status: 'scheduled', scheduledFor: futureVisit },
          ],
        }),
        psych: stubPsych({
          flags: [
            { _id: 'f1', severity: 'critical', status: 'active' },
            { _id: 'f2', severity: 'high', status: 'monitoring' },
            { _id: 'f3', severity: 'moderate', status: 'resolved' },
          ],
          scales: [],
          mdt: [],
        }),
        welfare: stubWelfare({
          apps: [
            { _id: 'w1', status: 'submitted', statusHistory: [] },
            { _id: 'w2', status: 'closed', statusHistory: [] },
          ],
        }),
        independence: stubIndependence({
          activeTransition: { targetTransition: 'adult_services', overallReadiness: 'developing' },
          iadlSeries: [{ total: 20, band: 'mostly_independent', at: new Date() }],
          participation: [],
          analytics: null,
        }),
      },
    });
    const s = await svc.getSummary('ben-1');
    expect(s.openRiskFlagCount).toBe(2); // active + monitoring
    expect(s.criticalRiskFlagCount).toBe(1);
    expect(s.highestFlagSeverity).toBe('critical');
    expect(s.openWelfareApplicationCount).toBe(1);
    expect(s.nextHomeVisit.id).toBe('hv2');
    expect(s.activeSocialCase.riskLevel).toBe('high');
    expect(s.lastIadlBand).toBe('mostly_independent');
    expect(s.activeTransitionReadiness).toBe('developing');
  });

  it('handles empty state — all zeros/nulls', async () => {
    const svc = createBeneficiary360Service({ services: {} });
    const s = await svc.getSummary('ben-1');
    expect(s.openRiskFlagCount).toBe(0);
    expect(s.criticalRiskFlagCount).toBe(0);
    expect(s.highestFlagSeverity).toBeNull();
    expect(s.openWelfareApplicationCount).toBe(0);
    expect(s.nextHomeVisit).toBeNull();
    expect(s.activeSocialCase).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// getTimeline
// ═══════════════════════════════════════════════════════════════════

describe('Beneficiary-360 — getTimeline', () => {
  it('aggregates events across categories ordered latest-first', async () => {
    const d1 = new Date('2026-01-01');
    const d2 = new Date('2026-02-01');
    const d3 = new Date('2026-03-01');
    const svc = createBeneficiary360Service({
      services: {
        socialCase: stubSocialCase({
          cases: [{ _id: 'c1', caseNumber: 'SC-1', createdAt: d1, statusHistory: [] }],
        }),
        homeVisit: stubHomeVisit({
          visits: [
            {
              _id: 'hv1',
              visitNumber: 'HV-1',
              status: 'completed',
              scheduledFor: d2,
              completedAt: d2,
            },
          ],
        }),
        psych: stubPsych({
          flags: [
            {
              _id: 'f1',
              flagNumber: 'RF-1',
              flagType: 'severe_depression',
              severity: 'high',
              status: 'active',
              raisedAt: d3,
            },
          ],
          scales: [],
          mdt: [],
        }),
      },
    });
    const t = await svc.getTimeline('ben-1');
    expect(t.events.length).toBeGreaterThanOrEqual(3);
    // Latest first
    for (let i = 0; i < t.events.length - 1; i++) {
      expect(t.events[i].at >= t.events[i + 1].at).toBe(true);
    }
    const cats = t.events.map(e => e.category);
    expect(cats).toContain('social');
    expect(cats).toContain('home_visit');
    expect(cats).toContain('psych_flag');
  });

  it('since filter excludes old events', async () => {
    const svc = createBeneficiary360Service({
      services: {
        socialCase: stubSocialCase({
          cases: [
            { _id: 'c1', caseNumber: 'SC-1', createdAt: new Date('2026-01-01'), statusHistory: [] },
            { _id: 'c2', caseNumber: 'SC-2', createdAt: new Date('2026-03-01'), statusHistory: [] },
          ],
        }),
      },
    });
    const t = await svc.getTimeline('ben-1', { since: new Date('2026-02-01') });
    expect(t.events.length).toBe(1);
    expect(t.events[0].title).toContain('SC-2');
  });

  it('limit caps results', async () => {
    const cases = Array.from({ length: 20 }, (_, i) => ({
      _id: `c${i}`,
      caseNumber: `SC-${i}`,
      createdAt: new Date(Date.now() - i * 1000),
      statusHistory: [],
    }));
    const svc = createBeneficiary360Service({
      services: { socialCase: stubSocialCase({ cases }) },
    });
    const t = await svc.getTimeline('ben-1', { limit: 5 });
    expect(t.events.length).toBe(5);
    expect(t.total).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getHealthScore
// ═══════════════════════════════════════════════════════════════════

describe('Beneficiary-360 — getHealthScore', () => {
  it('baseline (empty) produces middling scores', async () => {
    const svc = createBeneficiary360Service({ services: {} });
    const hs = await svc.getHealthScore('ben-1');
    expect(hs.overall).toBeGreaterThanOrEqual(0);
    expect(hs.overall).toBeLessThanOrEqual(100);
    expect(hs.subscores.mentalWellbeing).toBe(75);
    expect(hs.subscores.functionalIndependence).toBe(60);
    expect(hs.subscores.socialIntegration).toBe(50);
  });

  it('critical open flag tanks mental wellbeing', async () => {
    const svc = createBeneficiary360Service({
      services: {
        psych: stubPsych({
          flags: [
            { _id: 'f1', severity: 'critical', status: 'active' },
            { _id: 'f2', severity: 'high', status: 'escalated' },
          ],
          scales: [{ scaleCode: 'phq9', band: 'severe', administeredAt: new Date() }],
          mdt: [],
        }),
      },
    });
    const hs = await svc.getHealthScore('ben-1');
    expect(hs.subscores.mentalWellbeing).toBeLessThan(50);
    expect(hs.contributors.openRiskFlags).toBe(2);
    expect(hs.contributors.latestScaleBand).toBe('severe');
  });

  it('fully_independent IADL + ready transition maxes functional', async () => {
    const svc = createBeneficiary360Service({
      services: {
        independence: stubIndependence({
          activeTransition: { overallReadiness: 'ready' },
          iadlSeries: [{ at: new Date(), total: 24, band: 'fully_independent' }],
          participation: [],
          analytics: null,
        }),
      },
    });
    const hs = await svc.getHealthScore('ben-1');
    expect(hs.subscores.functionalIndependence).toBeGreaterThanOrEqual(90);
    expect(hs.contributors.latestIadlBand).toBe('fully_independent');
  });

  it('active linkages + participation boost social', async () => {
    const svc = createBeneficiary360Service({
      services: {
        community: stubCommunity({
          linkages: [
            { _id: 'l1', status: 'active' },
            { _id: 'l2', status: 'active' },
            { _id: 'l3', status: 'paused' },
          ],
        }),
        independence: stubIndependence({
          activeTransition: null,
          iadlSeries: [],
          participation: [],
          analytics: { total: 10, positiveOutcomePct: 80 },
        }),
      },
    });
    const hs = await svc.getHealthScore('ben-1');
    expect(hs.subscores.socialIntegration).toBeGreaterThan(50);
    expect(hs.contributors.activeCommunityLinkages).toBe(3);
  });

  it('health band interpretation', async () => {
    const svc = createBeneficiary360Service({ services: {} });
    const hs = await svc.getHealthScore('ben-1');
    // baseline overall = (75+60+50)/3 ≈ 62 → stable
    expect(hs.band).toBe('stable');
  });

  it('scores clamped to 0..100', async () => {
    const svc = createBeneficiary360Service({
      services: {
        psych: stubPsych({
          flags: Array.from({ length: 10 }, (_, i) => ({
            _id: `f${i}`,
            severity: 'critical',
            status: 'active',
          })),
          scales: [],
          mdt: [],
        }),
      },
    });
    const hs = await svc.getHealthScore('ben-1');
    expect(hs.subscores.mentalWellbeing).toBeGreaterThanOrEqual(0);
    expect(hs.subscores.mentalWellbeing).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getAttention
// ═══════════════════════════════════════════════════════════════════

describe('Beneficiary-360 — getAttention', () => {
  it('critical open flags appear at top', async () => {
    const svc = createBeneficiary360Service({
      services: {
        psych: stubPsych({
          flags: [
            {
              _id: 'f1',
              flagNumber: 'RF-1',
              flagType: 'suicidal_ideation',
              severity: 'critical',
              status: 'active',
              raisedAt: new Date(),
            },
            {
              _id: 'f2',
              flagNumber: 'RF-2',
              flagType: 'neglect_risk',
              severity: 'moderate',
              status: 'active',
              raisedAt: new Date(),
            },
          ],
          scales: [],
          mdt: [],
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    expect(a.items[0].priority).toBe('critical');
    expect(a.items[0].kind).toBe('critical_risk_flag');
    // moderate flag should NOT appear (only critical is surfaced)
    expect(a.items.filter(i => i.kind === 'critical_risk_flag').length).toBe(1);
  });

  it('high-risk social case surfaced', async () => {
    const svc = createBeneficiary360Service({
      services: {
        socialCase: stubSocialCase({
          cases: [{ _id: 'c1', caseNumber: 'SC-1', status: 'active', riskLevel: 'high' }],
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    expect(a.items.some(i => i.kind === 'high_risk_case')).toBe(true);
  });

  it('overdue transition goal flagged', async () => {
    const svc = createBeneficiary360Service({
      services: {
        independence: stubIndependence({
          activeTransition: {
            _id: 't1',
            assessmentNumber: 'TRA-1',
            goals: [
              {
                _id: 'g1',
                goal: 'Open bank account',
                status: 'pending',
                targetDate: new Date('2026-01-01'),
              },
              {
                _id: 'g2',
                goal: 'Get job',
                status: 'achieved',
                targetDate: new Date('2026-01-01'),
              },
            ],
          },
          iadlSeries: [],
          participation: [],
          analytics: null,
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    const overdue = a.items.filter(i => i.kind === 'overdue_goal');
    expect(overdue.length).toBe(1);
    expect(overdue[0].title).toContain('bank account');
  });

  it('welfare awaiting info surfaced', async () => {
    const svc = createBeneficiary360Service({
      services: {
        welfare: stubWelfare({
          apps: [
            { _id: 'w1', applicationNumber: 'WA-1', status: 'info_requested', statusHistory: [] },
            { _id: 'w2', applicationNumber: 'WA-2', status: 'approved', statusHistory: [] },
          ],
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    const items = a.items.filter(i => i.kind === 'welfare_info_requested');
    expect(items.length).toBe(1);
    expect(items[0].title).toContain('WA-1');
  });

  it('upcoming home visit + MDT surfaced', async () => {
    const future = new Date(Date.now() + 86400000);
    const svc = createBeneficiary360Service({
      services: {
        homeVisit: stubHomeVisit({
          visits: [{ _id: 'hv1', visitNumber: 'HV-1', status: 'scheduled', scheduledFor: future }],
        }),
        psych: stubPsych({
          flags: [],
          scales: [],
          mdt: [
            {
              _id: 'm1',
              meetingNumber: 'MDT-1',
              status: 'scheduled',
              purpose: 'risk_flag_review',
              scheduledFor: future,
            },
          ],
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    expect(a.items.some(i => i.kind === 'upcoming_home_visit')).toBe(true);
    expect(a.items.some(i => i.kind === 'upcoming_mdt')).toBe(true);
  });

  it('safety plan review overdue surfaced', async () => {
    const svc = createBeneficiary360Service({
      services: {
        psych: stubPsych({
          flags: [
            {
              _id: 'f1',
              flagNumber: 'RF-1',
              status: 'monitoring',
              severity: 'high',
              safetyPlanReviewDue: new Date('2026-01-01'),
            },
          ],
          scales: [],
          mdt: [],
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    expect(a.items.some(i => i.kind === 'safety_plan_review_overdue')).toBe(true);
  });

  it('empty profile → empty attention list', async () => {
    const svc = createBeneficiary360Service({ services: {} });
    const a = await svc.getAttention('ben-1');
    expect(a.items).toEqual([]);
    expect(a.count).toBe(0);
  });

  it('items ordered by priority — critical > high > normal', async () => {
    const future = new Date(Date.now() + 86400000);
    const svc = createBeneficiary360Service({
      services: {
        psych: stubPsych({
          flags: [
            {
              _id: 'f1',
              flagNumber: 'RF-CRIT',
              severity: 'critical',
              status: 'active',
              flagType: 'suicidal_ideation',
              raisedAt: new Date(),
            },
            {
              _id: 'f2',
              flagNumber: 'RF-OVERDUE',
              status: 'monitoring',
              severity: 'high',
              safetyPlanReviewDue: new Date('2026-01-01'),
            },
          ],
          scales: [],
          mdt: [],
        }),
        homeVisit: stubHomeVisit({
          visits: [{ _id: 'hv1', visitNumber: 'HV-1', status: 'scheduled', scheduledFor: future }],
        }),
      },
    });
    const a = await svc.getAttention('ben-1');
    expect(a.items[0].priority).toBe('critical');
    expect(a.items[1].priority).toBe('high');
    expect(a.items[a.items.length - 1].priority).toBe('normal');
  });
});
