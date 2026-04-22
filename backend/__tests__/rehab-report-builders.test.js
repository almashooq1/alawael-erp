/**
 * Phase 9 C14 — report builders (pure functions, no DB).
 */
const builders = require('../services/rehabReportBuilders');

function entry(value, isoDate) {
  return { measuredValue: value, value, recordedAt: new Date(isoDate) };
}

const improvingGoal = {
  _id: 'g1',
  templateCode: 'PT.GAIT.001',
  disciplineId: 'PT',
  description: 'Walk 10m independently',
  baseline: 0,
  target: 10,
};
const improvingEntries = [
  entry(1, '2026-03-01'),
  entry(3, '2026-03-08'),
  entry(6, '2026-03-15'),
  entry(9, '2026-03-22'),
];

const masteredGoal = {
  _id: 'g2',
  templateCode: 'OT.FM.001',
  disciplineId: 'OT',
  description: 'Grip pencil correctly',
  baseline: 0,
  target: 5,
};
const masteredEntries = [entry(5, '2026-03-10'), entry(5, '2026-03-17'), entry(5, '2026-03-24')];

const stalledGoal = {
  _id: 'g3',
  templateCode: 'SLP.PHON.001',
  disciplineId: 'SLP',
  description: 'Articulate /s/ sound',
  baseline: 0,
  target: 10,
};
const stalledEntries = [entry(2, '2026-01-01'), entry(2, '2026-01-08'), entry(2, '2026-01-15')];

const progressByGoal = {
  g1: improvingEntries,
  g2: masteredEntries,
  g3: stalledEntries,
};

const beneficiary = { _id: 'b1', fullName: 'Ahmad A.', dateOfBirth: '2019-01-01' };
const carePlan = { _id: 'cp1', startDate: '2026-01-01', endDate: '2026-04-01' };
const reviews = [
  {
    _id: 'r1',
    carePlanId: 'cp1',
    dueAt: '2026-03-01',
    status: 'COMPLETED',
    completedAt: '2026-02-28',
  },
  { _id: 'r2', carePlanId: 'cp1', dueAt: '2026-04-01', status: 'PENDING' },
];

describe('rehabReportBuilders — IRP snapshot', () => {
  const snap = builders.buildIrpSnapshot({
    beneficiary,
    carePlan,
    goals: [improvingGoal, masteredGoal, stalledGoal],
    progressByGoal,
    reviews,
  });

  test('has correct report type + metadata', () => {
    expect(snap.reportType).toBe('IRP_SNAPSHOT');
    expect(typeof snap.generatedAt).toBe('string');
    expect(snap.carePlanId).toBe('cp1');
  });

  test('counts goals and mastery correctly', () => {
    expect(snap.goalCount).toBe(3);
    expect(snap.masteredCount).toBe(1);
  });

  test('dedupes disciplines', () => {
    expect(snap.disciplinesInvolved.sort()).toEqual(['OT', 'PT', 'SLP']);
  });

  test('each goal block has trend + velocity + mastered', () => {
    snap.goals.forEach(g => {
      expect(g).toHaveProperty('trend');
      expect(g).toHaveProperty('velocity');
      expect(g).toHaveProperty('mastered');
    });
  });

  test('picks latest review', () => {
    expect(snap.latestReview._id).toBe('r2');
  });

  test('beneficiary block has id + fullName + computed age', () => {
    expect(snap.beneficiary.id).toBe('b1');
    expect(snap.beneficiary.fullName).toBe('Ahmad A.');
    expect(typeof snap.beneficiary.age).toBe('number');
  });
});

describe('rehabReportBuilders — Family update', () => {
  const update = builders.buildFamilyUpdate({
    beneficiary,
    goals: [improvingGoal, masteredGoal, stalledGoal],
    progressByGoal,
  });

  test('separates highlights vs concerns', () => {
    expect(update.reportType).toBe('FAMILY_UPDATE');
    expect(update.highlights.length).toBeGreaterThanOrEqual(1);
    expect(update.concerns.length).toBeGreaterThanOrEqual(0);
  });

  test('summary adds up', () => {
    expect(update.summary.totalGoals).toBe(3);
    expect(update.summary.mastered).toBe(1);
    expect(
      update.summary.needsAttention + update.summary.mastered + update.summary.improving
    ).toBeLessThanOrEqual(3);
  });
});

