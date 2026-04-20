/**
 * retention-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/retentionService');

function benef({
  id = 'B1',
  status = 'active',
  firstName_ar = 'أحمد',
  lastName_ar = 'محمد',
  createdDaysAgo = 180,
  programs = [],
}) {
  return {
    _id: id,
    status,
    firstName_ar,
    lastName_ar,
    createdAt: new Date(Date.now() - createdDaysAgo * 86400000),
    updatedAt: new Date(Date.now() - 5 * 86400000),
    enrolledPrograms: programs,
  };
}

function session({ beneficiary = 'B1', daysAgo = 5 }) {
  return {
    beneficiary,
    date: new Date(Date.now() - daysAgo * 86400000),
  };
}

describe('retentionService.indexLastSession', () => {
  it('indexes by beneficiary → latest date', () => {
    const map = svc.indexLastSession([
      session({ beneficiary: 'B1', daysAgo: 30 }),
      session({ beneficiary: 'B1', daysAgo: 5 }),
      session({ beneficiary: 'B2', daysAgo: 100 }),
    ]);
    const b1 = map.get('B1');
    const b2 = map.get('B2');
    expect(b1 > b2).toBe(true);
  });

  it('skips sessions without beneficiary or date', () => {
    const map = svc.indexLastSession([{ date: new Date() }, { beneficiary: 'B1' }]);
    expect(map.size).toBe(0);
  });
});

describe('retentionService.summarize', () => {
  it('classifies based on last-session age', () => {
    const benefs = [
      benef({ id: 'A', status: 'active' }),
      benef({ id: 'B', status: 'active' }),
      benef({ id: 'C', status: 'active' }),
      benef({ id: 'D', status: 'active' }),
    ];
    const sessions = [
      session({ beneficiary: 'A', daysAgo: 5 }), // active
      session({ beneficiary: 'B', daysAgo: 45 }), // at_risk
      session({ beneficiary: 'C', daysAgo: 90 }), // churned
      // D has no session → never_started
    ];
    const s = svc.summarize(benefs, sessions);
    expect(s.active).toBe(1);
    expect(s.atRisk).toBe(1);
    expect(s.churned).toBe(1);
    expect(s.neverStarted).toBe(1);
    expect(s.total).toBe(4);
  });

  it('excludes deceased/graduated/pending from base', () => {
    const s = svc.summarize(
      [
        benef({ status: 'deceased' }),
        benef({ status: 'graduated' }),
        benef({ status: 'pending' }),
        benef({ id: 'X', status: 'active' }),
      ],
      [session({ beneficiary: 'X', daysAgo: 5 })]
    );
    expect(s.total).toBe(1);
    expect(s.active).toBe(1);
  });

  it('computes churn/retention rates', () => {
    const s = svc.summarize(
      [benef({ id: 'A' }), benef({ id: 'B' }), benef({ id: 'C' })],
      [
        session({ beneficiary: 'A', daysAgo: 5 }), // active
        session({ beneficiary: 'B', daysAgo: 40 }), // at_risk
        session({ beneficiary: 'C', daysAgo: 100 }), // churned
      ]
    );
    // base = 3, churned = 1 → 33.3%
    expect(s.churnRate).toBe(33.3);
    // retained = 2 (active + at_risk) → 66.7%
    expect(s.retentionRate).toBe(66.7);
  });
});

describe('retentionService.atRiskBeneficiaries', () => {
  it('flags at-risk classifications', () => {
    const rows = svc.atRiskBeneficiaries(
      [benef({ id: 'A', status: 'active' })],
      [session({ beneficiary: 'A', daysAgo: 45 })]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].classification).toBe('at_risk');
    expect(rows[0].daysSinceLastSession).toBeGreaterThan(30);
  });

  it('flags active-but-declining', () => {
    // 1 session last 30d, 4 sessions prior 30d → declining
    const sessions = [
      session({ beneficiary: 'A', daysAgo: 5 }),
      session({ beneficiary: 'A', daysAgo: 40 }),
      session({ beneficiary: 'A', daysAgo: 45 }),
      session({ beneficiary: 'A', daysAgo: 50 }),
      session({ beneficiary: 'A', daysAgo: 55 }),
    ];
    const rows = svc.atRiskBeneficiaries([benef({ id: 'A' })], sessions);
    expect(rows.length).toBe(1);
    expect(rows[0].declining).toBe(true);
  });

  it('healthy active beneficiaries excluded', () => {
    const sessions = [];
    for (let i = 1; i <= 10; i++) sessions.push(session({ beneficiary: 'A', daysAgo: i }));
    const rows = svc.atRiskBeneficiaries([benef({ id: 'A' })], sessions);
    expect(rows).toEqual([]);
  });

  it('sorts at_risk before declining-active, then by days-since-last', () => {
    const rows = svc.atRiskBeneficiaries(
      [benef({ id: 'A' }), benef({ id: 'B' }), benef({ id: 'C' })],
      [
        session({ beneficiary: 'A', daysAgo: 40 }),
        session({ beneficiary: 'B', daysAgo: 55 }), // older at_risk — should be first
        // C: declining active
        session({ beneficiary: 'C', daysAgo: 5 }),
        session({ beneficiary: 'C', daysAgo: 40 }),
        session({ beneficiary: 'C', daysAgo: 45 }),
        session({ beneficiary: 'C', daysAgo: 50 }),
      ]
    );
    expect(rows[0]._id).toBe('B');
    expect(rows[rows.length - 1]._id).toBe('C'); // declining active sorts last
  });
});

describe('retentionService.cohortRetention', () => {
  it('computes retention % at 1/3/6/12m milestones', () => {
    const cohorts = svc.cohortRetention(
      [benef({ id: 'A', createdDaysAgo: 200 }), benef({ id: 'B', createdDaysAgo: 200 })],
      [
        // A still active at 6m
        session({ beneficiary: 'A', daysAgo: 10 }),
        // B last session was 1m after enroll
        session({ beneficiary: 'B', daysAgo: 165 }),
      ]
    );
    expect(cohorts.length).toBe(1);
    const c = cohorts[0];
    expect(c.enrolled).toBe(2);
    // A retained at 6m (last session 10d ago, enrolled 200d ago = ~6.3m tenure)
    // B retained at 1m only (last session 35d after enroll)
    expect(c.m1Pct).toBe(100);
    expect(c.m6Pct).toBe(50);
  });

  it('never-started beneficiaries not counted as retained', () => {
    const cohorts = svc.cohortRetention(
      [benef({ id: 'X', createdDaysAgo: 100 })],
      [] // no sessions
    );
    expect(cohorts[0].enrolled).toBe(1);
    expect(cohorts[0].m1Pct).toBe(0);
  });
});

describe('retentionService.churnByService', () => {
  it('aggregates per-program status', () => {
    const rows = svc.churnByService([
      benef({
        programs: [
          { programName: 'PT', status: 'active' },
          { programName: 'PT', status: 'dropped' },
        ],
      }),
      benef({
        programs: [
          { programName: 'PT', status: 'completed' },
          { programName: 'ST', status: 'active' },
        ],
      }),
    ]);
    const pt = rows.find(r => r.service === 'PT');
    expect(pt.total).toBe(3);
    expect(pt.churnRate).toBeCloseTo(33.3, 1);
    expect(pt.retentionRate).toBeCloseTo(66.7, 1);
  });
});

describe('retentionService.detectChurnSpike', () => {
  it('fires when monthly churn exceeds threshold pct of active base', () => {
    const benefs = [];
    // 30 active beneficiaries
    for (let i = 0; i < 30; i++) {
      benefs.push(benef({ id: `A${i}`, status: 'active' }));
    }
    // 5 recently churned this month
    for (let i = 0; i < 5; i++) {
      benefs.push(benef({ id: `C${i}`, status: 'inactive' }));
    }
    const sessions = [];
    for (let i = 0; i < 30; i++) {
      sessions.push(session({ beneficiary: `A${i}`, daysAgo: 5 }));
    }
    const s = svc.detectChurnSpike(benefs, sessions);
    // 5 churned / 30 active base = 16.7% → above 5% threshold
    expect(s.active).toBe(true);
    expect(s.churnPct).toBeGreaterThan(5);
  });

  it('silent when sample too small', () => {
    const s = svc.detectChurnSpike([benef({ id: 'X', status: 'inactive' })], []);
    expect(s.active).toBe(false);
    expect(s.reason).toBe('insufficient_sample');
  });
});
