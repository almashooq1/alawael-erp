/**
 * no-show-prediction.test.js — Wave 115 / P3.4.
 *
 * Test sections:
 *   1. registry — bandForScore boundaries + interventionsForBand
 *   2. extractFeatures — empty + all-noshow + clamping + filtering
 *   3. scoreFromFeatures — monotonicity + clamping + zero defaults
 *   4. deriveContributions — sums approximately to score
 *   5. predictForAppointment — failure paths + happy path + dryRun
 *   6. predictBatch — branchId + horizon filters + byBand counts
 *   7. summarizeByBranch — aggregation + accuracy
 */

'use strict';

const reg = require('../intelligence/no-show-prediction.registry');
const { createNoShowPredictionService } = require('../intelligence/no-show-prediction.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function makeClock(initialMs = 1_700_000_000_000) {
  const state = { t: initialMs };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
    setMs: ms => {
      state.t = ms;
    },
  };
}

const DAY = 24 * 3600 * 1000;

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
  M.find = (q = {}) => {
    let arr = store.slice();
    if (q.beneficiary !== undefined) {
      arr = arr.filter(a => String(a.beneficiary) === String(q.beneficiary));
    }
    if (q.branchId !== undefined) {
      arr = arr.filter(a => String(a.branchId) === String(q.branchId));
    }
    if (q.status && Array.isArray(q.status.$in)) {
      arr = arr.filter(a => q.status.$in.includes(a.status));
    } else if (q.status) {
      arr = arr.filter(a => a.status === q.status);
    }
    if (q.date && q.date.$gte) {
      const min = new Date(q.date.$gte).getTime();
      arr = arr.filter(a => a.date && new Date(a.date).getTime() >= min);
    }
    if (q.date && q.date.$lte) {
      const max = new Date(q.date.$lte).getTime();
      arr = arr.filter(a => a.date && new Date(a.date).getTime() <= max);
    }
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        arr = arr.slice().sort((a, b) => {
          const av = new Date(a[key]).getTime();
          const bv = new Date(b[key]).getTime();
          return (av - bv) * dir;
        });
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
    this._id = `pred-${++counter}`;
    this.save = async () => {
      if (failOnSave) throw new Error('forced save failure');
      store.push({ ...this });
      return this;
    };
  }
  M.find = (q = {}) => {
    let arr = store.slice();
    if (q.prediction_type) arr = arr.filter(p => p.prediction_type === q.prediction_type);
    if (q.branch_id !== undefined)
      arr = arr.filter(p => String(p.branch_id) === String(q.branch_id));
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
  M._store = store;
  return M;
}

function makeAppointment(over = {}) {
  return {
    _id: 'ap-current',
    beneficiary: 'ben-A',
    branchId: 'br-1',
    date: new Date(Date.now() + 2 * DAY),
    startTime: '10:00',
    status: 'CONFIRMED',
    statusHistory: [],
    insuranceApprovalStatus: 'approved',
    ...over,
  };
}

function makeHistoryRecord(daysAgo, status, over = {}) {
  const refMs = Date.now() - daysAgo * DAY;
  return {
    _id: `h-${daysAgo}-${status}`,
    beneficiary: 'ben-A',
    branchId: 'br-1',
    date: new Date(refMs),
    startTime: '10:00',
    status,
    ...over,
  };
}

// ─── 1. Registry ────────────────────────────────────────────────────

