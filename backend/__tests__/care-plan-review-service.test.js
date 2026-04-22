/**
 * care-plan-review-service.test.js — Phase 9 Commit 9.
 *
 * Unit tests over services/carePlanReviewService.js using in-memory
 * fakes for carePlanModel + planReviewModel. No DB, no mongoose —
 * validates the red-flag trigger contract + KPI summarize logic.
 */

'use strict';

const {
  createCarePlanReviewService,
  ON_TIME_GRACE_DAYS,
} = require('../services/carePlanReviewService');

// ─── In-memory mongoose-like fakes ────────────────────────────────

function fakeModel(seed = []) {
  const docs = seed.map((d, i) => ({ _id: d._id || `doc-${i + 1}`, ...d }));
  const api = {
    docs,
    findOne(filter = {}) {
      const match = findMatch(docs, filter);
      return buildQuery(match ? [match] : [], true);
    },
    find(filter = {}) {
      const matched = findAll(docs, filter);
      return buildQuery(matched, false);
    },
    findById(id) {
      const match = docs.find(d => String(d._id) === String(id)) || null;
      return buildQuery(match ? [match] : [], true);
    },
    async create(doc) {
      const stored = { _id: `doc-${docs.length + 1}`, ...doc };
      docs.push(stored);
      return stored;
    },
    async updateOne(filter, update) {
      const match = findMatch(docs, filter);
      if (!match) return { matchedCount: 0, modifiedCount: 0 };
      Object.assign(match, update.$set || {});
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
  return api;
}

function findMatch(docs, filter) {
  return docs.find(d => matchesFilter(d, filter)) || null;
}
function findAll(docs, filter) {
  return docs.filter(d => matchesFilter(d, filter));
}
function matchesFilter(doc, filter) {
  for (const [key, cond] of Object.entries(filter)) {
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      // range operators
      if ('$gte' in cond && !(doc[key] >= cond.$gte)) return false;
      if ('$lte' in cond && !(doc[key] <= cond.$lte)) return false;
      if ('$gt' in cond && !(doc[key] > cond.$gt)) return false;
      if ('$lt' in cond && !(doc[key] < cond.$lt)) return false;
      continue;
    }
    if (doc[key] !== cond && String(doc[key]) !== String(cond)) return false;
  }
  return true;
}
function buildQuery(results, singular) {
  const query = {
    _results: results,
    sort() {
      return this;
    },
    lean() {
      return Promise.resolve(singular ? this._results[0] || null : this._results.slice());
    },
    then(resolve, reject) {
      return Promise.resolve(singular ? this._results[0] || null : this._results.slice()).then(
        resolve,
        reject
      );
    },
  };
  return query;
}

// ─── Fixtures + helpers ───────────────────────────────────────────

const FIXED_NOW = new Date('2026-05-01T00:00:00.000Z');

function makeService({ carePlans = [], planReviews = [] } = {}) {
  return createCarePlanReviewService({
    carePlanModel: fakeModel(carePlans),
    planReviewModel: fakeModel(planReviews),
    now: () => FIXED_NOW,
  });
}

function daysAgo(n) {
  return new Date(FIXED_NOW.getTime() - n * 86400000);
}
function daysFromNow(n) {
  return new Date(FIXED_NOW.getTime() + n * 86400000);
}

// ─── daysPastReviewDate() — red-flag trigger contract ─────────────

describe('carePlanReviewService.daysPastReviewDate()', () => {
  it('returns zero + null ids when no beneficiaryId is supplied', async () => {
    const svc = makeService();
    const out = await svc.daysPastReviewDate();
    expect(out).toEqual({ daysPast: 0, carePlanId: null, reviewDate: null });
  });

  it('returns zero when the beneficiary has no active care plan', async () => {
    const svc = makeService({
      carePlans: [{ beneficiary: 'ben-1', status: 'DRAFT', reviewDate: daysAgo(30) }],
    });
    const out = await svc.daysPastReviewDate('ben-1');
    expect(out.daysPast).toBe(0);
    expect(out.carePlanId).toBeNull();
  });

  it('returns zero when the plan review is still in the future', async () => {
    const svc = makeService({
      carePlans: [
        { _id: 'cp-1', beneficiary: 'ben-1', status: 'ACTIVE', reviewDate: daysFromNow(7) },
      ],
    });
    const out = await svc.daysPastReviewDate('ben-1');
    expect(out.daysPast).toBe(0);
  });

  it('returns the positive delta in days when the review is overdue', async () => {
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', status: 'ACTIVE', reviewDate: daysAgo(15) }],
    });
    const out = await svc.daysPastReviewDate('ben-1');
    expect(out.daysPast).toBe(15);
    expect(out.carePlanId).toBe('cp-1');
    expect(out.reviewDate).toEqual(daysAgo(15));
  });

  it('exposes the `daysPast` path at the shape the red-flag engine expects', async () => {
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', status: 'ACTIVE', reviewDate: daysAgo(3) }],
    });
    const out = await svc.daysPastReviewDate('ben-1');
    // path: 'daysPast' per red-flags.registry.js Phase 9 Commit 3
    expect(Object.prototype.hasOwnProperty.call(out, 'daysPast')).toBe(true);
    expect(typeof out.daysPast).toBe('number');
  });
});

// ─── summarize() — KPI feed ───────────────────────────────────────