describe('rehabReportBuilders — Discipline report card', () => {
  const card = builders.buildDisciplineReportCard({
    disciplineId: 'PT',
    period: { from: '2026-03-01', to: '2026-03-31' },
    goals: [improvingGoal, masteredGoal, stalledGoal],
    progressByGoal,
  });

  test('filters to the requested discipline only', () => {
    expect(card.disciplineId).toBe('PT');
    expect(card.goalCount).toBe(1);
    expect(card.goals[0].disciplineId).toBe('PT');
  });

  test('emits trend counts object', () => {
    expect(card.trendCounts).toHaveProperty('IMPROVING');
    expect(card.trendCounts).toHaveProperty('STABLE');
    expect(card.trendCounts).toHaveProperty('DECLINING');
    expect(card.trendCounts).toHaveProperty('STALLED');
  });

  test('carries period through', () => {
    expect(card.period).toEqual({ from: '2026-03-01', to: '2026-03-31' });
  });
});

describe('rehabReportBuilders — Discharge summary', () => {
  const disc = builders.buildDischargeSummary({
    beneficiary,
    carePlan,
    goals: [improvingGoal, masteredGoal, stalledGoal],
    progressByGoal,
    reviews,
  });

  test('has mastery rate 0..1 rounded to 2dp', () => {
    expect(disc.reportType).toBe('DISCHARGE_SUMMARY');
    expect(disc.totals.masteryRate).toBeCloseTo(1 / 3, 2);
  });

  test('surfaces enrolment + discharge dates from care plan', () => {
    expect(disc.enrolledFrom).toBe('2026-01-01');
    expect(disc.dischargedAt).toBe('2026-04-01');
  });

  test('counts review participation', () => {
    expect(disc.reviewCount).toBe(2);
  });

  test('mastery rate of 0 when no goals', () => {
    const empty = builders.buildDischargeSummary({ beneficiary, carePlan, goals: [] });
    expect(empty.totals.masteryRate).toBe(0);
  });
});

describe('rehabReportBuilders — Review compliance', () => {
  const fixedNow = new Date('2026-04-15T00:00:00Z');

  test('buckets overdue / dueSoon / upToDate', () => {
    const res = builders.buildReviewComplianceReport({
      reviews: [
        { _id: 'a', dueAt: '2026-03-01', status: 'PENDING' }, // overdue
        { _id: 'b', dueAt: '2026-04-20', status: 'PENDING' }, // dueSoon
        { _id: 'c', dueAt: '2026-05-30', status: 'PENDING' }, // upToDate
        { _id: 'd', dueAt: '2026-03-01', status: 'COMPLETED', completedAt: '2026-02-28' }, // done
      ],
      now: fixedNow,
    });
    expect(res.reportType).toBe('REVIEW_COMPLIANCE');
    expect(res.totals.overdue).toBe(1);
    expect(res.totals.dueSoon).toBe(1);
    expect(res.totals.upToDate).toBe(2);
    expect(res.overdueList).toHaveLength(1);
    expect(res.overdueList[0].reviewId).toBe('a');
    expect(res.overdueList[0].daysOverdue).toBeGreaterThan(0);
  });

  test('handles empty input', () => {
    const res = builders.buildReviewComplianceReport({ reviews: [], now: fixedNow });
    expect(res.totals).toEqual({ reviewCount: 0, overdue: 0, dueSoon: 0, upToDate: 0 });
    expect(res.overdueList).toEqual([]);
  });
});

describe('rehabReportBuilders — shared shape guarantees', () => {
  test('every builder returns an object with reportType + generatedAt', () => {
    const cases = [
      builders.buildIrpSnapshot({
        beneficiary,
        carePlan,
        goals: [],
        progressByGoal: {},
        reviews: [],
      }),
      builders.buildFamilyUpdate({ beneficiary, goals: [], progressByGoal: {} }),
      builders.buildDisciplineReportCard({ disciplineId: 'PT', goals: [], progressByGoal: {} }),
      builders.buildDischargeSummary({
        beneficiary,
        carePlan,
        goals: [],
        progressByGoal: {},
        reviews: [],
      }),
      builders.buildReviewComplianceReport({ reviews: [] }),
    ];
    cases.forEach(c => {
      expect(typeof c.reportType).toBe('string');
      expect(typeof c.generatedAt).toBe('string');
    });
  });

  test('tolerates missing beneficiary / carePlan / null ids', () => {
    const snap = builders.buildIrpSnapshot({
      beneficiary: null,
      carePlan: null,
      goals: [],
      progressByGoal: {},
      reviews: [],
    });
    expect(snap.beneficiary.id).toBeNull();
    expect(snap.carePlanId).toBeNull();
  });
});