describe('no-show registry — bandForScore', () => {
  test('LOW for score < MEDIUM threshold', () => {
    expect(reg.bandForScore(0)).toBe(reg.RISK_BAND.LOW);
    expect(reg.bandForScore(0.299)).toBe(reg.RISK_BAND.LOW);
  });
  test('MEDIUM at exact threshold and below HIGH', () => {
    expect(reg.bandForScore(0.3)).toBe(reg.RISK_BAND.MEDIUM);
    expect(reg.bandForScore(0.549)).toBe(reg.RISK_BAND.MEDIUM);
  });
  test('HIGH at exact threshold and below CRITICAL', () => {
    expect(reg.bandForScore(0.55)).toBe(reg.RISK_BAND.HIGH);
    expect(reg.bandForScore(0.749)).toBe(reg.RISK_BAND.HIGH);
  });
  test('CRITICAL at exact threshold and above', () => {
    expect(reg.bandForScore(0.75)).toBe(reg.RISK_BAND.CRITICAL);
    expect(reg.bandForScore(0.95)).toBe(reg.RISK_BAND.CRITICAL);
    expect(reg.bandForScore(1)).toBe(reg.RISK_BAND.CRITICAL);
  });
  test('non-finite score falls to LOW', () => {
    expect(reg.bandForScore(NaN)).toBe(reg.RISK_BAND.LOW);
    expect(reg.bandForScore(undefined)).toBe(reg.RISK_BAND.LOW);
  });

  test('interventionsForBand returns correct list per band', () => {
    const low = reg.interventionsForBand(reg.RISK_BAND.LOW);
    const crit = reg.interventionsForBand(reg.RISK_BAND.CRITICAL);
    expect(low).toContain(reg.INTERVENTION.STANDARD_REMINDER);
    expect(low).not.toContain(reg.INTERVENTION.PHONE_CALL_REQUIRED);
    expect(crit).toContain(reg.INTERVENTION.PHONE_CALL_REQUIRED);
    expect(crit).toContain(reg.INTERVENTION.THERAPIST_ALERT);
    expect(crit.length).toBeGreaterThan(low.length);
  });

  test('interventionsForBand unknown band falls to LOW list', () => {
    const u = reg.interventionsForBand('not-a-band');
    expect(Array.from(u)).toEqual(Array.from(reg.INTERVENTIONS_BY_BAND[reg.RISK_BAND.LOW]));
  });
});

// ─── 2. extractFeatures ─────────────────────────────────────────────

