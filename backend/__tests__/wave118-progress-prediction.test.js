/**
 * wave118-progress-prediction.test.js — Wave 118 / P3.3 validation.
 *
 * Tests for backend/services/ai/progressPrediction.service.js — closes
 * the P3.3 gap by giving the existing predictor a proper test harness
 * + verifying its rule-based fallback behaves monotonically.
 *
 * Test sections:
 *   1. extractFeatures — pure feature engineering
 *   2. fallbackPrediction — monotonicity + clamping + impact strings
 *   3. predictProgress — persistence + ML fallback path
 *   4. predictDropoutRisk — recent vs prior absence rates
 *   5. validatePastPredictions — sweep + actual-value updates
 *   6. updateModelAccuracy — AiModelConfig upsert + sample threshold
 */

'use strict';

// AiPrediction + AiModelConfig are real Mongoose models loaded via
// `require('../models/AiPrediction')`. We can't import them directly
// because they boot Mongoose; instead we mock via jest.mock + factory.

jest.mock('../models/AiPrediction', () => {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `prog-${++counter}`;
    this.save = jest.fn(async () => {
      const i = store.findIndex(p => p._id === this._id);
      if (i >= 0) store[i] = { ...this };
      else store.push({ ...this });
      return this;
    });
    this.validatePrediction = jest.fn(async actual => {
      this.actual_value = actual;
      this.deviation = actual - (this.predicted_value || 0);
      this.validated_at = new Date();
      this.status = 'expired';
      await this.save();
      return this;
    });
  }
  M.find = jest.fn((q = {}) => {
    let arr = store.slice();
    if (q.status) arr = arr.filter(p => p.status === q.status);
    if (q.target_date && q.target_date.$lte) {
      const max = new Date(q.target_date.$lte).getTime();
      arr = arr.filter(p => p.target_date && new Date(p.target_date).getTime() <= max);
    }
    if (q.actual_value === null) arr = arr.filter(p => p.actual_value == null);
    if (q.actual_value && q.actual_value.$ne === null)
      arr = arr.filter(p => p.actual_value !== null && p.actual_value !== undefined);
    if (q.prediction_type) arr = arr.filter(p => p.prediction_type === q.prediction_type);
    if (q.validated_at && q.validated_at.$gte) {
      const min = new Date(q.validated_at.$gte).getTime();
      arr = arr.filter(p => p.validated_at && new Date(p.validated_at).getTime() >= min);
    }
    return {
      lean: async () => arr.map(r => ({ ...r })),
      then: resolve => resolve(arr.map(r => ({ ...r }))),
    };
  });
  M.findById = jest.fn(async id => store.find(p => p._id === id) || null);
  M._store = store;
  M._reset = () => {
    store.length = 0;
    counter = 0;
  };
  return M;
});

jest.mock('../models/AiModelConfig', () => {
  const store = [];
  return {
    findOneAndUpdate: jest.fn(async (filter, update, _opts) => {
      const existing = store.find(c => c.model_name === filter.model_name);
      const $set = (update && update.$set) || {};
      if (existing) {
        Object.assign(existing, $set);
        return existing;
      }
      const created = { model_name: filter.model_name, ...$set };
      store.push(created);
      return created;
    }),
    _store: store,
    _reset: () => {
      store.length = 0;
    },
  };
});

// Silence the service's logger output during tests.
jest.mock('../utils/logger', () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
}));

const svc = require('../services/ai/progressPrediction.service');
const AiPrediction = require('../models/AiPrediction');
const AiModelConfig = require('../models/AiModelConfig');

const DAY = 24 * 3600 * 1000;

function beneficiary(over = {}) {
  return {
    _id: 'ben-1',
    disability_type: 'autism',
    disability_severity: 'moderate',
    date_of_birth: new Date(Date.now() - 8 * 365.25 * DAY),
    enrollment_date: new Date(Date.now() - 6 * 30.44 * DAY),
    branch_id: 'br-1',
    family_involvement_score: 0.7,
    ...over,
  };
}

function session(daysAgo, status) {
  return {
    session_date: new Date(Date.now() - daysAgo * DAY),
    attendance_status: status === 'attended' ? 'attended' : status,
    status: status === 'attended' ? 'completed' : null,
  };
}

function assessment(daysAgo, total_score) {
  return {
    assessment_date: new Date(Date.now() - daysAgo * DAY),
    total_score,
  };
}

