/**
 * no-show-prediction-wave116.test.js — Wave 116 (P3.4 operationalization).
 *
 * Test sections:
 *   1. validateActualOutcome — failure paths
 *   2. validateActualOutcome — happy paths per terminal status
 *   3. validateActualOutcome — idempotency
 *   4. validatePending — sweeper happy path + skip semantics
 *   5. dailyScanAllBranches — passes through to predictBatch
 */

'use strict';

const reg = require('../intelligence/no-show-prediction.registry');
const { createNoShowPredictionService } = require('../intelligence/no-show-prediction.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };
const DAY = 24 * 3600 * 1000;

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

// ─── Mocks ──────────────────────────────────────────────────────────

function buildAppointmentModel(seed = []) {
  const store = seed.slice();
  function M(data) {
    Object.assign(this, data);
  }
  M.findById = id => {
    const found = store.find(a => String(a._id) === String(id));
    const result = found ? { ...found } : null;
    return {
      lean: async () => result,
      then: resolve => resolve(result),
    };
  };
  M.find = () => {
    const arr = store.slice();
    const chain = {
      sort() {
        return chain;
      },
      lean: async () => arr.map(r => ({ ...r })),
      then: resolve => resolve(arr.map(r => ({ ...r }))),
    };
    return chain;
  };
  M._store = store;
  return M;
}

function buildPredictionModel({ failOnSave = false } = {}) {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `pred-${++counter}`;
    this.save = async () => {
      if (failOnSave) throw new Error('forced save failure');
      const i = store.findIndex(p => p._id === this._id);
      if (i >= 0) store[i] = { ...this };
      else store.push({ ...this });
      return this;
    };
    this.validatePrediction = async actual => {
      this.actual_value = actual;
      this.deviation = actual - (this.predicted_value || 0);
      this.validated_at = new Date();
      this.status = 'expired';
      await this.save();
      return this;
    };
  }
  M.find = (q = {}) => {
    let arr = store.slice();
    if (q.prediction_type) arr = arr.filter(p => p.prediction_type === q.prediction_type);
    if (q.status) arr = arr.filter(p => p.status === q.status);
    if (q.actual_value === null) arr = arr.filter(p => p.actual_value == null);
    if (q.target_date && q.target_date.$lte) {
      const max = new Date(q.target_date.$lte).getTime();
      arr = arr.filter(p => new Date(p.target_date).getTime() <= max);
    }
    if (q.prediction_date && q.prediction_date.$gte) {
      const min = new Date(q.prediction_date.$gte).getTime();
      arr = arr.filter(p => new Date(p.prediction_date).getTime() >= min);
    }
    const chain = {
      sort() {
        return chain;
      },
      lean: async () => arr.map(r => ({ ...r })),
      then: resolve => resolve(arr.map(r => ({ ...r }))),
    };
    return chain;
  };
  M.findOne = q => {
    const list = store.filter(p => {
      if (q.prediction_type && p.prediction_type !== q.prediction_type) return false;
      if (q.status && p.status !== q.status) return false;
      const dotKey = 'prediction_details.appointment_id';
      if (q[dotKey]) {
        const v = p.prediction_details && p.prediction_details.appointment_id;
        if (String(v) !== String(q[dotKey])) return false;
      }
      return true;
    });
    const found = list[0];
    // Return live reference (not a clone) so we can call save()/validatePrediction()
    return {
      then: resolve => resolve(found || null),
      lean: async () => (found ? { ...found } : null),
    };
  };
  M.updateOne = async (filter, update) => {
    const i = store.findIndex(p => p._id === filter._id);
    if (i < 0) return { modifiedCount: 0 };
    const $set = (update && update.$set) || {};
    store[i] = { ...store[i], ...$set };
    return { modifiedCount: 1 };
  };
  M._store = store;
  return M;
}

function seedPrediction(predModel, over = {}) {
  const base = {
    _id: over._id || `seed-${predModel._store.length + 1}`,
    prediction_type: 'attendance',
    status: 'active',
    predicted_value: 0.6,
    actual_value: null,
    target_date: new Date(),
    prediction_date: new Date(),
    prediction_details: {
      band: 'high',
      appointment_id: 'ap-x',
    },
    branch_id: 'br-1',
    save: async function () {
      const i = predModel._store.findIndex(p => p._id === this._id);
      if (i >= 0) predModel._store[i] = { ...this };
      else predModel._store.push({ ...this });
      return this;
    },
    validatePrediction: async function (actual) {
      this.actual_value = actual;
      this.deviation = actual - (this.predicted_value || 0);
      this.validated_at = new Date();
      this.status = 'expired';
      const i = predModel._store.findIndex(p => p._id === this._id);
      if (i >= 0) predModel._store[i] = { ...this };
      else predModel._store.push({ ...this });
      return this;
    },
    ...over,
  };
  predModel._store.push(base);
  return base;
}

// ─── 1. validateActualOutcome — failure paths ──────────────────────