describe('no-show extractFeatures', () => {
  test('empty history → noShowRate=0, isFirstAppointment=true, daysSinceNorm=1', () => {
    const clock = makeClock();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const f = svc.extractFeatures(makeAppointment({ date: clock.now() }), [], null);
    expect(f.noShowRate90d).toBe(0);
    expect(f.cancellationRate90d).toBe(0);
    expect(f.recentStreak).toBe(0);
    expect(f.isFirstAppointment).toBe(true);
    expect(f.daysSinceLastAttended).toBeNull();
    expect(f.daysSinceLastAttendedNorm).toBe(1);
    expect(f.totalHistoricalAppointments).toBe(0);
  });

  test('all-no-show history → noShowRate=1, recentStreak=1, not first', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const history = [
      makeHistoryRecord(60, 'NO_SHOW'),
      makeHistoryRecord(45, 'NO_SHOW'),
      makeHistoryRecord(30, 'NO_SHOW'),
      makeHistoryRecord(20, 'NO_SHOW'),
      makeHistoryRecord(10, 'NO_SHOW'),
    ];
    const f = svc.extractFeatures(makeAppointment(), history, null);
    expect(f.noShowRate90d).toBe(1);
    expect(f.recentStreak).toBe(1);
    expect(f.isFirstAppointment).toBe(false);
    expect(f.totalHistoricalAppointments).toBe(5);
  });

  test('mixed history with attended → daysSinceLastAttended set', () => {
    const clock = makeClock();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const history = [
      makeHistoryRecord(60, 'COMPLETED', { date: new Date(clock.now().getTime() - 60 * DAY) }),
      makeHistoryRecord(10, 'COMPLETED', { date: new Date(clock.now().getTime() - 10 * DAY) }),
      makeHistoryRecord(5, 'NO_SHOW', { date: new Date(clock.now().getTime() - 5 * DAY) }),
    ];
    const f = svc.extractFeatures(
      makeAppointment({ date: new Date(clock.now().getTime() + DAY) }),
      history,
      null
    );
    expect(f.daysSinceLastAttended).toBeCloseTo(10, 1);
    expect(f.daysSinceLastAttendedNorm).toBeCloseTo(10 / 30, 2);
  });

  test('daysSinceLastAttendedNorm clamps at 1 for ≥30-day-old attendance', () => {
    const clock = makeClock();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const history = [
      makeHistoryRecord(60, 'COMPLETED', { date: new Date(clock.now().getTime() - 60 * DAY) }),
    ];
    const f = svc.extractFeatures(
      makeAppointment({ date: new Date(clock.now().getTime() + DAY) }),
      history,
      null
    );
    expect(f.daysSinceLastAttendedNorm).toBe(1);
  });

  test('filters out future appointments and history outside 90-day window', () => {
    const clock = makeClock();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const apDate = new Date(clock.now().getTime() + 2 * DAY);
    const history = [
      // Out-of-window (>90 days ago)
      makeHistoryRecord(120, 'NO_SHOW', { date: new Date(clock.now().getTime() - 120 * DAY) }),
      // Future (after the appointment we're scoring)
      makeHistoryRecord(-3, 'NO_SHOW', { date: new Date(clock.now().getTime() + 5 * DAY) }),
      // Valid in-window past
      makeHistoryRecord(30, 'NO_SHOW', { date: new Date(clock.now().getTime() - 30 * DAY) }),
    ];
    const f = svc.extractFeatures(makeAppointment({ date: apDate }), history, null);
    expect(f.totalHistoricalAppointments).toBe(1);
    expect(f.noShowRate90d).toBe(1);
  });

  test('counts reschedules from statusHistory', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const ap = makeAppointment({
      statusHistory: [
        { from: 'CONFIRMED', to: 'RESCHEDULED' },
        { from: 'RESCHEDULED', to: 'CONFIRMED' },
        { from: 'CONFIRMED', to: 'RESCHEDULED' },
      ],
    });
    const f = svc.extractFeatures(ap, [], null);
    expect(f.rescheduleCount).toBe(3);
    expect(f.rescheduleCountNorm).toBe(1); // capped
  });

  test('detects early hour (< 9)', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const f = svc.extractFeatures(makeAppointment({ startTime: '07:30' }), [], null);
    expect(f.hour).toBe(7);
    expect(f.earlyOrLateHour).toBe(1);
  });

  test('detects late hour (≥ 16)', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const f = svc.extractFeatures(makeAppointment({ startTime: '17:15' }), [], null);
    expect(f.hour).toBe(17);
    expect(f.earlyOrLateHour).toBe(1);
  });

  test('mid-day appointment is not early-or-late', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const f = svc.extractFeatures(makeAppointment({ startTime: '11:00' }), [], null);
    expect(f.earlyOrLateHour).toBe(0);
  });

  test('handles missing startTime → defaults to mid-day', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const f = svc.extractFeatures(makeAppointment({ startTime: undefined }), [], null);
    expect(f.hour).toBe(12);
    expect(f.earlyOrLateHour).toBe(0);
  });

  test('branch baseline propagates and clamps to [0,1]', () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const f1 = svc.extractFeatures(makeAppointment(), [], { noShowRate90d: 0.4 });
    expect(f1.branchBaseline).toBe(0.4);
    const f2 = svc.extractFeatures(makeAppointment(), [], { noShowRate90d: 5 });
    expect(f2.branchBaseline).toBe(1);
    const f3 = svc.extractFeatures(makeAppointment(), [], { noShowRate90d: -0.1 });
    expect(f3.branchBaseline).toBe(0);
  });
});

// ─── 3. scoreFromFeatures ───────────────────────────────────────────

describe('no-show scoreFromFeatures', () => {
  const svc = createNoShowPredictionService({
    appointmentModel: buildAppointmentModel(),
    predictionModel: buildPredictionModel(),
    logger: SILENT,
  });

  function baseFeatures(over = {}) {
    return {
      noShowRate90d: 0,
      cancellationRate90d: 0,
      recentStreak: 0,
      daysSinceLastAttendedNorm: 0,
      rescheduleCountNorm: 0,
      isFirstAppointment: false,
      earlyOrLateHour: 0,
      hasInsuranceApproval: true,
      branchBaseline: 0,
      ...over,
    };
  }

  test('zero features → score 0', () => {
    expect(svc.scoreFromFeatures(baseFeatures())).toBe(0);
  });

  test('monotone in noShowRate90d', () => {
    const lo = svc.scoreFromFeatures(baseFeatures({ noShowRate90d: 0.1 }));
    const hi = svc.scoreFromFeatures(baseFeatures({ noShowRate90d: 0.9 }));
    expect(hi).toBeGreaterThan(lo);
  });

  test('monotone in cancellationRate90d', () => {
    const lo = svc.scoreFromFeatures(baseFeatures({ cancellationRate90d: 0.1 }));
    const hi = svc.scoreFromFeatures(baseFeatures({ cancellationRate90d: 0.9 }));
    expect(hi).toBeGreaterThan(lo);
  });

  test('extreme features clamp to 1', () => {
    const s = svc.scoreFromFeatures(
      baseFeatures({
        noShowRate90d: 1,
        cancellationRate90d: 1,
        recentStreak: 1,
        daysSinceLastAttendedNorm: 1,
        rescheduleCountNorm: 1,
        isFirstAppointment: true,
        earlyOrLateHour: 1,
        hasInsuranceApproval: false,
        branchBaseline: 1,
      })
    );
    expect(s).toBe(1);
  });

  test('insurance-approval=false adds to score vs approval=true', () => {
    const withIns = svc.scoreFromFeatures(baseFeatures({ hasInsuranceApproval: true }));
    const noIns = svc.scoreFromFeatures(baseFeatures({ hasInsuranceApproval: false }));
    expect(noIns).toBeGreaterThan(withIns);
  });

  test('null/undefined input handled', () => {
    expect(svc.scoreFromFeatures(null)).toBe(0);
    expect(svc.scoreFromFeatures(undefined)).toBe(0);
  });
});

