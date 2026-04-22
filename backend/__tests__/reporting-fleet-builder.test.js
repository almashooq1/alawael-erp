/**
 * reporting-fleet-builder.test.js — Phase 10 Commit 7d.
 */

'use strict';

const {
  buildPunctuality,
  STATUS_AR,
  statusBucket,
  rollupTrips,
} = require('../services/reporting/builders/fleetReportBuilder');

function trip(overrides = {}) {
  return {
    _id: 'tr1',
    status: STATUS_AR.COMPLETED,
    vehicle: 'v1',
    driver: 'd1',
    startTime: new Date('2026-04-22T08:00:00Z'),
    duration: 45,
    distance: 22.5,
    violations: [],
    speedingIncidents: [],
    ...overrides,
  };
}

function makeModel(rows) {
  return {
    model: {
      find: jest.fn(async filter => {
        return rows.filter(r => {
          if (filter.startTime) {
            const d = new Date(r.startTime).getTime();
            if (filter.startTime.$gte && d < filter.startTime.$gte.getTime()) return false;
            if (filter.startTime.$lt && d >= filter.startTime.$lt.getTime()) return false;
          }
          if (filter.vehicle && String(r.vehicle) !== String(filter.vehicle)) return false;
          if (filter.driver && String(r.driver) !== String(filter.driver)) return false;
          return true;
        });
      }),
    },
  };
}

describe('statusBucket', () => {
  test('maps the Arabic enum values to buckets', () => {
    expect(statusBucket(STATUS_AR.COMPLETED)).toBe('completed');
    expect(statusBucket(STATUS_AR.CANCELLED)).toBe('cancelled');
    expect(statusBucket(STATUS_AR.IN_PROGRESS)).toBe('inProgress');
    expect(statusBucket(STATUS_AR.READY)).toBe('ready');
    expect(statusBucket('other')).toBeNull();
  });
});

describe('rollupTrips', () => {
  test('rolls up totals + avg duration/distance + violations + byVehicle', () => {
    const rows = [
      trip({
        status: STATUS_AR.COMPLETED,
        vehicle: 'v1',
        duration: 60,
        distance: 30,
        violations: [{ type: 'x' }],
      }),
      trip({ status: STATUS_AR.COMPLETED, vehicle: 'v1', duration: 40, distance: 20 }),
      trip({ status: STATUS_AR.CANCELLED, vehicle: 'v2', duration: null, distance: 10 }),
      trip({ status: STATUS_AR.READY, vehicle: 'v2', duration: 30, distance: null }),
      // 5th row: explicitly null both so they're excluded from the averages
      trip({
        status: STATUS_AR.IN_PROGRESS,
        vehicle: 'v1',
        duration: null,
        distance: null,
        speedingIncidents: [{}, {}],
      }),
    ];
    const out = rollupTrips(rows);
    expect(out.totals).toEqual({ trips: 5, completed: 2, cancelled: 1, inProgress: 1, ready: 1 });
    // avg duration: 60+40+30 / 3 = 43.3 (null durations excluded)
    expect(out.avgDurationMinutes).toBeCloseTo((60 + 40 + 30) / 3, 1);
    // avg distance: 30+20+10 / 3 = 20 (null distances excluded)
    expect(out.avgDistanceKm).toBeCloseTo((30 + 20 + 10) / 3, 1);
    expect(out.violations).toBe(1);
    expect(out.speedingIncidents).toBe(2);
    const byV1 = out.byVehicle.get('v1');
    expect(byV1.trips).toBe(3);
    expect(byV1.completed).toBe(2);
    expect(byV1.totalDistanceKm).toBeCloseTo(50);
    expect(byV1.violations).toBe(1);
  });

  test('zero rows → empty totals, null averages', () => {
    const out = rollupTrips([]);
    expect(out.totals.trips).toBe(0);
    expect(out.avgDurationMinutes).toBeNull();
    expect(out.avgDistanceKm).toBeNull();
    expect([...out.byVehicle.keys()]).toEqual([]);
  });
});

// ─── buildPunctuality end-to-end ────────────────────────────────

describe('buildPunctuality', () => {
  const report = { id: 'fleet.punctuality.weekly' };

  test('tenant-wide run computes completion rate from Trip', async () => {
    const rows = [
      trip({ status: STATUS_AR.COMPLETED, vehicle: 'v1' }),
      trip({ status: STATUS_AR.COMPLETED, vehicle: 'v2' }),
      trip({ status: STATUS_AR.CANCELLED, vehicle: 'v1' }),
    ];
    const doc = await buildPunctuality({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Trip: makeModel(rows) } },
    });
    expect(doc.totals).toMatchObject({ trips: 3, completed: 2, cancelled: 1 });
    // 2 completed / (2 + 1) = 0.666…
    expect(doc.completionRate).toBeCloseTo(2 / 3);
    expect(doc.summary.headlineMetric.label).toBe('completion rate');
    expect(doc.byVehicle[0].vehicleId).toBe('v1'); // sorted by trips desc
  });

  test('vehicle scope narrows the filter', async () => {
    const rows = [
      trip({ vehicle: 'v1', status: STATUS_AR.COMPLETED }),
      trip({ vehicle: 'v2', status: STATUS_AR.COMPLETED }),
      trip({ vehicle: 'v1', status: STATUS_AR.CANCELLED }),
    ];
    const doc = await buildPunctuality({
      report,
      periodKey: '2026-W17',
      scopeKey: 'vehicle:v1',
      ctx: { models: { Trip: makeModel(rows) } },
    });
    expect(doc.totals.trips).toBe(2);
    expect(doc.byVehicle.every(v => v.vehicleId === 'v1')).toBe(true);
  });

  test('driver scope works similarly', async () => {
    const rows = [trip({ driver: 'd1' }), trip({ driver: 'd2' }), trip({ driver: 'd1' })];
    const doc = await buildPunctuality({
      report,
      periodKey: '2026-W17',
      scopeKey: 'driver:d1',
      ctx: { models: { Trip: makeModel(rows) } },
    });
    expect(doc.totals.trips).toBe(2);
  });

  test('empty period → empty doc, null headline metric', async () => {
    const doc = await buildPunctuality({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Trip: makeModel([]) } },
    });
    expect(doc.totals.trips).toBe(0);
    expect(doc.summary.headlineMetric).toBeNull();
  });

  test('surfaces violations + speeding incidents in summary', async () => {
    const rows = [
      trip({ status: STATUS_AR.COMPLETED, violations: [{}, {}], speedingIncidents: [{}] }),
    ];
    const doc = await buildPunctuality({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Trip: makeModel(rows) } },
    });
    expect(doc.violations).toBe(2);
    expect(doc.speedingIncidents).toBe(1);
    const line = doc.summary.items.find(i => i.includes('Violations'));
    expect(line).toBeTruthy();
  });

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildPunctuality({ report, periodKey: 'nope' });
    expect(doc.totals.trips).toBe(0);
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });
});