describe('validateActualOutcome — failure paths', () => {
  test('missing appointmentId → NO_SHOW_APPOINTMENT_NOT_FOUND', async () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({ finalStatus: 'COMPLETED' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_APPOINTMENT_NOT_FOUND);
  });

  test('non-terminal finalStatus → NO_SHOW_NOT_TERMINAL_STATUS', async () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-x',
      finalStatus: 'CONFIRMED',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_NOT_TERMINAL_STATUS);
    expect(r.details.terminal).toContain('NO_SHOW');
  });

  test('RESCHEDULED is intentionally non-terminal', async () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-x',
      finalStatus: 'RESCHEDULED',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_NOT_TERMINAL_STATUS);
  });

  test('no active prediction → NO_SHOW_NO_ACTIVE_PREDICTION', async () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-missing',
      finalStatus: 'NO_SHOW',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_NO_ACTIVE_PREDICTION);
  });
});

// ─── 2. validateActualOutcome — happy paths per terminal status ────

describe('validateActualOutcome — happy paths', () => {
  test('COMPLETED → actual_value=0, accurate when predicted close', async () => {
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-1',
      predicted_value: 0.1,
      prediction_details: { appointment_id: 'ap-1', band: 'low' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-1',
      finalStatus: 'COMPLETED',
    });
    expect(r.ok).toBe(true);
    expect(r.actualValue).toBe(0);
    expect(r.accurate).toBe(true);
    const saved = predModel._store.find(p => p._id === 'p-1');
    expect(saved.status).toBe('expired');
    expect(saved.actual_value).toBe(0);
  });

  test('NO_SHOW → actual_value=1, accurate when predicted high', async () => {
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-2',
      predicted_value: 0.9,
      prediction_details: { appointment_id: 'ap-2', band: 'critical' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-2',
      finalStatus: 'NO_SHOW',
    });
    expect(r.ok).toBe(true);
    expect(r.actualValue).toBe(1);
    expect(r.accurate).toBe(true);
  });

  test('CANCELLED → actual_value=0.5 (soft no-show)', async () => {
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-3',
      predicted_value: 0.6,
      prediction_details: { appointment_id: 'ap-3', band: 'high' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-3',
      finalStatus: 'CANCELLED',
    });
    expect(r.ok).toBe(true);
    expect(r.actualValue).toBe(0.5);
    expect(r.accurate).toBe(true); // |0.6 - 0.5| = 0.1 ≤ 0.15
  });

  test('CHECKED_IN counts as attended (0)', async () => {
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-4',
      predicted_value: 0.8,
      prediction_details: { appointment_id: 'ap-4', band: 'critical' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-4',
      finalStatus: 'CHECKED_IN',
    });
    expect(r.ok).toBe(true);
    expect(r.actualValue).toBe(0);
    expect(r.accurate).toBe(false); // |0.8 - 0| = 0.8 > 0.15 — model was wrong
  });

  test('explicit actualValue override clamps to [0,1] and wins over status mapping', async () => {
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-5',
      predicted_value: 0.5,
      prediction_details: { appointment_id: 'ap-5', band: 'medium' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-5',
      finalStatus: 'COMPLETED',
      actualValue: 1.5, // out of bounds — clamps to 1
    });
    expect(r.ok).toBe(true);
    expect(r.actualValue).toBe(1);
  });
});

// ─── 3. validateActualOutcome — idempotency ────────────────────────

describe('validateActualOutcome — idempotency', () => {
  test('already-validated prediction returns alreadyValidated:true without re-writing', async () => {
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-idem',
      predicted_value: 0.5,
      actual_value: 0,
      status: 'expired',
      prediction_details: { appointment_id: 'ap-idem', band: 'medium' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
    });
    // findOne filters on status:'active' — already-validated rows have
    // status:'expired' so they won't match. Re-seed with status:'active' +
    // actual_value to test the idempotency guard inside the service.
    predModel._store.length = 0;
    seedPrediction(predModel, {
      _id: 'p-idem',
      predicted_value: 0.5,
      actual_value: 0,
      status: 'active',
      prediction_details: { appointment_id: 'ap-idem', band: 'medium' },
    });
    const r = await svc.validateActualOutcome({
      appointmentId: 'ap-idem',
      finalStatus: 'COMPLETED',
    });
    expect(r.ok).toBe(true);
    expect(r.alreadyValidated).toBe(true);
  });
});

// ─── 4. validatePending — sweeper ──────────────────────────────────

