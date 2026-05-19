/**
 * wave122-mobile-attendance.test.js — Wave 122.
 *
 * Tests for the geofence library + mobile attendance service.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const geo = require('../intelligence/geofence.lib');
const {
  createMobileAttendanceService,
  ACCURACY_HARD_LIMIT_M,
} = require('../intelligence/mobile-attendance.service');

// ─── Geofence library ───────────────────────────────────────────

describe('geofence.lib — distanceM', () => {
  test('zero between identical points', () => {
    expect(geo.distanceM([24.7, 46.7], [24.7, 46.7])).toBe(0);
  });

  test('non-zero for distinct points', () => {
    // Riyadh-ish: 1km north shift ~ 0.009° lat.
    const d = geo.distanceM([24.7, 46.7], [24.709, 46.7]);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });

  test('Infinity on malformed input', () => {
    expect(geo.distanceM(null, [24.7, 46.7])).toBe(Infinity);
    expect(geo.distanceM([91, 0], [24.7, 46.7])).toBe(Infinity); // lat out-of-range
    expect(geo.distanceM([24.7, 46.7], [24.7, 181])).toBe(Infinity); // lng out-of-range
  });
});

describe('geofence.lib — pointInPolygon', () => {
  // 1km-ish square around Riyadh.
  const sq = [
    [24.69, 46.69],
    [24.71, 46.69],
    [24.71, 46.71],
    [24.69, 46.71],
  ];

  test('point well inside', () => {
    expect(geo.pointInPolygon([24.7, 46.7], sq)).toBe(true);
  });

  test('point well outside', () => {
    expect(geo.pointInPolygon([24.8, 46.7], sq)).toBe(false);
  });

  test('rejects malformed polygon', () => {
    expect(geo.pointInPolygon([24.7, 46.7], [[24.7, 46.7]])).toBe(false);
  });

  test('rejects malformed point', () => {
    expect(geo.pointInPolygon([null, 46.7], sq)).toBe(false);
  });
});

describe('geofence.lib — distanceToPolygonM', () => {
  const sq = [
    [24.69, 46.69],
    [24.71, 46.69],
    [24.71, 46.71],
    [24.69, 46.71],
  ];

  test('inside polygon returns 0', () => {
    expect(geo.distanceToPolygonM([24.7, 46.7], sq)).toBe(0);
  });

  test('outside returns positive meters', () => {
    const d = geo.distanceToPolygonM([24.72, 46.7], sq);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(5000);
  });
});

describe('geofence.lib — isInsideGeofence with buffer', () => {
  const sq = [
    [24.69, 46.69],
    [24.71, 46.69],
    [24.71, 46.71],
    [24.69, 46.71],
  ];

  test('inside polygon: true regardless of buffer', () => {
    expect(geo.isInsideGeofence({ point: [24.7, 46.7], polygon: sq, bufferM: 0 })).toBe(true);
  });

  test('just outside edge: true with buffer ≥ distance', () => {
    // ~10m outside the north edge
    const justOut = [24.71009, 46.7];
    expect(geo.isInsideGeofence({ point: justOut, polygon: sq, bufferM: 25 })).toBe(true);
    expect(geo.isInsideGeofence({ point: justOut, polygon: sq, bufferM: 0 })).toBe(false);
  });
});

describe('geofence.lib — isActiveAt', () => {
  test('empty activeHours = always open', () => {
    expect(geo.isActiveAt({ activeHours: [], at: new Date() })).toBe(true);
  });

  test('matches day + time window', () => {
    // 2026-05-19 (Tuesday) at 10:00 UTC
    const at = new Date('2026-05-19T10:00:00Z');
    const hrs = [{ day: 2, start: '08:00', end: '17:00' }];
    expect(geo.isActiveAt({ activeHours: hrs, at })).toBe(true);
  });

  test('rejects outside window', () => {
    const at = new Date('2026-05-19T20:00:00Z');
    const hrs = [{ day: 2, start: '08:00', end: '17:00' }];
    expect(geo.isActiveAt({ activeHours: hrs, at })).toBe(false);
  });

  test('rejects wrong day', () => {
    const at = new Date('2026-05-23T10:00:00Z'); // Saturday
    const hrs = [{ day: 2, start: '08:00', end: '17:00' }];
    expect(geo.isActiveAt({ activeHours: hrs, at })).toBe(false);
  });
});

// ─── Mobile attendance service ───────────────────────────────────

function buildSourceEventModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = `evt-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.source && r.source !== q.source) return false;
      if (q.eventKind && r.eventKind !== q.eventKind) return false;
      if (q.eventTime && q.eventTime.$gte) {
        if (new Date(r.eventTime).getTime() < new Date(q.eventTime.$gte).getTime()) return false;
      }
      if (q.eventTime && q.eventTime.$lte) {
        if (new Date(r.eventTime).getTime() > new Date(q.eventTime.$lte).getTime()) return false;
      }
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  M._store = store;
  return M;
}

function buildGeofenceModel(fences) {
  const M = {};
  M.find = function (q = {}) {
    const filtered = fences.filter(f => {
      if (q.active != null && f.active !== q.active) return false;
      if (q.branchId && String(f.branchId) !== String(q.branchId)) return false;
      return true;
    });
    return {
      lean: async () => filtered.map(f => ({ ...f })),
      then: r => r(filtered.map(f => ({ ...f }))),
    };
  };
  return M;
}

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

const RIYADH_FENCE = {
  _id: 'fence-1',
  branchId: 'br-1',
  nameAr: 'مقر الرياض',
  polygon: [
    [24.69, 46.69],
    [24.71, 46.69],
    [24.71, 46.71],
    [24.69, 46.71],
  ],
  bufferM: 25,
  active: true,
  activeHours: [],
  allowedRoles: [],
};

describe('mobile-attendance — checkIn', () => {
  test('check-in inside geofence accepted with insideGeofence=true', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7, accuracyM: 15 },
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.source).toBe('mobile-gps');
    expect(r.event.geo.insideGeofence).toBe(true);
    expect(r.tierLabel).toBe('T3');
    expect(r.flags).not.toContain('geofence-edge');
  });

  test('check-in outside geofence still accepted but flagged + downgraded', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.8, lng: 46.7, accuracyM: 15 }, // far north
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.geo.insideGeofence).toBe(false);
    expect(r.flags).toContain('geofence-edge');
  });

  test('rejects accuracy beyond hard limit', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7, accuracyM: ACCURACY_HARD_LIMIT_M + 1 },
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.errors.accuracyM).toMatch(/GPS too inaccurate/);
  });

  test('rejects role not allowed for mobile-gps', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'therapist', // not allowed mobile-gps per registry
      geo: { lat: 24.7, lng: 46.7 },
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.SOURCE_NOT_ALLOWED_FOR_ROLE);
  });

  test('rejects events too far in future', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    const r = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7 },
      eventTime: new Date('2026-05-19T11:00:00Z'), // 1h in future
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_TIME_FUTURE);
  });

  test('duplicate within suppression window rejected', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const t = new Date('2026-05-19T10:00:00Z');
    const r1 = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7 },
      eventTime: t,
    });
    expect(r1.ok).toBe(true);
    const r2 = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7 },
      eventTime: new Date(t.getTime() + 30_000), // 30s later
    });
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe(reg.REASON.DUPLICATE_WITHIN_WINDOW);
  });

  test('low-accuracy GPS adds low-confidence flag', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.checkIn({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7, accuracyM: 80 },
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.flags).toContain('low-confidence');
  });

  test('check-out variant accepts symmetrically', async () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T17:00:30Z'),
    });
    const r = await svc.checkOut({
      employeeId: 'emp-1',
      role: 'field_employee',
      geo: { lat: 24.7, lng: 46.7, accuracyM: 15 },
      eventTime: new Date('2026-05-19T17:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.eventKind).toBe('check-out');
  });
});

describe('mobile-attendance — classifyMobileEvent (pure preview)', () => {
  test('returns insideGeofence + distance for inside point', () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = svc.classifyMobileEvent({
      point: [24.7, 46.7],
      accuracyM: 15,
      geofence: RIYADH_FENCE,
    });
    expect(r.ok).toBe(true);
    expect(r.insideGeofence).toBe(true);
    expect(r.distanceFromBranchM).toBe(0);
  });

  test('flags low-confidence on poor accuracy', () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([RIYADH_FENCE]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = svc.classifyMobileEvent({
      point: [24.7, 46.7],
      accuracyM: 100,
      geofence: RIYADH_FENCE,
    });
    expect(r.flags).toContain('low-confidence');
  });

  test('rejects on missing geofence', () => {
    const Source = buildSourceEventModel();
    const Fence = buildGeofenceModel([]);
    const svc = createMobileAttendanceService({
      sourceEventModel: Source,
      geofenceModel: Fence,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = svc.classifyMobileEvent({ point: [24.7, 46.7], accuracyM: 15, geofence: null });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no-geofence');
  });
});
