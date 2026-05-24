'use strict';

/**
 * W352 — therapist workload dashboard drift guard.
 *
 * Tests aggregation with stub models, plus source-shape assertions on routes + bootstrap.
 */

const fs = require('fs');
const path = require('path');

const {
  createTherapistWorkloadService,
  THRESHOLDS,
} = require('../services/quality/therapistWorkload.service');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'therapistWorkload.routes.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W352 — thresholds + classification', () => {
  it('THRESHOLDS includes 4 keyed metrics (sessions.weekCompleted is informational, intentionally absent)', () => {
    const keys = Object.keys(THRESHOLDS);
    expect(keys).toContain('appointments.todayPending');
    expect(keys).toContain('appointments.noShow7d');
    expect(keys).toContain('sessions.todayPending');
    expect(keys).toContain('careplans.active');
    // Informational only — no threshold:
    expect(keys).not.toContain('sessions.weekCompleted');
  });

  it('appointments.todayPending: ok ≤8, warning 9-12, critical >12', () => {
    const svc = createTherapistWorkloadService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('appointments.todayPending', 8)).toBe('ok');
    expect(_severityFor('appointments.todayPending', 9)).toBe('warning');
    expect(_severityFor('appointments.todayPending', 12)).toBe('warning');
    expect(_severityFor('appointments.todayPending', 13)).toBe('critical');
  });

  it('careplans.active: warning >15, critical >25 (caseload limits)', () => {
    const svc = createTherapistWorkloadService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('careplans.active', 15)).toBe('ok');
    expect(_severityFor('careplans.active', 16)).toBe('warning');
    expect(_severityFor('careplans.active', 25)).toBe('warning');
    expect(_severityFor('careplans.active', 26)).toBe('critical');
  });

  it('unknown metric (including sessions.weekCompleted informational) returns ok', () => {
    const svc = createTherapistWorkloadService({});
    expect(svc._internals._severityFor('sessions.weekCompleted', 999)).toBe('ok');
    expect(svc._internals._severityFor('made.up.metric', 9999)).toBe('ok');
  });

  it('_startOfDay + _endOfDay + _daysAgo helpers', () => {
    const svc = createTherapistWorkloadService({});
    const { _startOfDay, _endOfDay, _daysAgo } = svc._internals;
    const d = new Date('2026-05-24T15:30:00Z');
    expect(_startOfDay(d).getHours()).toBe(0);
    expect(_endOfDay(d).getHours()).toBe(23);
    const week = _daysAgo(d, 7);
    expect(d.getTime() - week.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('W352 — buildWorkload end-to-end', () => {
  it('merges appointment + session + careplan rows by therapistId into single cell grid', async () => {
    const tid = 'therapist-1';
    const svc = createTherapistWorkloadService({
      appointmentModel: makeStubModel([{ _id: tid, todayPending: 10, noShow7d: 1 }]),
      sessionModel: makeStubModel([{ _id: tid, todayPending: 9, weekCompleted: 22 }]),
      carePlanModel: makeStubModel([{ _id: tid, activeCount: 20 }]),
    });
    const r = await svc.buildWorkload();
    expect(r.therapists).toHaveLength(1);
    const t = r.therapists[0];
    expect(t.cells['appointments.todayPending'].value).toBe(10);
    expect(t.cells['appointments.todayPending'].severity).toBe('warning'); // 10 in (8, 12]
    expect(t.cells['appointments.noShow7d'].severity).toBe('ok'); // 1 ≤ 3
    expect(t.cells['sessions.todayPending'].severity).toBe('warning'); // 9 in (8, 12]
    expect(t.cells['sessions.weekCompleted'].value).toBe(22);
    expect(t.cells['sessions.weekCompleted'].severity).toBe('ok'); // informational
    expect(t.cells['careplans.active'].value).toBe(20);
    expect(t.cells['careplans.active'].severity).toBe('warning'); // 20 in (15, 25]
    expect(t.severity).toBe('warning'); // max of cells
  });

  it('summary tally matches therapist severities', async () => {
    const svc = createTherapistWorkloadService({
      appointmentModel: makeStubModel([
        { _id: 't-ok', todayPending: 0, noShow7d: 0 },
        { _id: 't-warn', todayPending: 10, noShow7d: 0 },
        { _id: 't-crit', todayPending: 0, noShow7d: 9 },
      ]),
      sessionModel: makeStubModel([]),
      carePlanModel: makeStubModel([]),
    });
    const r = await svc.buildWorkload();
    expect(r.summary).toEqual({
      totalTherapists: 3,
      criticalTherapists: 1,
      warningTherapists: 1,
      okTherapists: 1,
    });
  });

  it('appointment $group filters by status PENDING/CONFIRMED/CHECKED_IN AND date today only', async () => {
    let captured = null;
    const appointmentModel = {
      aggregate: async pipeline => {
        captured = pipeline.find(s => s.$group);
        return [];
      },
    };
    const svc = createTherapistWorkloadService({
      appointmentModel,
      sessionModel: makeStubModel([]),
      carePlanModel: makeStubModel([]),
    });
    await svc.buildWorkload();
    const cond = captured.$group.todayPending.$sum.$cond[0];
    expect(cond.$and[0]).toEqual({
      $in: ['$status', ['PENDING', 'CONFIRMED', 'CHECKED_IN']],
    });
    // $gte and $lte against startOfDay/endOfDay anchors
    expect(cond.$and[1].$gte[0]).toBe('$date');
    expect(cond.$and[2].$lte[0]).toBe('$date');
  });

  it('session $group filters by SCHEDULED/CONFIRMED (today) and COMPLETED (7d)', async () => {
    let captured = null;
    const sessionModel = {
      aggregate: async pipeline => {
        captured = pipeline.find(s => s.$group);
        return [];
      },
    };
    const svc = createTherapistWorkloadService({
      appointmentModel: makeStubModel([]),
      sessionModel,
      carePlanModel: makeStubModel([]),
    });
    await svc.buildWorkload();
    expect(captured.$group.todayPending.$sum.$cond[0].$and[0]).toEqual({
      $in: ['$status', ['SCHEDULED', 'CONFIRMED']],
    });
    expect(captured.$group.weekCompleted.$sum.$cond[0].$and[0]).toEqual({
      $eq: ['$status', 'COMPLETED'],
    });
  });

  it('careplan $group filters by status:active + groups by specialist', async () => {
    let captured = null;
    const carePlanModel = {
      aggregate: async pipeline => {
        captured = pipeline;
        return [];
      },
    };
    const svc = createTherapistWorkloadService({
      appointmentModel: makeStubModel([]),
      sessionModel: makeStubModel([]),
      carePlanModel,
    });
    await svc.buildWorkload();
    expect(captured[0].$match.status).toBe('active');
    expect(captured[1].$group._id).toBe('$specialist');
  });

  it('therapistIds filter applied to all 3 source pipelines', async () => {
    const captured = {};
    const make = key => ({
      aggregate: async pipeline => {
        captured[key] = pipeline[0].$match;
        return [];
      },
    });
    const svc = createTherapistWorkloadService({
      appointmentModel: make('appt'),
      sessionModel: make('sess'),
      carePlanModel: make('plan'),
    });
    await svc.buildWorkload({ therapistIds: ['t1', 't2'] });
    expect(captured.appt.therapist).toEqual({ $in: ['t1', 't2'] });
    expect(captured.sess.therapist).toEqual({ $in: ['t1', 't2'] });
    expect(captured.plan.specialist).toEqual({ $in: ['t1', 't2'] }); // careplan uses 'specialist' field name
  });

  it('branchId filter is applied to all 3 source pipelines', async () => {
    const captured = {};
    const make = key => ({
      aggregate: async pipeline => {
        captured[key] = pipeline[0].$match;
        return [];
      },
    });
    const svc = createTherapistWorkloadService({
      appointmentModel: make('appt'),
      sessionModel: make('sess'),
      carePlanModel: make('plan'),
    });
    await svc.buildWorkload({ branchId: 'b1' });
    expect(captured.appt.branchId).toBe('b1');
    expect(captured.sess.branchId).toBe('b1');
    expect(captured.plan.branchId).toBe('b1');
  });

  it('partial source failure (e.g. careplan) leaves other sources intact', async () => {
    const tid = 'therapist-x';
    const carePlanModel = {
      aggregate: async () => {
        throw new Error('simulated careplan failure');
      },
    };
    const svc = createTherapistWorkloadService({
      appointmentModel: makeStubModel([{ _id: tid, todayPending: 3, noShow7d: 0 }]),
      sessionModel: makeStubModel([{ _id: tid, todayPending: 2, weekCompleted: 15 }]),
      carePlanModel,
      logger: { warn: () => {} },
    });
    const r = await svc.buildWorkload();
    expect(r.therapists).toHaveLength(1);
    expect(r.therapists[0].cells['appointments.todayPending'].value).toBe(3);
    expect(r.therapists[0].cells['careplans.active']).toBeNull();
  });

  it('empty across all sources → empty therapists + zero summary', async () => {
    const svc = createTherapistWorkloadService({
      appointmentModel: makeStubModel([]),
      sessionModel: makeStubModel([]),
      carePlanModel: makeStubModel([]),
    });
    const r = await svc.buildWorkload();
    expect(r.therapists).toEqual([]);
    expect(r.summary.totalTherapists).toBe(0);
  });
});

describe('W352 — REST + bootstrap', () => {
  it('GET /health exposes thresholds + metrics + notes for informational metric', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/health['"]/);
    expect(ROUTES_SRC).toMatch(/thresholds:\s*THRESHOLDS/);
    expect(ROUTES_SRC).toMatch(/sessions\.weekCompleted/);
  });

  it('GET / requires authenticate + attachMfaActor + tier 1', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*attachMfaActor\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
  });

  it('parses therapistIds csv + supports branchId filter', () => {
    expect(ROUTES_SRC).toMatch(/therapistIdsStr/);
    expect(ROUTES_SRC).toMatch(/req\.query\.branchId/);
  });

  it('bootstrap mounts at /api/quality/therapist-workload + /api/v1/...', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/quality\/therapist-workload['"]\s*,\s*workloadRouter\s*\)/
    );
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/v1\/quality\/therapist-workload['"]\s*,\s*workloadRouter\s*\)/
    );
  });

  it('bootstrap requires the correct route file path', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /require\(\s*['"]\.\.\/routes\/quality\/therapistWorkload\.routes['"]\s*\)/
    );
  });
});
