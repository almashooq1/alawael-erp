/**
 * hikvision-wave96-phase1.test.js — Wave 96 Phase 1.
 *
 * Unit tests for the foundation of the Hikvision Workforce
 * Surveillance & Attendance vertical. Covers:
 *
 *   1. Registry helpers (isValidIPv4, classifyHealth, isAttendanceEligibleKind)
 *   2. Device service guards (kind/capabilities/IP/role + Wave-18 invariants)
 *   3. Channel service (attendance ↔ face capability cross-check)
 *   4. Event ingestion (idempotency on duplicate replay + unknown device)
 *   5. Health service (heartbeat updates device status + drift alert)
 *   6. Health sweep demotes stale devices to OFFLINE
 *
 * All tests use the chainable Mongoose-style mock the Wave-72
 * access-review suite uses — no live DB.
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const { createHikvisionDeviceService } = require('../intelligence/hikvision-device.service');
const {
  createHikvisionEventIngestionService,
} = require('../intelligence/hikvision-event-ingestion.service');
const { createHikvisionHealthService } = require('../intelligence/hikvision-health.service');

// ─── Chainable mock with Wave-18 invariant emulation ───────────

function buildModel({ invariants = () => true } = {}) {
  const store = [];
  let counter = 0;

  function ModelCtor(data) {
    Object.assign(this, data);
    this._id = data._id || `id-${++counter}`;
    this.toObject = () => ({ ...this });
    this.isNew = !data._existing;
    this.isModified = () => false;

    this.validate = async function () {
      const errors = {};
      const invalidate = (path, msg) => {
        errors[path] = { message: msg };
      };
      // Run user-provided invariants
      const proxy = new Proxy(this, {
        get: (t, k) => (k === 'invalidate' ? invalidate : t[k]),
      });
      invariants.call(proxy, proxy);
      if (Object.keys(errors).length) {
        const err = new Error('Validation failed');
        err.errors = errors;
        throw err;
      }
    };

    this.save = async function () {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) {
        store[idx] = { ...this };
      } else {
        // Idempotency: enforce unique indexes if configured
        if (ModelCtor._unique) {
          for (const fields of ModelCtor._unique) {
            const conflict = store.find(r => fields.every(f => String(r[f]) === String(this[f])));
            if (conflict) {
              const err = new Error('E11000 duplicate key');
              err.code = 11000;
              throw err;
            }
          }
        }
        store.push({ ...this });
      }
      return this;
    };
  }

  ModelCtor._store = store;
  ModelCtor._unique = []; // each entry: array of field names forming a unique key

  ModelCtor.findOne = function (query = {}) {
    const match = store.find(r =>
      Object.entries(query).every(([k, v]) => {
        if (v === null) return r[k] === null || r[k] === undefined;
        return String(r[k]) === String(v);
      })
    );
    const chain = {
      lean: async () => (match ? { ...match } : null),
    };
    return chain;
  };

  ModelCtor.findById = function (id) {
    const hit = store.find(r => String(r._id) === String(id));
    if (!hit) {
      // Thenable wrapper resolving to null — wrapper has .then,
      // its resolved value (null) does NOT have .then, so the
      // Promise machinery does not recurse.
      return {
        lean: async () => null,
        then: resolve => resolve(null),
      };
    }
    // Build a mongoose-like instance. IMPORTANT: do NOT add .then
    // to `inst` itself — if both the wrapper and the resolved value
    // are thenable, awaiting cascades into infinite recursion.
    const inst = new ModelCtor({ ...hit, _existing: true });
    inst._id = hit._id;
    return {
      lean: async () => ({ ...hit }),
      then: resolve => resolve(inst),
    };
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r =>
      Object.entries(query).every(([k, v]) => {
        if (v === null) return r[k] === null || r[k] === undefined;
        if (v && typeof v === 'object' && '$lt' in v) {
          if (r[k] === null || r[k] === undefined) return false;
          return new Date(r[k]) < new Date(v.$lt);
        }
        if (v && typeof v === 'object' && '$gte' in v) {
          if (r[k] === null || r[k] === undefined) return false;
          return new Date(r[k]) >= new Date(v.$gte);
        }
        return String(r[k]) === String(v);
      })
    );
    if (query.$or) {
      matches = store.filter(r => {
        // AND outside $or
        const baseMatches = Object.entries(query)
          .filter(([k]) => k !== '$or')
          .every(([k, v]) => {
            if (v === null) return r[k] === null || r[k] === undefined;
            return String(r[k]) === String(v);
          });
        if (!baseMatches) return false;
        return query.$or.some(cond =>
          Object.entries(cond).every(([k, v]) => {
            if (v === null) return r[k] === null || r[k] === undefined;
            if (v && typeof v === 'object' && '$lt' in v) {
              if (r[k] === null || r[k] === undefined) return false;
              return new Date(r[k]) < new Date(v.$lt);
            }
            return String(r[k]) === String(v);
          })
        );
      });
    }
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = a[key];
          const bv = b[key];
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return chain;
      },
      skip(n) {
        matches = matches.slice(n);
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      select() {
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: resolve => resolve(matches.map(r => ({ ...r }))),
    };
    return chain;
  };

  ModelCtor.countDocuments = async function (query = {}) {
    return store.filter(r =>
      Object.entries(query).every(([k, v]) => {
        if (v === null) return r[k] === null || r[k] === undefined;
        return String(r[k]) === String(v);
      })
    ).length;
  };

  ModelCtor.updateOne = async function (query, update) {
    const target = store.find(r =>
      Object.entries(query).every(([k, v]) => String(r[k]) === String(v))
    );
    if (target && update.$set) Object.assign(target, update.$set);
    return { acknowledged: true };
  };

  return ModelCtor;
}

// Build the four models with their respective invariants.

function buildDeviceModel() {
  const M = buildModel({
    invariants() {
      if (this.kind === reg.DEVICE_KIND.TERMINAL) {
        const ids = new Set([reg.CAPABILITY.FACE, reg.CAPABILITY.FINGERPRINT, reg.CAPABILITY.CARD]);
        const has = Array.isArray(this.capabilities) && this.capabilities.some(c => ids.has(c));
        if (!has) this.invalidate('capabilities', 'terminal needs id capability');
      }
      if (
        this.kind === reg.DEVICE_KIND.CAMERA &&
        this.enrollmentRole !== reg.ENROLLMENT_ROLE.SURVEILLANCE_ONLY
      ) {
        if (!Array.isArray(this.capabilities) || !this.capabilities.includes(reg.CAPABILITY.FACE)) {
          this.invalidate('capabilities', 'camera needs face capability');
        }
      }
      if (
        this.kind === reg.DEVICE_KIND.NVR &&
        this.enrollmentRole !== reg.ENROLLMENT_ROLE.SURVEILLANCE_ONLY
      ) {
        this.invalidate('enrollmentRole', 'NVR must be surveillance-only');
      }
      if (this.ip && !this.ip.includes(':') && !reg.isValidIPv4(this.ip)) {
        this.invalidate('ip', 'invalid IPv4');
      }
      if (this.retiredAt && !this.retiredReason) {
        this.invalidate('retiredReason', 'reason required');
      }
    },
  });
  M._unique = [['deviceCode']];
  return M;
}

function buildChannelModel() {
  const M = buildModel({
    invariants() {
      if (this.attendanceEligible && this.recognitionMode === reg.RECOGNITION_MODE.SURVEILLANCE) {
        this.invalidate('recognitionMode', 'cannot be surveillance');
      }
    },
  });
  M._unique = [['deviceId', 'channelNo']];
  return M;
}

function buildRawEventModel() {
  const M = buildModel();
  M._unique = [['deviceId', 'externalEventId']];
  return M;
}

function buildHealthLogModel() {
  return buildModel();
}

// ─── 1. Registry helpers ───────────────────────────────────────

describe('hikvision.registry — helpers', () => {
  test('isValidIPv4 accepts standard IPv4 and rejects garbage', () => {
    expect(reg.isValidIPv4('192.168.1.1')).toBe(true);
    expect(reg.isValidIPv4('10.0.0.255')).toBe(true);
    expect(reg.isValidIPv4('256.0.0.1')).toBe(false);
    expect(reg.isValidIPv4('1.2.3')).toBe(false);
    expect(reg.isValidIPv4('not-an-ip')).toBe(false);
    expect(reg.isValidIPv4('')).toBe(false);
    expect(reg.isValidIPv4(null)).toBe(false);
  });

  test('isAttendanceEligibleKind covers exactly the three attendance kinds', () => {
    expect(reg.isAttendanceEligibleKind(reg.RAW_EVENT_KIND.FACE_MATCH)).toBe(true);
    expect(reg.isAttendanceEligibleKind(reg.RAW_EVENT_KIND.FINGERPRINT)).toBe(true);
    expect(reg.isAttendanceEligibleKind(reg.RAW_EVENT_KIND.CARD)).toBe(true);
    expect(reg.isAttendanceEligibleKind(reg.RAW_EVENT_KIND.UNREGISTERED_FACE)).toBe(false);
    expect(reg.isAttendanceEligibleKind(reg.RAW_EVENT_KIND.SPOOF_ATTEMPT)).toBe(false);
    expect(reg.isAttendanceEligibleKind(reg.RAW_EVENT_KIND.UNKNOWN)).toBe(false);
  });

  test('classifyHealth — fresh heartbeat → online', () => {
    const now = Date.now();
    expect(
      reg.classifyHealth({
        lastHeartbeatAt: new Date(now - 1000),
        timeOffsetMs: 0,
        now,
      })
    ).toBe(reg.DEVICE_STATUS.ONLINE);
  });

  test('classifyHealth — heartbeat between stale and offline windows → degraded', () => {
    const now = Date.now();
    const ageMs =
      (reg.DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_STALE_MS +
        reg.DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_OFFLINE_MS) /
      2;
    expect(
      reg.classifyHealth({
        lastHeartbeatAt: new Date(now - ageMs),
        timeOffsetMs: 0,
        now,
      })
    ).toBe(reg.DEVICE_STATUS.DEGRADED);
  });

  test('classifyHealth — heartbeat older than offline window → offline', () => {
    const now = Date.now();
    expect(
      reg.classifyHealth({
        lastHeartbeatAt: new Date(now - reg.DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_OFFLINE_MS - 1),
        timeOffsetMs: 0,
        now,
      })
    ).toBe(reg.DEVICE_STATUS.OFFLINE);
  });

  test('classifyHealth — fresh heartbeat but drift exceeds limit → degraded', () => {
    const now = Date.now();
    expect(
      reg.classifyHealth({
        lastHeartbeatAt: new Date(now - 1000),
        timeOffsetMs: reg.DEFAULT_CONFIDENCE_THRESHOLDS.TIME_DRIFT_MAX_MS + 1000,
        now,
      })
    ).toBe(reg.DEVICE_STATUS.DEGRADED);
  });

  test('classifyHealth — never seen → offline', () => {
    expect(reg.classifyHealth({ lastHeartbeatAt: null })).toBe(reg.DEVICE_STATUS.OFFLINE);
  });
});

// ─── 2. Device service guards ─────────────────────────────────

describe('hikvision-device.service — registerDevice guards', () => {
  function newSvc() {
    return createHikvisionDeviceService({
      deviceModel: buildDeviceModel(),
      channelModel: buildChannelModel(),
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
  }

  const baseTerminal = {
    deviceCode: 'TRM-001',
    kind: reg.DEVICE_KIND.TERMINAL,
    branchId: 'branch-1',
    ip: '192.168.1.10',
    capabilities: [reg.CAPABILITY.FACE],
  };

  test('happy path — terminal with face → status provisioning', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice(baseTerminal);
    expect(r.ok).toBe(true);
    expect(r.device.deviceCode).toBe('TRM-001');
    expect(r.device.status).toBe(reg.DEVICE_STATUS.PROVISIONING);
  });

  test('missing deviceCode → DEVICE_CODE_REQUIRED', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({ ...baseTerminal, deviceCode: '' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.DEVICE_CODE_REQUIRED);
  });

  test('invalid kind → INVALID_DEVICE_KIND', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({ ...baseTerminal, kind: 'tablet' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.INVALID_DEVICE_KIND);
  });

  test('missing branchId → BRANCH_REQUIRED', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({ ...baseTerminal, branchId: null });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.BRANCH_REQUIRED);
  });

  test('malformed IPv4 → IP_INVALID', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({ ...baseTerminal, ip: '999.0.0.1' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.IP_INVALID);
  });

  test('empty capabilities → CAPABILITIES_REQUIRED', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({ ...baseTerminal, capabilities: [] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.CAPABILITIES_REQUIRED);
  });

  test('terminal with only "card" → invariant trips and returns VALIDATION_FAILED + errors.capabilities', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({
      ...baseTerminal,
      capabilities: [reg.CAPABILITY.TEMPERATURE], // not an id capability
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
    expect(r.errors).toHaveProperty('capabilities');
  });

  test('camera primary without face → VALIDATION_FAILED', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({
      deviceCode: 'CAM-1',
      kind: reg.DEVICE_KIND.CAMERA,
      branchId: 'branch-1',
      ip: '10.0.0.1',
      capabilities: [reg.CAPABILITY.LPR],
      enrollmentRole: reg.ENROLLMENT_ROLE.PRIMARY,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('NVR with primary role → VALIDATION_FAILED (must be surveillance-only)', async () => {
    const svc = newSvc();
    const r = await svc.registerDevice({
      deviceCode: 'NVR-1',
      kind: reg.DEVICE_KIND.NVR,
      branchId: 'branch-1',
      ip: '10.0.0.5',
      capabilities: [reg.CAPABILITY.FACE],
      enrollmentRole: reg.ENROLLMENT_ROLE.PRIMARY,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('duplicate deviceCode → DEVICE_CODE_TAKEN', async () => {
    const svc = newSvc();
    const a = await svc.registerDevice(baseTerminal);
    expect(a.ok).toBe(true);
    const b = await svc.registerDevice(baseTerminal);
    expect(b.ok).toBe(false);
    expect(b.reason).toBe(reg.REASON.DEVICE_CODE_TAKEN);
  });

  test('retireDevice requires reason; status flips to retired', async () => {
    const svc = newSvc();
    const a = await svc.registerDevice(baseTerminal);
    const noReason = await svc.retireDevice(a.device._id, '');
    expect(noReason.ok).toBe(false);
    expect(noReason.reason).toBe(reg.REASON.VALIDATION_FAILED);

    const ok = await svc.retireDevice(a.device._id, 'end of lease');
    expect(ok.ok).toBe(true);
    expect(ok.device.status).toBe(reg.DEVICE_STATUS.RETIRED);
    expect(ok.device.retiredAt).toBeTruthy();
  });
});

// ─── 3. Channel service cross-checks ──────────────────────────

describe('hikvision-device.service — channel cross-checks', () => {
  test('attendanceEligible channel on camera without face capability → ATTENDANCE_REQUIRES_FACE', async () => {
    const deviceModel = buildDeviceModel();
    const channelModel = buildChannelModel();
    const svc = createHikvisionDeviceService({
      deviceModel,
      channelModel,
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    // Pre-seed a camera without face — surveillance-only role, so
    // the device-level invariant doesn't trip.
    const cam = await svc.registerDevice({
      deviceCode: 'CAM-X',
      kind: reg.DEVICE_KIND.CAMERA,
      branchId: 'branch-1',
      ip: '10.0.0.2',
      capabilities: [reg.CAPABILITY.LPR],
      enrollmentRole: reg.ENROLLMENT_ROLE.SURVEILLANCE_ONLY,
    });
    expect(cam.ok).toBe(true);

    const r = await svc.registerChannel({
      deviceId: cam.device._id,
      channelNo: 1,
      zoneId: 'gate-A',
      attendanceEligible: true,
      recognitionMode: reg.RECOGNITION_MODE.FACE,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.ATTENDANCE_REQUIRES_FACE);
  });

  test('attendanceEligible + surveillance recognitionMode → VALIDATION_FAILED (channel invariant)', async () => {
    const deviceModel = buildDeviceModel();
    const channelModel = buildChannelModel();
    const svc = createHikvisionDeviceService({
      deviceModel,
      channelModel,
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    const cam = await svc.registerDevice({
      deviceCode: 'CAM-Y',
      kind: reg.DEVICE_KIND.CAMERA,
      branchId: 'branch-1',
      ip: '10.0.0.3',
      capabilities: [reg.CAPABILITY.FACE],
      enrollmentRole: reg.ENROLLMENT_ROLE.PRIMARY,
    });
    const r = await svc.registerChannel({
      deviceId: cam.device._id,
      channelNo: 2,
      zoneId: 'gate-B',
      attendanceEligible: true,
      recognitionMode: reg.RECOGNITION_MODE.SURVEILLANCE,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });
});

// ─── 4. Event ingestion idempotency ───────────────────────────

describe('hikvision-event-ingestion.service — idempotency', () => {
  async function setup() {
    const deviceModel = buildDeviceModel();
    const channelModel = buildChannelModel();
    const rawEventModel = buildRawEventModel();
    const dsvc = createHikvisionDeviceService({
      deviceModel,
      channelModel,
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    const isvc = createHikvisionEventIngestionService({
      deviceModel,
      channelModel,
      rawEventModel,
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    const dev = await dsvc.registerDevice({
      deviceCode: 'TRM-EVT',
      kind: reg.DEVICE_KIND.TERMINAL,
      branchId: 'branch-1',
      ip: '192.168.1.20',
      capabilities: [reg.CAPABILITY.FACE, reg.CAPABILITY.FINGERPRINT],
    });
    return { isvc, dev };
  }

  test('ingest unknown deviceCode → EVENT_DEVICE_UNKNOWN', async () => {
    const { isvc } = await setup();
    const r = await isvc.ingest({
      deviceCode: 'NOPE',
      externalEventId: 'e-1',
      eventKind: reg.RAW_EVENT_KIND.FACE_MATCH,
      rawPayload: { hit: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_DEVICE_UNKNOWN);
  });

  test('missing payload → EVENT_PAYLOAD_REQUIRED', async () => {
    const { isvc } = await setup();
    const r = await isvc.ingest({
      deviceCode: 'TRM-EVT',
      externalEventId: 'e-2',
      eventKind: reg.RAW_EVENT_KIND.FACE_MATCH,
      rawPayload: null,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_PAYLOAD_REQUIRED);
  });

  test('first ingest → ok + parseStatus pending; replay → ok + duplicate:true', async () => {
    const { isvc } = await setup();
    const first = await isvc.ingest({
      deviceCode: 'TRM-EVT',
      externalEventId: 'e-DUP',
      eventKind: reg.RAW_EVENT_KIND.FACE_MATCH,
      capturedAt: new Date(),
      rawPayload: { score: 92 },
    });
    expect(first.ok).toBe(true);
    expect(first.duplicate).toBeFalsy();
    expect(first.event.parseStatus).toBe(reg.PARSE_STATUS.PENDING);

    const replay = await isvc.ingest({
      deviceCode: 'TRM-EVT',
      externalEventId: 'e-DUP',
      eventKind: reg.RAW_EVENT_KIND.FACE_MATCH,
      capturedAt: new Date(),
      rawPayload: { score: 92 },
    });
    expect(replay.ok).toBe(true);
    expect(replay.duplicate).toBe(true);
    expect(String(replay.event._id)).toBe(String(first.event._id));
  });

  test('unknown event kind is stored as UNKNOWN (forward-compat)', async () => {
    const { isvc } = await setup();
    const r = await isvc.ingest({
      deviceCode: 'TRM-EVT',
      externalEventId: 'e-fwd',
      eventKind: 'some-future-kind',
      capturedAt: new Date(),
      rawPayload: { ok: 1 },
    });
    expect(r.ok).toBe(true);
    expect(r.event.eventKind).toBe(reg.RAW_EVENT_KIND.UNKNOWN);
  });
});

// ─── 5 + 6. Health service ─────────────────────────────────────

describe('hikvision-health.service', () => {
  async function setup() {
    const deviceModel = buildDeviceModel();
    const healthLogModel = buildHealthLogModel();
    const dsvc = createHikvisionDeviceService({
      deviceModel,
      channelModel: buildChannelModel(),
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    const hsvc = createHikvisionHealthService({
      deviceModel,
      healthLogModel,
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    const dev = await dsvc.registerDevice({
      deviceCode: 'TRM-HB',
      kind: reg.DEVICE_KIND.TERMINAL,
      branchId: 'branch-1',
      ip: '192.168.1.30',
      capabilities: [reg.CAPABILITY.FACE],
    });
    return { hsvc, dev, deviceModel, healthLogModel };
  }

  test('recordHeartbeat with fresh capturedAt → device.status=online, log written', async () => {
    const { hsvc, dev, healthLogModel } = await setup();
    const r = await hsvc.recordHeartbeat({
      deviceId: dev.device._id,
      capturedAt: new Date(),
    });
    expect(r.ok).toBe(true);
    expect(r.device.status).toBe(reg.DEVICE_STATUS.ONLINE);
    expect(healthLogModel._store.length).toBe(1);
  });

  test('recordHeartbeat with drift exceeding threshold → status=degraded + drift alert', async () => {
    const { hsvc, dev } = await setup();
    const driftMs = reg.DEFAULT_CONFIDENCE_THRESHOLDS.TIME_DRIFT_MAX_MS + 5000;
    const r = await hsvc.recordHeartbeat({
      deviceId: dev.device._id,
      capturedAt: new Date(Date.now() + driftMs),
    });
    expect(r.ok).toBe(true);
    expect(r.device.status).toBe(reg.DEVICE_STATUS.DEGRADED);
    expect(r.log.alerts.some(a => a.kind === 'time-drift')).toBe(true);
  });

  test('sweepStaleDevices demotes a device whose lastHeartbeatAt is older than offline window', async () => {
    const { hsvc, dev, deviceModel } = await setup();
    // Force the stored device's heartbeat into the offline window
    const stored = deviceModel._store.find(d => String(d._id) === String(dev.device._id));
    stored.lastHeartbeatAt = new Date(
      Date.now() - reg.DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_OFFLINE_MS - 60_000
    );
    stored.status = reg.DEVICE_STATUS.ONLINE; // pretend it was online before

    const res = await hsvc.sweepStaleDevices();
    expect(res.ok).toBe(true);
    expect(res.demoted).toBe(1);
    expect(res.demotedIds).toContain(String(dev.device._id));

    const after = deviceModel._store.find(d => String(d._id) === String(dev.device._id));
    expect(after.status).toBe(reg.DEVICE_STATUS.OFFLINE);
  });

  test('getBranchSummary reports counts and uptimeRatio', async () => {
    const deviceModel = buildDeviceModel();
    const healthLogModel = buildHealthLogModel();
    const dsvc = createHikvisionDeviceService({
      deviceModel,
      channelModel: buildChannelModel(),
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });
    const hsvc = createHikvisionHealthService({
      deviceModel,
      healthLogModel,
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    });

    // Two online, one offline, one retired
    const a = await dsvc.registerDevice({
      deviceCode: 'A',
      kind: reg.DEVICE_KIND.TERMINAL,
      branchId: 'branch-Z',
      ip: '10.0.0.1',
      capabilities: [reg.CAPABILITY.FACE],
    });
    const b = await dsvc.registerDevice({
      deviceCode: 'B',
      kind: reg.DEVICE_KIND.TERMINAL,
      branchId: 'branch-Z',
      ip: '10.0.0.2',
      capabilities: [reg.CAPABILITY.FACE],
    });
    const c = await dsvc.registerDevice({
      deviceCode: 'C',
      kind: reg.DEVICE_KIND.TERMINAL,
      branchId: 'branch-Z',
      ip: '10.0.0.3',
      capabilities: [reg.CAPABILITY.FACE],
    });
    const d = await dsvc.registerDevice({
      deviceCode: 'D',
      kind: reg.DEVICE_KIND.TERMINAL,
      branchId: 'branch-Z',
      ip: '10.0.0.4',
      capabilities: [reg.CAPABILITY.FACE],
    });
    deviceModel._store.find(x => String(x._id) === String(a.device._id)).status =
      reg.DEVICE_STATUS.ONLINE;
    deviceModel._store.find(x => String(x._id) === String(b.device._id)).status =
      reg.DEVICE_STATUS.ONLINE;
    deviceModel._store.find(x => String(x._id) === String(c.device._id)).status =
      reg.DEVICE_STATUS.OFFLINE;
    await dsvc.retireDevice(d.device._id, 'sold');

    const s = await hsvc.getBranchSummary('branch-Z');
    expect(s.ok).toBe(true);
    expect(s.totals.total).toBe(3); // retired excluded
    expect(s.totals.onlineCount).toBe(2);
    expect(s.totals.offlineCount).toBe(1);
    expect(s.totals.uptimeRatio).toBeCloseTo(2 / 3, 3);
  });
});