function goal(status, progress_percentage = 50) {
  return { status, progress_percentage };
}

beforeEach(() => {
  AiPrediction._reset();
  AiModelConfig._reset();
});

// ─── 1. extractFeatures ─────────────────────────────────────────────

describe('progressPrediction.extractFeatures', () => {
  test('empty inputs produce zero-rate baseline features', () => {
    const f = svc.extractFeatures(beneficiary(), [], [], []);
    expect(f.attendance_rate).toBe(0);
    expect(f.sessions_per_week).toBe(0);
    expect(f.goal_completion_rate).toBe(0);
    expect(f.active_goals_count).toBe(0);
    expect(f.total_sessions_attended).toBe(0);
    expect(f.disability_type).toBe('autism');
    expect(f.disability_severity).toBe('moderate');
    expect(f.current_age).toBeGreaterThanOrEqual(7);
    expect(f.months_in_program).toBeGreaterThanOrEqual(5);
  });

  test('high attendance + positive assessment trend → high attendance_rate + positive trend', () => {
    const sessions = [
      session(80, 'attended'),
      session(70, 'attended'),
      session(60, 'attended'),
      session(50, 'attended'),
      session(40, 'attended'),
      session(20, 'absent'),
    ];
    const assessments = [assessment(80, 50), assessment(20, 75)];
    const goals = [goal('achieved'), goal('in_progress'), goal('achieved'), goal('active')];
    const f = svc.extractFeatures(beneficiary(), sessions, assessments, goals);
    expect(f.attendance_rate).toBeCloseTo(5 / 6, 2);
    expect(f.assessment_trend).toBe(25);
    expect(f.latest_assessment_score).toBe(75);
    expect(f.goal_completion_rate).toBe(0.5);
    expect(f.active_goals_count).toBe(2);
  });

  test('filters sessions outside the 90-day window', () => {
    const sessions = [
      session(120, 'attended'), // out of window
      session(30, 'attended'),
      session(15, 'absent'),
    ];
    const f = svc.extractFeatures(beneficiary(), sessions, [], []);
    // Only 2 sessions count; 1 attended, 1 absent → 0.5 rate
    expect(f.attendance_rate).toBeCloseTo(0.5, 2);
    expect(f.total_sessions_attended).toBe(1);
  });

  test('handles beneficiary with missing dob/enrollment fields', () => {
    const f = svc.extractFeatures(
      beneficiary({ date_of_birth: null, enrollment_date: null }),
      [],
      [],
      []
    );
    expect(f.current_age).toBeNull();
    expect(f.months_in_program).toBe(0);
  });
});

// ─── 2. fallbackPrediction ──────────────────────────────────────────

describe('progressPrediction.fallbackPrediction', () => {
  function base(over = {}) {
    return {
      attendance_rate: 0.8,
      assessment_trend: 0,
      goal_completion_rate: 0,
      sessions_per_week: 0,
      ...over,
    };
  }

  test('zero baseline yields ~0.55 (mid-band)', () => {
    const r = svc.fallbackPrediction(base({ attendance_rate: 0.7 }));
    expect(r.value).toBeGreaterThan(0.5);
    expect(r.value).toBeLessThan(0.7);
    expect(r.confidence).toBe(0.5);
    expect(r.model_version).toBe('rule_based_v1');
  });

  test('high attendance → significant boost', () => {
    const lo = svc.fallbackPrediction(base({ attendance_rate: 0.5 }));
    const hi = svc.fallbackPrediction(base({ attendance_rate: 0.95 }));
    expect(hi.value).toBeGreaterThan(lo.value);
    expect(hi.details.factors.attendance_impact).toBe('+15%');
  });

  test('very low attendance → negative impact', () => {
    const r = svc.fallbackPrediction(base({ attendance_rate: 0.3 }));
    expect(r.details.factors.attendance_impact).toBe('-20%');
    expect(r.value).toBeLessThan(0.5);
  });

  test('positive assessment trend lifts score, negative lowers', () => {
    const pos = svc.fallbackPrediction(base({ assessment_trend: 5 }));
    const neg = svc.fallbackPrediction(base({ assessment_trend: -5 }));
    expect(pos.value).toBeGreaterThan(neg.value);
    expect(pos.details.factors.assessment_impact).toBe('+10%');
    expect(neg.details.factors.assessment_impact).toBe('-10%');
  });

  test('goal_completion_rate contributes proportionally', () => {
    const lo = svc.fallbackPrediction(base({ goal_completion_rate: 0 }));
    const hi = svc.fallbackPrediction(base({ goal_completion_rate: 1 }));
    expect(hi.value - lo.value).toBeCloseTo(0.2, 2);
  });

  test('score clamps to [0, 1]', () => {
    // Pile every penalty on to drive below 0
    const r = svc.fallbackPrediction({
      attendance_rate: 0.2,
      assessment_trend: -100,
      goal_completion_rate: 0,
      sessions_per_week: 0,
    });
    expect(r.value).toBeGreaterThanOrEqual(0);
    // And the inverse — pile every bonus to drive above 1
    const top = svc.fallbackPrediction({
      attendance_rate: 1,
      assessment_trend: 100,
      goal_completion_rate: 1,
      sessions_per_week: 10,
    });
    expect(top.value).toBeLessThanOrEqual(1);
  });
});

