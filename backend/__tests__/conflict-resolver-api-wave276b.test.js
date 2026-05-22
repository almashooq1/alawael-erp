'use strict';

/**
 * conflict-resolver-api-wave276b.test.js — Wave 276b.
 *
 * Unit tests for the standalone conflict-detection API exposed by
 * [[wave276b-conflict-resolver-api]]. Three helpers, each tested
 * against in-memory stub models — no DB required.
 *
 * Anti-duplication: these tests verify the LIB's wiring (correct
 * Mongo query shape, correct delegation to registry helpers). The
 * underlying detection logic is tested by the W99 reconciler suite
 * (attendance-reconciliation.service tests) and the registry helper
 * suites (dedupByZoneWindow + findCorroborationPairs).
 */

const api = require('../intelligence/conflict-resolver-api.lib');

// ─── Stub model factory ──────────────────────────────────────────
//
// Mimics a thenable Mongoose chain (findOne().lean(), find().sort().lean())
// over an in-memory array. NOT a full mock — only the methods the lib
// actually invokes.

function _makeSourceEventModel(rows) {
  const arr = Array.isArray(rows) ? rows.slice() : [];
  function _matches(row, where) {
    for (const k of Object.keys(where)) {
      if (k === '$or') {
        const ok = where.$or.some(sub => _matches(row, sub));
        if (!ok) return false;
        continue;
      }
      const expected = where[k];
      if (k === 'eventTime' && expected && typeof expected === 'object') {
        const t =
          row.eventTime instanceof Date ? row.eventTime.getTime() : Date.parse(row.eventTime);
        if (
          expected.$gte &&
          t < (expected.$gte instanceof Date ? expected.$gte.getTime() : Date.parse(expected.$gte))
        )
          return false;
        if (
          expected.$lte &&
          t > (expected.$lte instanceof Date ? expected.$lte.getTime() : Date.parse(expected.$lte))
        )
          return false;
        if (
          expected.$lt &&
          t >= (expected.$lt instanceof Date ? expected.$lt.getTime() : Date.parse(expected.$lt))
        )
          return false;
        if (
          expected.$gt &&
          t <= (expected.$gt instanceof Date ? expected.$gt.getTime() : Date.parse(expected.$gt))
        )
          return false;
        continue;
      }
      if (k.includes('.')) {
        const parts = k.split('.');
        let v = row;
        for (const p of parts) {
          v = v == null ? undefined : v[p];
        }
        if (String(v) !== String(expected)) return false;
        continue;
      }
      if (String(row[k]) !== String(expected)) return false;
    }
    return true;
  }
  return {
    findOne(where) {
      const match = arr.find(r => _matches(r, where || {}));
      const result = match || null;
      let _sortFn = null;
      const thenable = {
        sort(fn) {
          _sortFn = fn;
          return thenable;
        },
        lean() {
          return thenable;
        },
        then(resolve, reject) {
          try {
            let r = match;
            if (_sortFn && typeof _sortFn === 'object') {
              const sorted = arr
                .filter(x => _matches(x, where || {}))
                .sort((a, b) => {
                  const key = Object.keys(_sortFn)[0];
                  const dir = _sortFn[key];
                  const av = a[key] instanceof Date ? a[key].getTime() : a[key];
                  const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
                  if (av < bv) return -1 * dir;
                  if (av > bv) return 1 * dir;
                  return 0;
                });
              r = sorted[0] || null;
            }
            return Promise.resolve(r || result).then(resolve, reject);
          } catch (err) {
            return Promise.reject(err).then(resolve, reject);
          }
        },
      };
      return thenable;
    },
    find(where) {
      let _sortKey = null;
      let _sortDir = 1;
      const chain = {
        sort(spec) {
          if (spec && typeof spec === 'object') {
            const k = Object.keys(spec)[0];
            _sortKey = k;
            _sortDir = spec[k];
          }
          return chain;
        },
        lean() {
          return chain;
        },
        then(resolve, reject) {
          try {
            let out = arr.filter(r => _matches(r, where || {}));
            if (_sortKey) {
              out = out.sort((a, b) => {
                const av = a[_sortKey] instanceof Date ? a[_sortKey].getTime() : a[_sortKey];
                const bv = b[_sortKey] instanceof Date ? b[_sortKey].getTime() : b[_sortKey];
                if (av < bv) return -1 * _sortDir;
                if (av > bv) return 1 * _sortDir;
                return 0;
              });
            }
            return Promise.resolve(out).then(resolve, reject);
          } catch (err) {
            return Promise.reject(err).then(resolve, reject);
          }
        },
      };
      return chain;
    },
  };
}