// ─── 4. deriveContributions ─────────────────────────────────────────

describe('no-show deriveContributions', () => {
  const svc = createNoShowPredictionService({
    appointmentModel: buildAppointmentModel(),
    predictionModel: buildPredictionModel(),
    logger: SILENT,
  });

  test('sums approximately to raw score (within rounding tolerance)', () => {
    const features = {
      noShowRate90d: 0.4,
      cancellationRate90d: 0.2,
      recentStreak: 0.2,
      daysSinceLastAttendedNorm: 0.5,
      rescheduleCountNorm: 0.3,
      isFirstAppointment: false,
      earlyOrLateHour: 1,
      hasInsuranceApproval: false,
      branchBaseline: 0.1,
    };
    const score = svc.scoreFromFeatures(features);
    const contribs = svc.deriveContributions(features);
    const sum = Object.values(contribs).reduce((a, b) => a + b, 0);
    // Allow 0.01 tolerance for rounding artifacts
    expect(Math.abs(sum - score)).toBeLessThan(0.01);
  });
});

// ─── 5. predictForAppointment ───────────────────────────────────────

describe('no-show predictForAppointment — failure paths', () => {
  test('missing appointmentId → NO_SHOW_APPOINTMENT_NOT_FOUND', async () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.predictForAppointment(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_APPOINTMENT_NOT_FOUND);
  });

  test('unknown appointmentId → NO_SHOW_APPOINTMENT_NOT_FOUND', async () => {
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.predictForAppointment('does-not-exist');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_APPOINTMENT_NOT_FOUND);
  });

  test('COMPLETED status → NO_SHOW_APPOINTMENT_INVALID_STATUS', async () => {
    const ap = makeAppointment({ _id: 'ap-done', status: 'COMPLETED' });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.predictForAppointment('ap-done');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_APPOINTMENT_INVALID_STATUS);
    expect(r.details.currentStatus).toBe('COMPLETED');
  });

  test('NO_SHOW status → NO_SHOW_APPOINTMENT_INVALID_STATUS (already happened)', async () => {
    const ap = makeAppointment({ _id: 'ap-noshow', status: 'NO_SHOW' });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.predictForAppointment('ap-noshow');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_APPOINTMENT_INVALID_STATUS);
  });

  test('appointment with no beneficiary → NO_SHOW_BENEFICIARY_REQUIRED', async () => {
    const ap = makeAppointment({ _id: 'ap-anon', beneficiary: null });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
    });
    const r = await svc.predictForAppointment('ap-anon');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_BENEFICIARY_REQUIRED);
  });

  test('persistence failure → NO_SHOW_PERSIST_FAILED', async () => {
    const ap = makeAppointment({ _id: 'ap-save-fail' });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: buildPredictionModel({ failOnSave: true }),
      logger: SILENT,
    });
    const r = await svc.predictForAppointment('ap-save-fail');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.NO_SHOW_PERSIST_FAILED);
  });
});