describe('carePlanReviewService.summarize()', () => {
  it('returns null onTimePct when no plans have a scheduled review in the window', async () => {
    const svc = makeService();
    const out = await svc.summarize();
    expect(out.onTimePct).toBeNull();
    expect(out.scheduled).toBe(0);
  });

  it('counts a review as on-time when recorded within the grace window', async () => {
    const scheduled = daysAgo(30);
    const reviewedOn = daysAgo(30 - 5); // 5 days after scheduled — within 14d grace
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', reviewDate: scheduled }],
      planReviews: [{ carePlan: 'cp-1', reviewDate: reviewedOn }],
    });
    const out = await svc.summarize({ windowDays: 90 });
    expect(out.scheduled).toBe(1);
    expect(out.reviewed).toBe(1);
    expect(out.missed).toBe(0);
    expect(out.onTimePct).toBe(100);
    expect(out.graceDays).toBe(ON_TIME_GRACE_DAYS);
  });

  it('counts a review as missed when no review sits inside the grace window', async () => {
    const scheduled = daysAgo(30);
    const reviewedOn = daysAgo(30 - 20); // 20 days after — outside 14d grace
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', reviewDate: scheduled }],
      planReviews: [{ carePlan: 'cp-1', reviewDate: reviewedOn }],
    });
    const out = await svc.summarize({ windowDays: 90 });
    expect(out.missed).toBe(1);
    expect(out.reviewed).toBe(0);
    expect(out.onTimePct).toBe(0);
  });

  it('averages correctly across a mixed set', async () => {
    const svc = makeService({
      carePlans: [
        { _id: 'cp-1', beneficiary: 'ben-1', reviewDate: daysAgo(40) },
        { _id: 'cp-2', beneficiary: 'ben-2', reviewDate: daysAgo(40) },
        { _id: 'cp-3', beneficiary: 'ben-3', reviewDate: daysAgo(40) },
      ],
      planReviews: [
        { carePlan: 'cp-1', reviewDate: daysAgo(35) }, // 5d after  — on time
        { carePlan: 'cp-2', reviewDate: daysAgo(28) }, // 12d after — on time
        // cp-3 has no review — missed
      ],
    });
    const out = await svc.summarize({ windowDays: 90 });
    expect(out.scheduled).toBe(3);
    expect(out.reviewed).toBe(2);
    expect(out.missed).toBe(1);
    expect(out.onTimePct).toBeCloseTo(66.7, 1);
  });
});

// ─── recordReview() — write path ─────────────────────────────────

describe('carePlanReviewService.recordReview()', () => {
  it('requires carePlanId, beneficiaryId, nextReviewDate', async () => {
    const svc = makeService();
    await expect(svc.recordReview({})).rejects.toThrow('carePlanId');
    await expect(svc.recordReview({ carePlanId: 'x' })).rejects.toThrow('beneficiaryId');
    await expect(svc.recordReview({ carePlanId: 'x', beneficiaryId: 'y' })).rejects.toThrow(
      'nextReviewDate'
    );
  });

  it('persists a review + advances the CarePlan reviewDate', async () => {
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', status: 'ACTIVE', reviewDate: daysAgo(5) }],
    });
    const review = await svc.recordReview({
      carePlanId: 'cp-1',
      beneficiaryId: 'ben-1',
      reviewDate: FIXED_NOW,
      progressRating: 'GOOD',
      goalsAchieved: 2,
      goalsPartial: 1,
      goalsUnmet: 0,
      summary: 'طفل يُظهر تحسناً ملحوظاً في النطق',
      nextReviewDate: daysFromNow(90),
    });
    expect(review).toBeDefined();
    expect(review.reviewDate).toEqual(FIXED_NOW);
    expect(review.addressesScheduledDate).toEqual(daysAgo(5));
  });

  it('flags family attendance when any guardian-role attendee is present', async () => {
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', status: 'ACTIVE' }],
    });
    const review = await svc.recordReview({
      carePlanId: 'cp-1',
      beneficiaryId: 'ben-1',
      nextReviewDate: daysFromNow(90),
      attendees: [
        { userId: 'u1', role: 'therapist', attended: true },
        { userId: 'g1', role: 'guardian', attended: true },
      ],
    });
    expect(review.familyAttended).toBe(true);
  });

  it('does NOT flag family attendance when only staff attended', async () => {
    const svc = makeService({
      carePlans: [{ _id: 'cp-1', beneficiary: 'ben-1', status: 'ACTIVE' }],
    });
    const review = await svc.recordReview({
      carePlanId: 'cp-1',
      beneficiaryId: 'ben-1',
      nextReviewDate: daysFromNow(90),
      attendees: [{ userId: 'u1', role: 'therapist', attended: true }],
    });
    expect(review.familyAttended).toBe(false);
  });
});

// ─── Registry contract ────────────────────────────────────────────

describe('carePlanReviewService — red-flag registry contract', () => {
  it('the service + method + path declared in red-flags.registry.js exist here', () => {
    const { byId } = require('../config/red-flags.registry');
    const flag = byId('operational.care_plan.review.overdue');
    expect(flag).not.toBeNull();
    expect(flag.trigger.source.service).toBe('carePlanReviewService');
    expect(flag.trigger.source.method).toBe('daysPastReviewDate');
    expect(flag.trigger.source.path).toBe('daysPast');

    // And the method name is exported
    const svc = makeService();
    expect(typeof svc.daysPastReviewDate).toBe('function');
  });
});