function _makeDeviceModel(rows) {
  const arr = Array.isArray(rows) ? rows.slice() : [];
  return {
    findById(id) {
      const match = arr.find(r => String(r._id) === String(id)) || null;
      const thenable = {
        lean() {
          return thenable;
        },
        then(resolve, reject) {
          return Promise.resolve(match).then(resolve, reject);
        },
      };
      return thenable;
    },
  };
}

const T0 = Date.UTC(2026, 4, 22, 8, 0, 0); // 2026-05-22 08:00:00 UTC

// ─── isDuplicate ─────────────────────────────────────────────────

describe('Wave 276b — conflict-resolver-api.isDuplicate', () => {
  test('returns true when an accepted event exists within the window', async () => {
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0),
        sourceRef: { deviceId: 'dev-A' },
      },
    ];
    const dup = await api.isDuplicate(
      { sourceEventModel: _makeSourceEventModel(events) },
      {
        employeeId: 'emp-1',
        deviceId: 'dev-A',
        timestamp: new Date(T0 + 30 * 1000),
        windowSeconds: 60,
      }
    );
    expect(dup).toBe(true);
  });

  test('returns false when the candidate is outside the window', async () => {
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0),
        sourceRef: { deviceId: 'dev-A' },
      },
    ];
    const dup = await api.isDuplicate(
      { sourceEventModel: _makeSourceEventModel(events) },
      {
        employeeId: 'emp-1',
        deviceId: 'dev-A',
        timestamp: new Date(T0 + 120 * 1000),
        windowSeconds: 60,
      }
    );
    expect(dup).toBe(false);
  });

  test('returns false for a different deviceId', async () => {
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0),
        sourceRef: { deviceId: 'dev-A' },
      },
    ];
    const dup = await api.isDuplicate(
      { sourceEventModel: _makeSourceEventModel(events) },
      { employeeId: 'emp-1', deviceId: 'dev-OTHER', timestamp: new Date(T0 + 5 * 1000) }
    );
    expect(dup).toBe(false);
  });

  test('returns false for missing required args', async () => {
    const m = _makeSourceEventModel([]);
    expect(await api.isDuplicate({ sourceEventModel: m }, { deviceId: 'd', timestamp: T0 })).toBe(
      false
    );
    expect(await api.isDuplicate({ sourceEventModel: m }, { employeeId: 'e', timestamp: T0 })).toBe(
      false
    );
    expect(await api.isDuplicate({ sourceEventModel: m }, { employeeId: 'e', deviceId: 'd' })).toBe(
      false
    );
  });

  test('throws when sourceEventModel is missing', async () => {
    await expect(
      api.isDuplicate({}, { employeeId: 'e', deviceId: 'd', timestamp: T0 })
    ).rejects.toThrow(/sourceEventModel required/);
  });

  test('defaults windowSeconds to 60', async () => {
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0),
        sourceRef: { deviceId: 'dev-A' },
      },
    ];
    const within = await api.isDuplicate(
      { sourceEventModel: _makeSourceEventModel(events) },
      { employeeId: 'emp-1', deviceId: 'dev-A', timestamp: new Date(T0 + 59 * 1000) }
    );
    expect(within).toBe(true);
    const outside = await api.isDuplicate(
      { sourceEventModel: _makeSourceEventModel(events) },
      { employeeId: 'emp-1', deviceId: 'dev-A', timestamp: new Date(T0 + 61 * 1000) }
    );
    expect(outside).toBe(false);
  });
});