// ─── 3. predictProgress — persistence + ML fallback ─────────────────

describe('progressPrediction.predictProgress', () => {
  test('persists AiPrediction with prediction_type=progress when ML unreachable (fallback)', async () => {
    const ben = beneficiary();
    const sessions = [session(30, 'attended'), session(10, 'attended')];
    const goals = [goal('in_progress')];
    const r = await svc.predictProgress(ben, null, sessions, [], goals);
    expect(r).toBeTruthy();
    expect(AiPrediction._store).toHaveLength(1);
    const saved = AiPrediction._store[0];
    expect(saved.prediction_type).toBe('progress');
    expect(saved.beneficiary_id).toBe('ben-1');
    expect(saved.predicted_value).toBeGreaterThanOrEqual(0);
    expect(saved.predicted_value).toBeLessThanOrEqual(1);
    expect(saved.model_version).toBe('rule_based_v1');
    expect(saved.features_used).toBeTruthy();
  });

  test('target_date set ~1 month in the future', async () => {
    const r = await svc.predictProgress(beneficiary(), null, [], [], []);
    const targetMs = new Date(r.target_date).getTime();
    const predictionMs = new Date(r.prediction_date).getTime();
    const diffDays = (targetMs - predictionMs) / DAY;
    expect(diffDays).toBeGreaterThan(25);
    expect(diffDays).toBeLessThan(35);
  });

  test('plan_id is null when no plan provided', async () => {
    await svc.predictProgress(beneficiary(), null, [], [], []);
    expect(AiPrediction._store[0].plan_id).toBeNull();
  });

  test('plan_id is set when a plan is provided', async () => {
    await svc.predictProgress(beneficiary(), { _id: 'plan-X' }, [], [], []);
    expect(AiPrediction._store[0].plan_id).toBe('plan-X');
  });
});

// ─── 4. predictDropoutRisk ──────────────────────────────────────────

describe('progressPrediction.predictDropoutRisk', () => {
  test('increasing recent absence rate → higher dropout score', async () => {
    const ben = beneficiary();
    // 0..30 days ago: 4 absent out of 5 → 80%
    // 30..60 days ago: 1 absent out of 5 → 20%
    const sessions = [
      session(55, 'attended'),
      session(50, 'attended'),
      session(45, 'attended'),
      session(40, 'attended'),
      session(35, 'absent'),
      session(25, 'absent'),
      session(20, 'absent'),
      session(15, 'absent'),
      session(10, 'absent'),
      session(5, 'attended'),
    ];
    const r = await svc.predictDropoutRisk(ben, sessions);
    expect(r.predicted_value).toBeGreaterThan(0.7); // 0.8 + 0.2 trend bonus
    expect(r.features_used.trend).toBe('increasing');
    expect(r.prediction_type).toBe('dropout_risk');
    expect(AiPrediction._store).toHaveLength(1);
  });

  test('stable attendance → low dropout score', async () => {
    const sessions = [
      session(55, 'attended'),
      session(45, 'attended'),
      session(35, 'attended'),
      session(25, 'attended'),
      session(15, 'attended'),
      session(5, 'attended'),
    ];
    const r = await svc.predictDropoutRisk(beneficiary(), sessions);
    expect(r.predicted_value).toBe(0);
    expect(r.features_used.recent_absence_rate).toBe(0);
  });

  test('target_date set ~2 weeks out', async () => {
    const r = await svc.predictDropoutRisk(beneficiary(), []);
    const diffDays =
      (new Date(r.target_date).getTime() - new Date(r.prediction_date).getTime()) / DAY;
    expect(diffDays).toBeGreaterThan(12);
    expect(diffDays).toBeLessThan(16);
  });
});