describe('validatePending — sweeper', () => {
  test('validates terminal appointments + leaves pending alone + computes accuracy', async () => {
    const clock = makeClock();
    const apModel = buildAppointmentModel([
      { _id: 'ap-a', status: 'COMPLETED' },
      { _id: 'ap-b', status: 'NO_SHOW' },
      { _id: 'ap-c', status: 'CONFIRMED' }, // still pending
      { _id: 'ap-d', status: 'RESCHEDULED' }, // moved
      // ap-e: missing entirely
    ]);
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'pa',
      predicted_value: 0.1,
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-a', band: 'low' },
    });
    seedPrediction(predModel, {
      _id: 'pb',
      predicted_value: 0.9,
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-b', band: 'critical' },
    });
    seedPrediction(predModel, {
      _id: 'pc',
      predicted_value: 0.5,
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-c', band: 'medium' },
    });
    seedPrediction(predModel, {
      _id: 'pd',
      predicted_value: 0.5,
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-d', band: 'medium' },
    });
    seedPrediction(predModel, {
      _id: 'pe',
      predicted_value: 0.5,
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-e-missing', band: 'medium' },
    });

    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });

    const r = await svc.validatePending();
    expect(r.ok).toBe(true);
    expect(r.stats.total).toBe(5);
    expect(r.stats.validated).toBe(2); // ap-a (COMPLETED) + ap-b (NO_SHOW)
    expect(r.stats.skippedNotTerminal).toBe(2); // ap-c CONFIRMED + ap-d RESCHEDULED
    expect(r.stats.skippedAppointmentMissing).toBe(1); // ap-e-missing
    expect(r.accuracy).toBe(1); // both predictions were within tolerance
  });

  test('emits 0 validated when no terminal appointments found', async () => {
    const clock = makeClock();
    const apModel = buildAppointmentModel([{ _id: 'ap-x', status: 'CONFIRMED' }]);
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-x',
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-x', band: 'medium' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.validatePending();
    expect(r.ok).toBe(true);
    expect(r.stats.validated).toBe(0);
    expect(r.stats.skippedNotTerminal).toBe(1);
    expect(r.accuracy).toBeNull();
  });

  test('skips predictions whose appointment_id maps to a missing record', async () => {
    const clock = makeClock();
    const apModel = buildAppointmentModel([]); // no appointments
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-orphan',
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-orphan', band: 'medium' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.validatePending();
    expect(r.ok).toBe(true);
    expect(r.stats.skippedAppointmentMissing).toBe(1);
    expect(r.stats.validated).toBe(0);
  });

  test('skips predictions whose details have no appointment_id field', async () => {
    const clock = makeClock();
    const apModel = buildAppointmentModel([{ _id: 'ap-x', status: 'COMPLETED' }]);
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-bad',
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { band: 'medium' }, // no appointment_id
    });
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.validatePending();
    expect(r.ok).toBe(true);
    expect(r.stats.skippedAppointmentMissing).toBe(1);
  });

  test('accuracy reflects within-tolerance count when validated > 0', async () => {
    const clock = makeClock();
    const apModel = buildAppointmentModel([
      { _id: 'ap-good', status: 'NO_SHOW' },
      { _id: 'ap-bad', status: 'COMPLETED' },
    ]);
    const predModel = buildPredictionModel();
    seedPrediction(predModel, {
      _id: 'p-good',
      predicted_value: 0.9, // matches NO_SHOW (1)
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-good', band: 'critical' },
    });
    seedPrediction(predModel, {
      _id: 'p-bad',
      predicted_value: 0.8, // wrong — actual will be 0 (COMPLETED)
      target_date: new Date(clock.now().getTime() - DAY),
      prediction_date: new Date(clock.now().getTime() - 2 * DAY),
      prediction_details: { appointment_id: 'ap-bad', band: 'critical' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.validatePending();
    expect(r.stats.validated).toBe(2);
    expect(r.stats.accurate).toBe(1);
    expect(r.accuracy).toBe(0.5);
    expect(r.results).toHaveLength(2);
  });
});

// ─── 5. dailyScanAllBranches ───────────────────────────────────────

describe('dailyScanAllBranches', () => {
  test('runs predictBatch with no branchId across all branches', async () => {
    const clock = makeClock();
    const apModel = buildAppointmentModel([
      {
        _id: 'ap-1',
        beneficiary: 'ben-A',
        branchId: 'br-1',
        date: new Date(clock.now().getTime() + 4 * 3600 * 1000),
        startTime: '10:00',
        status: 'CONFIRMED',
        statusHistory: [],
        insuranceApprovalStatus: 'approved',
      },
      {
        _id: 'ap-2',
        beneficiary: 'ben-B',
        branchId: 'br-2',
        date: new Date(clock.now().getTime() + 12 * 3600 * 1000),
        startTime: '14:00',
        status: 'CONFIRMED',
        statusHistory: [],
        insuranceApprovalStatus: 'approved',
      },
    ]);
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.dailyScanAllBranches({ horizonHours: 48 });
    expect(r.ok).toBe(true);
    expect(r.branchId).toBeNull();
    expect(r.total).toBe(2);
    const branches = new Set(r.predictions.map(p => p.appointmentId));
    expect(branches.size).toBe(2);
  });

  test('respects dryRun and does not persist', async () => {
    const clock = makeClock();
    const ap = {
      _id: 'ap-dry',
      beneficiary: 'ben-A',
      branchId: 'br-1',
      date: new Date(clock.now().getTime() + 6 * 3600 * 1000),
      startTime: '10:00',
      status: 'CONFIRMED',
      statusHistory: [],
      insuranceApprovalStatus: 'approved',
    };
    const predModel = buildPredictionModel();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.dailyScanAllBranches({ horizonHours: 48, dryRun: true });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(predModel._store).toHaveLength(0);
  });
});