// ─── pairMissedPunches ───────────────────────────────────────────

describe('Wave 276b — conflict-resolver-api.pairMissedPunches', () => {
  test('returns empty result when no events exist for the day', async () => {
    const r = await api.pairMissedPunches(
      { sourceEventModel: _makeSourceEventModel([]) },
      { employeeId: 'emp-1', dateString: '2026-05-22' }
    );
    expect(r.events).toEqual([]);
    expect(r.pairs).toEqual([]);
    expect(r.unpaired).toEqual([]);
  });

  test('pairs two events from different sources within corroboration window', async () => {
    // Two events on the same day, ~10 seconds apart, DIFFERENT zones
    // (same zone would be collapsed by dedupByZoneWindow within the
    // 60s suppression window) and different sources → both survive
    // dedup and findCorroborationPairs pairs them across sources.
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0),
        source: 'face-terminal',
        zoneId: 'z-entry',
      },
      {
        _id: 'ev2',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0 + 10 * 1000),
        source: 'fingerprint',
        zoneId: 'z-desk',
      },
    ];
    const r = await api.pairMissedPunches(
      { sourceEventModel: _makeSourceEventModel(events) },
      { employeeId: 'emp-1', dateString: '2026-05-22' }
    );
    expect(r.events).toHaveLength(2);
    expect(r.pairs).toHaveLength(1);
    expect(r.unpaired).toEqual([]);
  });

  test('leaves a single event un-paired', async () => {
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0),
        source: 'face-terminal',
        zoneId: 'z1',
      },
    ];
    const r = await api.pairMissedPunches(
      { sourceEventModel: _makeSourceEventModel(events) },
      { employeeId: 'emp-1', dateString: '2026-05-22' }
    );
    expect(r.events).toHaveLength(1);
    expect(r.pairs).toEqual([]);
    expect(r.unpaired).toHaveLength(1);
  });

  test('returns empty for missing args', async () => {
    const m = _makeSourceEventModel([]);
    expect(await api.pairMissedPunches({ sourceEventModel: m }, {})).toEqual({
      pairs: [],
      unpaired: [],
      events: [],
    });
    expect(await api.pairMissedPunches({ sourceEventModel: m }, { employeeId: 'e' })).toEqual({
      pairs: [],
      unpaired: [],
      events: [],
    });
    expect(
      await api.pairMissedPunches({ sourceEventModel: m }, { dateString: '2026-05-22' })
    ).toEqual({ pairs: [], unpaired: [], events: [] });
  });

  test('throws when sourceEventModel is missing', async () => {
    await expect(
      api.pairMissedPunches({}, { employeeId: 'e', dateString: '2026-05-22' })
    ).rejects.toThrow(/sourceEventModel required/);
  });
});

// ─── detectClockDrift ────────────────────────────────────────────