// ─── 5. validatePastPredictions ─────────────────────────────────────

describe('progressPrediction.validatePastPredictions', () => {
  function seedPred(over = {}) {
    AiPrediction._store.push({
      _id: over._id || `seed-${AiPrediction._store.length + 1}`,
      beneficiary_id: 'ben-1',
      prediction_type: 'progress',
      status: 'active',
      predicted_value: 0.6,
      actual_value: null,
      target_date: new Date(Date.now() - DAY),
      ...over,
    });
  }
  function FakeGoal(goals) {
    return {
      find: () => ({
        lean: async () => goals,
      }),
    };
  }

  test('validates expired predictions using mean goal progress', async () => {
    seedPred({ _id: 'p1', predicted_value: 0.6 });
    const Goal = FakeGoal([
      { beneficiary_id: 'ben-1', progress_percentage: 60 },
      { beneficiary_id: 'ben-1', progress_percentage: 80 },
    ]);
    // findById must return a document with validatePrediction. Our mock
    // does not — patch the store row to expose it.
    const row = AiPrediction._store[0];
    row.validatePrediction = jest.fn(async actual => {
      row.actual_value = actual;
      row.validated_at = new Date();
      row.status = 'expired';
    });
    AiPrediction.findById.mockImplementationOnce(async id =>
      AiPrediction._store.find(p => p._id === id)
    );
    const count = await svc.validatePastPredictions(null, Goal);
    expect(count).toBe(1);
    expect(row.validatePrediction).toHaveBeenCalledWith(0.7); // (60+80)/2/100
  });

  test('skips predictions with no goals', async () => {
    seedPred();
    const Goal = FakeGoal([]);
    const count = await svc.validatePastPredictions(null, Goal);
    expect(count).toBe(0);
  });

  test('continues after a per-row error', async () => {
    seedPred({ _id: 'good' });
    seedPred({ _id: 'bad' });
    const goals = { good: [{ progress_percentage: 50 }], bad: [{ progress_percentage: 40 }] };
    const Goal = {
      find: q => ({
        lean: async () => goals[String(q.beneficiary_id)] || goals['good'],
      }),
    };
    let calls = 0;
    AiPrediction.findById.mockImplementation(async id => {
      calls++;
      if (id === 'bad') throw new Error('boom');
      const row = AiPrediction._store.find(p => p._id === id);
      if (row) row.validatePrediction = jest.fn(async () => {});
      return row;
    });
    const count = await svc.validatePastPredictions(null, Goal);
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(count).toBe(1);
  });
});

// ─── 6. updateModelAccuracy ────────────────────────────────────────

describe('progressPrediction.updateModelAccuracy', () => {
  function validatedPred(predicted, actual) {
    AiPrediction._store.push({
      prediction_type: 'progress',
      predicted_value: predicted,
      actual_value: actual,
      validated_at: new Date(),
    });
  }

  test('skips upsert when fewer than 10 validated samples', async () => {
    for (let i = 0; i < 5; i++) validatedPred(0.5, 0.5);
    await svc.updateModelAccuracy();
    expect(AiModelConfig.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('computes accuracy = within-tolerance count / total when ≥10 samples', async () => {
    for (let i = 0; i < 7; i++) validatedPred(0.6, 0.6); // accurate
    for (let i = 0; i < 3; i++) validatedPred(0.6, 0.9); // off by 0.3 → inaccurate
    await svc.updateModelAccuracy();
    expect(AiModelConfig.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const args = AiModelConfig.findOneAndUpdate.mock.calls[0];
    expect(args[0]).toEqual({ model_name: 'progress_predictor' });
    expect(args[1].$set.accuracy_score).toBe(0.7);
    expect(args[1].$set.training_data_count).toBe(10);
    expect(args[1].$set.last_evaluated_at).toBeInstanceOf(Date);
  });

  test('marks 100% accuracy when every prediction is within tolerance', async () => {
    for (let i = 0; i < 12; i++) validatedPred(0.5, 0.5 + 0.1); // |diff| = 0.1 ≤ 0.15
    await svc.updateModelAccuracy();
    const args = AiModelConfig.findOneAndUpdate.mock.calls[0];
    expect(args[1].$set.accuracy_score).toBe(1);
  });
});