describe('no-show predictForAppointment — happy path', () => {
  test('persists AiPrediction with prediction_type=attendance + band + interventions', async () => {
    const clock = makeClock();
    const ap = makeAppointment({
      _id: 'ap-low',
      date: new Date(clock.now().getTime() + 2 * DAY),
    });
    const apModel = buildAppointmentModel([ap]);
    const predModel = buildPredictionModel();
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictForAppointment('ap-low');
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(reg.RISK_BANDS).toContain(r.band);
    expect(predModel._store).toHaveLength(1);
    const saved = predModel._store[0];
    expect(saved.prediction_type).toBe('attendance');
    expect(saved.model_version).toBe(reg.MODEL_VERSION);
    expect(saved.prediction_details.band).toBe(r.band);
    expect(saved.prediction_details.interventions).toEqual(r.interventions);
    expect(saved.prediction_details.appointment_id).toBe('ap-low');
    expect(saved.branch_id).toBe('br-1');
  });

  test('dryRun does not persist', async () => {
    const ap = makeAppointment({ _id: 'ap-dry' });
    const predModel = buildPredictionModel();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: predModel,
      logger: SILENT,
    });
    const r = await svc.predictForAppointment('ap-dry', { dryRun: true });
    expect(r.ok).toBe(true);
    expect(predModel._store).toHaveLength(0);
  });

  test('high-risk history yields CRITICAL band + phone-call interventions', async () => {
    const clock = makeClock();
    const ap = makeAppointment({
      _id: 'ap-crit',
      startTime: '17:30',
      insuranceApprovalStatus: 'pending',
      date: new Date(clock.now().getTime() + DAY),
      statusHistory: [
        { from: 'CONFIRMED', to: 'RESCHEDULED' },
        { from: 'CONFIRMED', to: 'RESCHEDULED' },
        { from: 'CONFIRMED', to: 'RESCHEDULED' },
      ],
    });
    // 6 historical no-shows in 90d (highest signal)
    const history = [];
    for (let d = 80; d > 0; d -= 12) {
      history.push(
        makeHistoryRecord(d, 'NO_SHOW', { date: new Date(clock.now().getTime() - d * DAY) })
      );
    }
    const apModel = buildAppointmentModel([ap, ...history]);
    const predModel = buildPredictionModel();
    const svc = createNoShowPredictionService({
      appointmentModel: apModel,
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictForAppointment('ap-crit');
    expect(r.ok).toBe(true);
    expect(['high', 'critical']).toContain(r.band);
    if (r.band === 'critical') {
      expect(r.interventions).toContain(reg.INTERVENTION.THERAPIST_ALERT);
      expect(r.interventions).toContain(reg.INTERVENTION.PHONE_CALL_REQUIRED);
    } else {
      expect(r.interventions).toContain(reg.INTERVENTION.PHONE_CALL_TASK);
    }
  });

  test('clean attendance history → LOW band', async () => {
    const clock = makeClock();
    const ap = makeAppointment({
      _id: 'ap-clean',
      date: new Date(clock.now().getTime() + DAY),
    });
    // 10 completed appointments in the last 90d, recent one a week ago
    const history = [];
    for (let d = 80; d > 5; d -= 8) {
      history.push(
        makeHistoryRecord(d, 'COMPLETED', { date: new Date(clock.now().getTime() - d * DAY) })
      );
    }
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap, ...history]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictForAppointment('ap-clean');
    expect(r.ok).toBe(true);
    expect(r.band).toBe(reg.RISK_BAND.LOW);
  });
});

// ─── 6. predictBatch ────────────────────────────────────────────────