describe('Wave 276b — conflict-resolver-api.detectClockDrift', () => {
  test('prefers deviceModel.lastSeenAt when present', async () => {
    const devices = [{ _id: 'dev-A', lastSeenAt: new Date(T0 + 120 * 1000) }];
    const r = await api.detectClockDrift(
      { deviceModel: _makeDeviceModel(devices) },
      { deviceId: 'dev-A', serverTime: new Date(T0) }
    );
    expect(r.driftSeconds).toBe(120);
    expect(r.exceedsThreshold).toBe(false); // 120s < 300s default
    expect(r.thresholdSeconds).toBe(300);
  });

  test('flags exceedsThreshold when drift > MAX_TIME_DRIFT_MS', async () => {
    const devices = [{ _id: 'dev-A', lastSeenAt: new Date(T0 + 400 * 1000) }];
    const r = await api.detectClockDrift(
      { deviceModel: _makeDeviceModel(devices) },
      { deviceId: 'dev-A', serverTime: new Date(T0) }
    );
    expect(r.driftSeconds).toBe(400);
    expect(r.exceedsThreshold).toBe(true);
  });

  test('returns negative drift when device is BEHIND server', async () => {
    const devices = [{ _id: 'dev-A', lastSeenAt: new Date(T0 - 90 * 1000) }];
    const r = await api.detectClockDrift(
      { deviceModel: _makeDeviceModel(devices) },
      { deviceId: 'dev-A', serverTime: new Date(T0) }
    );
    expect(r.driftSeconds).toBe(-90);
    expect(r.exceedsThreshold).toBe(false);
  });

  test('falls back to most recent event when deviceModel lacks lastSeenAt', async () => {
    const devices = [{ _id: 'dev-A' /* no lastSeenAt */ }];
    const events = [
      {
        _id: 'ev1',
        employeeId: 'emp-1',
        accepted: true,
        eventTime: new Date(T0 + 200 * 1000),
        sourceRef: { deviceId: 'dev-A' },
      },
    ];
    const r = await api.detectClockDrift(
      { deviceModel: _makeDeviceModel(devices), sourceEventModel: _makeSourceEventModel(events) },
      { deviceId: 'dev-A', serverTime: new Date(T0) }
    );
    expect(r.driftSeconds).toBe(200);
  });

  test('returns null driftSeconds when no observations exist', async () => {
    const r = await api.detectClockDrift(
      { deviceModel: _makeDeviceModel([]), sourceEventModel: _makeSourceEventModel([]) },
      { deviceId: 'dev-NEW', serverTime: new Date(T0) }
    );
    expect(r.driftSeconds).toBeNull();
    expect(r.exceedsThreshold).toBe(false);
    expect(r.thresholdSeconds).toBe(300);
  });

  test('returns empty for missing args', async () => {
    const r1 = await api.detectClockDrift({}, {});
    expect(r1.driftSeconds).toBeNull();
    const r2 = await api.detectClockDrift({}, { deviceId: 'd' });
    expect(r2.driftSeconds).toBeNull();
    const r3 = await api.detectClockDrift({}, { serverTime: T0 });
    expect(r3.driftSeconds).toBeNull();
  });

  test('threshold is sourced from attendance.registry.DEFAULTS.MAX_TIME_DRIFT_MS', async () => {
    const attReg = require('../intelligence/attendance.registry');
    const r = await api.detectClockDrift({}, { deviceId: 'd', serverTime: T0 });
    expect(r.thresholdSeconds).toBe(Math.round(attReg.DEFAULTS.MAX_TIME_DRIFT_MS / 1000));
  });
});

// ─── Anti-duplication self-test ──────────────────────────────────

describe('Wave 276b — anti-duplication contract', () => {
  test('lib re-uses hikvision.registry.dedupByZoneWindow + findCorroborationPairs', () => {
    // Reading the source to assert delegation. If a future commit
    // re-implements the loops inline, this self-test fails — same
    // pattern as W276's scanner self-test.
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'intelligence', 'conflict-resolver-api.lib.js'),
      'utf8'
    );
    expect(source).toMatch(/hikReg\.dedupByZoneWindow/);
    expect(source).toMatch(/hikReg\.findCorroborationPairs/);
    expect(source).toMatch(/attReg\.DEFAULTS\.MAX_TIME_DRIFT_MS/);
  });

  test('lib exports the documented public surface', () => {
    expect(typeof api.isDuplicate).toBe('function');
    expect(typeof api.pairMissedPunches).toBe('function');
    expect(typeof api.detectClockDrift).toBe('function');
    expect(api.DEFAULT_DUP_WINDOW_SECONDS).toBe(60);
  });
});
