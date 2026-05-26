/**
 * goal-forecaster-service-wave430.test.js — Wave 430 (Phase B2 producer).
 *
 * Behavioural drift guard for services/goalForecaster.service.js +
 * startup/goalForecasterBootstrap.js. Tests the producer side of the
 * Phase B chain that closes the loop W429 left open:
 *
 *   TherapeuticGoal × MeasureApplication series
 *     → forecast (W429 lib) → evaluateAgainstTarget
 *     → upsert MeasureAlert{alertType:'FORECAST_OFF_TRACK'}
 *     → (W338 cron) → forecastAlertToDraftArgs (W429)
 *     → aiRecommendationService.createDraft
 *
 * No real Mongoose — jest.setup.js mocks mongoose globally; we pass
 * synthetic in-memory models via the M.{X}() accessors.
 *
 * Also asserts:
 *   - Bootstrap is required by app.js (anti-orphaning sentinel)
 *   - Bootstrap reads ENABLE_FORECAST_OFF_TRACK_SWEEPER env flag
 *   - Bootstrap defaults to 04:30 Asia/Riyadh schedule
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const APP_JS = path.resolve(__dirname, '..', 'app.js');
const BOOTSTRAP_JS = path.resolve(__dirname, '..', 'startup', 'goalForecasterBootstrap.js');
const SERVICE_JS = path.resolve(__dirname, '..', 'services', 'goalForecaster.service.js');
const READ = p => fs.readFileSync(p, 'utf8');

const service = require('../services/goalForecaster.service');

// ────────────────────────────────────────────────────────────────────
// Synthetic in-memory models
// ────────────────────────────────────────────────────────────────────

function _makeStubs({ goal, measure, admins, existingAlert = null } = {}) {
  // Used to capture .save() side effects
  const saved = [];

  const fakeAlertDoc = existingAlert
    ? {
        ...existingAlert,
        evidence: existingAlert.evidence || {},
        save: jest.fn(async function () {
          saved.push({ op: 'save', doc: this });
          return this;
        }),
        toObject() {
          return this;
        },
      }
    : null;

  const MeasureAlert = function MeasureAlert() {};
  MeasureAlert.findOne = jest.fn(async () => fakeAlertDoc);
  MeasureAlert.create = jest.fn(async args => {
    const created = {
      ...args,
      _id: 'new-alert-id',
      toObject() {
        return { ...args, _id: 'new-alert-id' };
      },
    };
    saved.push({ op: 'create', doc: created });
    return created;
  });

  const TherapeuticGoal = function TherapeuticGoal() {};
  TherapeuticGoal.find = jest.fn(() => ({
    lean: async () => (goal ? [goal] : []),
  }));
  TherapeuticGoal.distinct = jest.fn(async () => (goal ? [goal.beneficiaryId] : []));

  const Measure = function Measure() {};
  Measure.findById = jest.fn(() => ({
    lean: async () => measure || null,
  }));

  const MeasureApplication = function MeasureApplication() {};
  MeasureApplication.find = jest.fn(() => ({
    sort: () => ({
      select: () => ({
        lean: async () => admins || [],
      }),
    }),
  }));

  // Patch mongoose.model to return our stubs by name
  const realModel = mongoose.model;
  jest.spyOn(mongoose, 'model').mockImplementation(name => {
    if (name === 'TherapeuticGoal') return TherapeuticGoal;
    if (name === 'Measure') return Measure;
    if (name === 'MeasureApplication') return MeasureApplication;
    if (name === 'MeasureAlert') return MeasureAlert;
    return realModel(name);
  });

  return { TherapeuticGoal, Measure, MeasureApplication, MeasureAlert, saved };
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ────────────────────────────────────────────────────────────────────
//  1. scanGoalMeasure — happy paths
// ────────────────────────────────────────────────────────────────────

describe('W430 — scanGoalMeasure', () => {
  test('off-track forecast → creates new FORECAST_OFF_TRACK alert', async () => {
    const goal = {
      _id: 'g1',
      beneficiaryId: 'ben-1',
      branchId: 'br-1',
      title: 'Improve GAS',
      status: 'active',
      target: { value: 50 },
      targetDate: new Date('2026-08-01'),
      objectives: [{ measureId: 'm1' }],
    };
    const measure = {
      _id: 'm1',
      code: 'GAS',
      status: 'active',
      scoringDirection: 'higher_better',
    };
    // Flat series at 30 — projecting flat won't reach target 50
    const admins = [
      { applicationDate: new Date('2026-01-01'), totalRawScore: 30 },
      { applicationDate: new Date('2026-02-01'), totalRawScore: 31 },
      { applicationDate: new Date('2026-03-01'), totalRawScore: 30 },
      { applicationDate: new Date('2026-04-01'), totalRawScore: 31 },
      { applicationDate: new Date('2026-05-01'), totalRawScore: 30 },
    ];
    const { saved, MeasureAlert } = _makeStubs({ goal, measure, admins });

    const r = await service.scanGoalMeasure({ goal, measureId: 'm1' });
    expect(r.action).toBe('created');
    expect(MeasureAlert.create).toHaveBeenCalledTimes(1);
    const created = saved.find(s => s.op === 'create').doc;
    expect(created.alertType).toBe('FORECAST_OFF_TRACK');
    expect(created.status).toBe('open');
    expect(created.measureCode).toBe('GAS');
    expect(created.evidence.target).toBe(50);
    expect(created.evidence.projected).toBeLessThan(50); // off-track
    expect(['high', 'critical']).toContain(created.evidence.severity);
  });

  test('on-track forecast → no alert created (skipped)', async () => {
    const goal = {
      _id: 'g2',
      beneficiaryId: 'ben-2',
      status: 'active',
      target: { value: 50 },
      targetDate: new Date('2026-08-01'),
      objectives: [{ measureId: 'm2' }],
    };
    const measure = { _id: 'm2', code: 'GAS', status: 'active', scoringDirection: 'higher_better' };
    // Steadily climbing — will exceed 50 well before targetDate
    const admins = [
      { applicationDate: new Date('2026-01-01'), totalRawScore: 30 },
      { applicationDate: new Date('2026-02-01'), totalRawScore: 40 },
      { applicationDate: new Date('2026-03-01'), totalRawScore: 50 },
      { applicationDate: new Date('2026-04-01'), totalRawScore: 60 },
    ];
    const { MeasureAlert } = _makeStubs({ goal, measure, admins });

    const r = await service.scanGoalMeasure({ goal, measureId: 'm2' });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('on_track');
    expect(MeasureAlert.create).not.toHaveBeenCalled();
  });

  test('insufficient admins (< 3) → skipped, no alert', async () => {
    const goal = {
      _id: 'g3',
      beneficiaryId: 'ben-3',
      status: 'active',
      target: { value: 50 },
      objectives: [{ measureId: 'm3' }],
    };
    const measure = { _id: 'm3', code: 'GAS', status: 'active' };
    const admins = [
      { applicationDate: new Date('2026-01-01'), totalRawScore: 10 },
      { applicationDate: new Date('2026-02-01'), totalRawScore: 20 },
    ];
    const { MeasureAlert } = _makeStubs({ goal, measure, admins });

    const r = await service.scanGoalMeasure({ goal, measureId: 'm3' });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('insufficient_admins');
    expect(MeasureAlert.create).not.toHaveBeenCalled();
  });

  test('missing goal target value → skipped', async () => {
    const goal = {
      _id: 'g4',
      beneficiaryId: 'ben-4',
      status: 'active',
      target: {}, // no value
      objectives: [{ measureId: 'm4' }],
    };
    _makeStubs({ goal });
    const r = await service.scanGoalMeasure({ goal, measureId: 'm4' });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('goal_missing_target_value');
  });

  test('inactive measure → skipped', async () => {
    const goal = {
      _id: 'g5',
      beneficiaryId: 'ben-5',
      status: 'active',
      target: { value: 50 },
      objectives: [{ measureId: 'm5' }],
    };
    const measure = { _id: 'm5', status: 'retired' };
    _makeStubs({ goal, measure });
    const r = await service.scanGoalMeasure({ goal, measureId: 'm5' });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('measure_inactive');
  });

  test('GOAL_FORECASTER=off → globally disabled', async () => {
    const prior = process.env.GOAL_FORECASTER;
    process.env.GOAL_FORECASTER = 'off';
    try {
      const goal = { _id: 'g6', beneficiaryId: 'ben-6', target: { value: 50 } };
      const r = await service.scanGoalMeasure({ goal, measureId: 'm6' });
      expect(r.action).toBe('skipped');
      expect(r.reason).toBe('disabled');
    } finally {
      if (prior === undefined) delete process.env.GOAL_FORECASTER;
      else process.env.GOAL_FORECASTER = prior;
    }
  });

  test('off-track AND existing open alert → updated (not duplicated)', async () => {
    const goal = {
      _id: 'g7',
      beneficiaryId: 'ben-7',
      status: 'active',
      target: { value: 50 },
      objectives: [{ measureId: 'm7' }],
    };
    const measure = { _id: 'm7', code: 'GAS', status: 'active', scoringDirection: 'higher_better' };
    const admins = [
      { applicationDate: new Date('2026-01-01'), totalRawScore: 30 },
      { applicationDate: new Date('2026-02-01'), totalRawScore: 30 },
      { applicationDate: new Date('2026-03-01'), totalRawScore: 30 },
      { applicationDate: new Date('2026-04-01'), totalRawScore: 30 },
    ];
    const existingAlert = {
      _id: 'existing-alert',
      alertType: 'FORECAST_OFF_TRACK',
      status: 'open',
      evidence: { previousField: 'kept' },
    };
    const { MeasureAlert, saved } = _makeStubs({ goal, measure, admins, existingAlert });

    const r = await service.scanGoalMeasure({ goal, measureId: 'm7' });
    expect(r.action).toBe('updated');
    expect(MeasureAlert.create).not.toHaveBeenCalled();
    const savedOp = saved.find(s => s.op === 'save');
    expect(savedOp).toBeTruthy();
    // Evidence merge preserves prior fields + adds new ones
    expect(savedOp.doc.evidence.previousField).toBe('kept');
    expect(savedOp.doc.evidence.target).toBe(50);
  });

  test('back on-track with prior open alert → auto-resolved', async () => {
    const goal = {
      _id: 'g8',
      beneficiaryId: 'ben-8',
      status: 'active',
      target: { value: 50 },
      objectives: [{ measureId: 'm8' }],
    };
    const measure = { _id: 'm8', code: 'GAS', status: 'active', scoringDirection: 'higher_better' };
    const admins = [
      { applicationDate: new Date('2026-01-01'), totalRawScore: 40 },
      { applicationDate: new Date('2026-02-01'), totalRawScore: 50 },
      { applicationDate: new Date('2026-03-01'), totalRawScore: 60 },
      { applicationDate: new Date('2026-04-01'), totalRawScore: 70 },
    ];
    const existingAlert = {
      _id: 'old-alert',
      alertType: 'FORECAST_OFF_TRACK',
      status: 'open',
      evidence: {},
    };
    const { saved } = _makeStubs({ goal, measure, admins, existingAlert });

    const r = await service.scanGoalMeasure({ goal, measureId: 'm8' });
    expect(r.action).toBe('resolved');
    expect(r.reason).toBe('back_on_track');
    const savedOp = saved.find(s => s.op === 'save');
    expect(savedOp.doc.status).toBe('resolved');
    expect(savedOp.doc.resolutionMode).toBe('auto');
    expect(savedOp.doc.evidence.autoResolveReason).toBe('back_on_track');
  });
});

// ────────────────────────────────────────────────────────────────────
//  2. _measureIdsForGoal — linkage extraction
// ────────────────────────────────────────────────────────────────────

describe('W430 — _measureIdsForGoal (linkage extraction)', () => {
  test('legacy objective.measureId path', () => {
    const ids = service._measureIdsForGoal({
      objectives: [{ measureId: 'm1' }, { measureId: 'm2' }],
    });
    expect(ids.sort()).toEqual(['m1', 'm2']);
  });

  test('W235 objective.measureLinks PRIMARY entries', () => {
    const ids = service._measureIdsForGoal({
      objectives: [
        {
          measureLinks: [
            { linkType: 'PRIMARY', measureId: 'm-primary' },
            { linkType: 'SECONDARY', measureId: 'm-secondary' },
          ],
        },
      ],
    });
    expect(ids).toEqual(['m-primary']); // SECONDARY filtered out
  });

  test('mixed legacy + W235 — dedupe by string', () => {
    const ids = service._measureIdsForGoal({
      objectives: [
        { measureId: 'shared-id' },
        { measureLinks: [{ linkType: 'PRIMARY', measureId: 'shared-id' }] },
      ],
    });
    expect(ids).toEqual(['shared-id']);
  });

  test('no measures at all → empty array', () => {
    expect(service._measureIdsForGoal({ objectives: [] })).toEqual([]);
    expect(service._measureIdsForGoal({})).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
//  3. _resolveDirection — measure → forecaster direction mapping
// ────────────────────────────────────────────────────────────────────

describe('W430 — _resolveDirection', () => {
  test('lower_better → lower', () => {
    expect(service._resolveDirection({ scoringDirection: 'lower_better' })).toBe('lower');
  });

  test('higher_better → higher (and default for missing)', () => {
    expect(service._resolveDirection({ scoringDirection: 'higher_better' })).toBe('higher');
    expect(service._resolveDirection({})).toBe('higher');
    expect(service._resolveDirection(null)).toBe('higher');
  });
});

// ────────────────────────────────────────────────────────────────────
//  4. Bootstrap + app.js wiring (anti-orphaning sentinel)
// ────────────────────────────────────────────────────────────────────

describe('W430 — bootstrap + app.js wiring sentinel', () => {
  test('app.js requires goalForecasterBootstrap (anti-orphaning)', () => {
    const src = READ(APP_JS);
    expect(src).toMatch(
      /require\(['"]\.\/startup\/goalForecasterBootstrap['"]\)\.wireGoalForecaster\(app/
    );
  });

  test('bootstrap reads ENABLE_FORECAST_OFF_TRACK_SWEEPER env flag', () => {
    const src = READ(BOOTSTRAP_JS);
    expect(src).toMatch(/ENABLE_FORECAST_OFF_TRACK_SWEEPER/);
  });

  test('bootstrap reads FORECAST_SWEEPER_BRANCH_IDS env (per-branch sweep)', () => {
    const src = READ(BOOTSTRAP_JS);
    expect(src).toMatch(/FORECAST_SWEEPER_BRANCH_IDS/);
  });

  test('bootstrap defaults to 04:30 Asia/Riyadh schedule (30min after risk sweep)', () => {
    const src = READ(BOOTSTRAP_JS);
    expect(src).toMatch(/['"]30 04 \* \* \*['"]/);
    expect(src).toMatch(/Asia\/Riyadh/);
  });

  test('bootstrap attaches service + cron task to app for discoverability', () => {
    const src = READ(BOOTSTRAP_JS);
    expect(src).toMatch(/app\._goalForecasterService\s*=\s*service/);
    expect(src).toMatch(/app\._goalForecasterCronTask\s*=\s*task/);
  });

  test('service exports the documented public API', () => {
    expect(typeof service.scanGoalMeasure).toBe('function');
    expect(typeof service.scanBeneficiary).toBe('function');
    expect(typeof service.sweep).toBe('function');
  });

  test('service consumes intelligence/goal-forecaster.lib (W429)', () => {
    const src = READ(SERVICE_JS);
    expect(src).toMatch(/require\(['"]\.\.\/intelligence\/goal-forecaster\.lib['"]\)/);
    expect(src).toMatch(/forecast\s*,/);
    expect(src).toMatch(/evaluateAgainstTarget/);
  });

  test('service creates alerts with alertType=FORECAST_OFF_TRACK only', () => {
    const src = READ(SERVICE_JS);
    // every MeasureAlert.create / MeasureAlert.findOne in this file
    // must scope to FORECAST_OFF_TRACK (it's a PRODUCER, not a router)
    const all = src.match(/alertType:\s*['"][A-Z_]+['"]/g) || [];
    for (const m of all) {
      expect(m).toMatch(/FORECAST_OFF_TRACK/);
    }
    expect(all.length).toBeGreaterThan(0);
  });
});