describe('no-show predictBatch', () => {
  test('returns ok=true + groups by band + respects horizon', async () => {
    const clock = makeClock();
    const apIn = makeAppointment({
      _id: 'b-in',
      date: new Date(clock.now().getTime() + 6 * 3600 * 1000),
    });
    const apOut = makeAppointment({
      _id: 'b-out',
      date: new Date(clock.now().getTime() + 5 * DAY), // past horizon
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([apIn, apOut]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictBatch({ horizonHours: 48 });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(r.predictions[0].appointmentId).toBe('b-in');
    expect(r.byBand[r.predictions[0].band]).toBe(1);
  });

  test('respects branchId filter', async () => {
    const clock = makeClock();
    const ap1 = makeAppointment({
      _id: 'b1',
      branchId: 'br-1',
      date: new Date(clock.now().getTime() + DAY),
    });
    const ap2 = makeAppointment({
      _id: 'b2',
      branchId: 'br-2',
      date: new Date(clock.now().getTime() + DAY),
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap1, ap2]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictBatch({ branchId: 'br-1', horizonHours: 48 });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(r.predictions[0].appointmentId).toBe('b1');
    expect(r.branchId).toBe('br-1');
  });

  test('excludes appointments in non-predictable status', async () => {
    const clock = makeClock();
    const ok = makeAppointment({
      _id: 'b-ok',
      status: 'CONFIRMED',
      date: new Date(clock.now().getTime() + 3 * 3600 * 1000),
    });
    const done = makeAppointment({
      _id: 'b-done',
      status: 'COMPLETED',
      date: new Date(clock.now().getTime() + 3 * 3600 * 1000),
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ok, done]),
      predictionModel: buildPredictionModel(),
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictBatch({ horizonHours: 48 });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(r.predictions[0].appointmentId).toBe('b-ok');
  });

  test('dryRun batch does not persist but still counts', async () => {
    const clock = makeClock();
    const ap = makeAppointment({
      _id: 'b-dry',
      date: new Date(clock.now().getTime() + 3 * 3600 * 1000),
    });
    const predModel = buildPredictionModel();
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel([ap]),
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.predictBatch({ horizonHours: 48, dryRun: true });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(r.dryRun).toBe(true);
    expect(predModel._store).toHaveLength(0);
  });
});

// ─── 7. summarizeByBranch ───────────────────────────────────────────

describe('no-show summarizeByBranch', () => {
  test('aggregates predictions by band + computes accuracy', async () => {
    const clock = makeClock();
    const predModel = buildPredictionModel();
    // Seed predictions directly into the prediction store
    predModel._store.push(
      {
        prediction_type: 'attendance',
        branch_id: 'br-1',
        prediction_date: new Date(clock.now().getTime() - 2 * DAY),
        predicted_value: 0.85,
        actual_value: 0.9,
        prediction_details: { band: 'critical' },
      },
      {
        prediction_type: 'attendance',
        branch_id: 'br-1',
        prediction_date: new Date(clock.now().getTime() - DAY),
        predicted_value: 0.6,
        actual_value: 0.1, // missed prediction
        prediction_details: { band: 'high' },
      },
      {
        prediction_type: 'attendance',
        branch_id: 'br-1',
        prediction_date: new Date(clock.now().getTime() - 12 * 3600 * 1000),
        predicted_value: 0.2,
        actual_value: null, // not yet validated
        prediction_details: { band: 'low' },
      }
    );

    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });

    const r = await svc.summarizeByBranch({ branchId: 'br-1' });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(3);
    expect(r.byBand.critical).toBe(1);
    expect(r.byBand.high).toBe(1);
    expect(r.byBand.low).toBe(1);
    expect(r.validatedCount).toBe(2);
    expect(r.accuracy).toBe(0.5); // 1 of 2 within tolerance
  });

  test('null accuracy when no validated predictions', async () => {
    const clock = makeClock();
    const predModel = buildPredictionModel();
    predModel._store.push({
      prediction_type: 'attendance',
      branch_id: 'br-1',
      prediction_date: new Date(clock.now().getTime() - DAY),
      predicted_value: 0.5,
      actual_value: null,
      prediction_details: { band: 'medium' },
    });
    const svc = createNoShowPredictionService({
      appointmentModel: buildAppointmentModel(),
      predictionModel: predModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.summarizeByBranch({ branchId: 'br-1' });
    expect(r.ok).toBe(true);
    expect(r.accuracy).toBeNull();
    expect(r.validatedCount).toBe(0);
  });
});

// ─── 8. Factory guards ──────────────────────────────────────────────

describe('no-show factory guards', () => {
  test('throws when appointmentModel missing', () => {
    expect(() =>
      createNoShowPredictionService({ predictionModel: buildPredictionModel() })
    ).toThrow(/appointmentModel/);
  });
  test('throws when predictionModel missing', () => {
    expect(() =>
      createNoShowPredictionService({ appointmentModel: buildAppointmentModel() })
    ).toThrow(/predictionModel/);
  });
});
