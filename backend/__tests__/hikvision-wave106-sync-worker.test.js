/**
 * hikvision-wave106-sync-worker.test.js — Wave 106 Phase F.
 *
 * Unit tests for the ISAPI sync worker layer.
 *
 * Sections:
 *   1. Registry pure helpers — computeSyncDiff (push/delete/verify split)
 *   2. Mock adapter — listPersonIds / pushPerson / deletePerson / ping
 *      idempotency + error injection
 *   3. Sync worker — happy path (push pending → active, mark synced)
 *   4. Sync worker — diff with mixed (push + delete + verify)
 *   5. Sync worker — device unreachable → result=FAILED
 *   6. Sync worker — partial failure (some pushes fail) → result=PARTIAL
 *   7. Sync worker — skipped cases (archived library, retired device,
 *      device not subscribed)
 *   8. Sync worker — library fan-out
 *   9. Drift detection — stored hash != current hash → hasDrift=true
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const { createMockIsapiAdapter } = require('../intelligence/hikvision-isapi-adapter');
const { createHikvisionSyncWorker } = require('../intelligence/hikvision-sync-worker.service');
const {
  createHikvisionFaceLibraryService,
} = require('../intelligence/hikvision-face-library.service');
const {
  createHikvisionFaceEnrollmentService,
} = require('../intelligence/hikvision-face-enrollment.service');

// ─── Chainable mock builder (Phase 2 superset) ─────────────────

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
        if (ModelCtor._partialUnique) {
          for (const { fields, predicate } of ModelCtor._partialUnique) {
            if (!predicate(this)) continue;
            const conflict = store.find(
              r => fields.every(f => String(r[f]) === String(this[f])) && predicate(r)
            );
            if (conflict) {
              const err = new Error('E11000 partial conflict');
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
  ModelCtor._unique = [];
  ModelCtor._partialUnique = [];

  ModelCtor.findOne = function (query = {}) {
    const match = store.find(r => _matches(r, query));
    return { lean: async () => (match ? { ...match } : null) };
  };

  ModelCtor.findById = function (id) {
    const hit = store.find(r => String(r._id) === String(id));
    if (!hit) return { lean: async () => null, then: resolve => resolve(null) };
    const inst = new ModelCtor({ ...hit, _existing: true });
    inst._id = hit._id;
    return { lean: async () => ({ ...hit }), then: resolve => resolve(inst) };
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r => _matches(r, query));
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = a[key],
            bv = b[key];
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
      then: resolve =>
        resolve(
          matches.map(r => {
            const inst = new ModelCtor({ ...r, _existing: true });
            inst._id = r._id;
            return inst;
          })
        ),
    };
    return chain;
  };

  ModelCtor.countDocuments = async function (query = {}) {
    return store.filter(r => _matches(r, query)).length;
  };

  ModelCtor.updateOne = async function (query, update) {
    const t = store.find(r => _matches(r, query));
    if (t && update.$set) Object.assign(t, update.$set);
    return { acknowledged: true, modifiedCount: t ? 1 : 0 };
  };

  ModelCtor.updateMany = async function (query, update) {
    const matches = store.filter(r => _matches(r, query));
    if (update.$set) for (const r of matches) Object.assign(r, update.$set);
    return { acknowledged: true, modifiedCount: matches.length };
  };

  return ModelCtor;
}

function _matches(row, query) {
  for (const [k, v] of Object.entries(query)) {
    if (v === null) {
      if (row[k] !== null && row[k] !== undefined) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$in' in v) {
      if (!v.$in.some(x => String(row[k]) === String(x))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$ne' in v) {
      if (String(row[k]) === String(v.$ne)) return false;
      continue;
    }
    if (String(row[k]) !== String(v)) return false;
  }
  return true;
}

// Build the specific models with their invariants

function buildLibraryModel() {
  return buildModel();
}

function buildTemplateModel() {
  const M = buildModel({
    invariants() {
      if (this.status === reg.TEMPLATE_STATUS.ACTIVE) {
        if (!this.hikvisionPersonId) {
          this.invalidate('hikvisionPersonId', 'active needs personId');
        }
        if (!this.templateChecksum) {
          this.invalidate('templateChecksum', 'active needs checksum');
        }
      }
      if (
        Array.isArray(this.enrollmentImages) &&
        !this.enrollmentImages.some(i => i.angle === reg.IMAGE_ANGLE.FRONT)
      ) {
        this.invalidate('enrollmentImages', 'front required');
      }
      if (
        (this.status === reg.TEMPLATE_STATUS.SUSPENDED ||
          this.status === reg.TEMPLATE_STATUS.DELETED) &&
        !this.deactivationReason
      ) {
        this.invalidate('deactivationReason', 'required');
      }
    },
  });
  M._partialUnique = [
    {
      fields: ['libraryId', 'employeeId'],
      predicate: r =>
        r.status === reg.TEMPLATE_STATUS.PENDING ||
        r.status === reg.TEMPLATE_STATUS.ACTIVE ||
        r.status === reg.TEMPLATE_STATUS.SUSPENDED,
    },
  ];
  return M;
}

function buildDeviceModel() {
  return buildModel();
}

const SILENT = { error: () => {}, warn: () => {}, info: () => {} };

// ═══ 1. Registry pure helpers ══════════════════════════════════

describe('hikvision.registry — Phase F helpers', () => {
  test('computeSyncDiff — empty inputs', () => {
    const d = reg.computeSyncDiff([], []);
    expect(d.toPush).toHaveLength(0);
    expect(d.toDelete).toHaveLength(0);
    expect(d.toVerify).toHaveLength(0);
  });

  test('computeSyncDiff — pending template without personId → push', () => {
    const tpl = { _id: 't1', status: reg.TEMPLATE_STATUS.PENDING, hikvisionPersonId: null };
    const d = reg.computeSyncDiff([tpl], []);
    expect(d.toPush).toHaveLength(1);
    expect(d.toPush[0].template._id).toBe('t1');
    expect(d.toDelete).toHaveLength(0);
    expect(d.toVerify).toHaveLength(0);
  });

  test('computeSyncDiff — active with personId already on device → verify', () => {
    const tpl = {
      _id: 't1',
      status: reg.TEMPLATE_STATUS.ACTIVE,
      hikvisionPersonId: 'pid-1',
    };
    const d = reg.computeSyncDiff([tpl], ['pid-1']);
    expect(d.toVerify).toHaveLength(1);
    expect(d.toPush).toHaveLength(0);
    expect(d.toDelete).toHaveLength(0);
  });

  test('computeSyncDiff — active in DB but missing from device → push (re-push)', () => {
    const tpl = {
      _id: 't1',
      status: reg.TEMPLATE_STATUS.ACTIVE,
      hikvisionPersonId: 'pid-1',
    };
    const d = reg.computeSyncDiff([tpl], []); // device doesn't have it
    expect(d.toPush).toHaveLength(1);
    expect(d.toDelete).toHaveLength(0);
  });

  test('computeSyncDiff — personId on device with no DB claim → delete', () => {
    const tpl = {
      _id: 't1',
      status: reg.TEMPLATE_STATUS.ACTIVE,
      hikvisionPersonId: 'pid-1',
    };
    const d = reg.computeSyncDiff([tpl], ['pid-1', 'orphan-pid']);
    expect(d.toDelete).toEqual([{ personId: 'orphan-pid', op: reg.DIFF_OPERATION.DELETE }]);
  });

  test('computeSyncDiff — suspended template ignored (not in active+pending)', () => {
    const tpl = {
      _id: 't1',
      status: reg.TEMPLATE_STATUS.SUSPENDED,
      hikvisionPersonId: 'pid-S',
    };
    const d = reg.computeSyncDiff([tpl], ['pid-S']);
    // tpl ignored; pid-S on device but no active DB → must delete
    expect(d.toDelete).toHaveLength(1);
    expect(d.toPush).toHaveLength(0);
    expect(d.toVerify).toHaveLength(0);
  });
});

// ═══ 2. Mock adapter ═══════════════════════════════════════════

describe('hikvision-isapi-adapter — mock', () => {
  test('listPersonIds — empty initially', async () => {
    const a = createMockIsapiAdapter();
    expect(await a.listPersonIds({ deviceCode: 'X' })).toEqual([]);
  });

  test('pushPerson + listPersonIds round-trip', async () => {
    const a = createMockIsapiAdapter();
    const r = await a.pushPerson(
      { deviceCode: 'X' },
      { templateId: 't1', employeeRef: 'e1', images: [{ angle: 'front', ref: 'a' }] }
    );
    expect(r.personId).toMatch(/^mock-pid-/);
    expect(r.checksum).toBeTruthy();
    const list = await a.listPersonIds({ deviceCode: 'X' });
    expect(list).toContain(r.personId);
  });

  test('pushPerson — deterministic personId for same templateId', async () => {
    const a = createMockIsapiAdapter();
    const r1 = await a.pushPerson(
      { deviceCode: 'X' },
      { templateId: 't1', employeeRef: 'e1', images: [{ angle: 'front', ref: 'a' }] }
    );
    const r2 = await a.pushPerson(
      { deviceCode: 'X' },
      { templateId: 't1', employeeRef: 'e1', images: [{ angle: 'front', ref: 'a' }] }
    );
    expect(r2.personId).toBe(r1.personId);
  });

  test('deletePerson — idempotent on missing personId', async () => {
    const a = createMockIsapiAdapter();
    const r = await a.deletePerson({ deviceCode: 'X' }, 'nonexistent');
    expect(r.ok).toBe(true);
    expect(r.alreadyAbsent).toBe(true);
  });

  test('error injection — pushPerson fails for configured device', async () => {
    const a = createMockIsapiAdapter({
      failures: { byDevice: { 'BAD-X': { pushPerson: 'unreachable' } } },
    });
    await expect(
      a.pushPerson(
        { deviceCode: 'BAD-X' },
        { templateId: 't', employeeRef: 'e', images: [{ angle: 'front', ref: 'a' }] }
      )
    ).rejects.toThrow(/BAD-X/);
  });

  test('ping — happy path returns latency', async () => {
    const a = createMockIsapiAdapter();
    const r = await a.ping({ deviceCode: 'X' });
    expect(r.ok).toBe(true);
    expect(typeof r.latencyMs).toBe('number');
  });
});

// ═══ 3-8. Sync worker ══════════════════════════════════════════

function buildScenario({ failures = null } = {}) {
  const libraryModel = buildLibraryModel();
  const templateModel = buildTemplateModel();
  const deviceModel = buildDeviceModel();

  const libSvc = createHikvisionFaceLibraryService({
    libraryModel,
    templateModel,
    deviceModel,
    logger: SILENT,
  });
  const enrSvc = createHikvisionFaceEnrollmentService({
    templateModel,
    libraryModel,
    logger: SILENT,
  });
  const adapter = createMockIsapiAdapter({ failures });
  const worker = createHikvisionSyncWorker({
    libraryService: libSvc,
    enrollmentService: enrSvc,
    deviceModel,
    templateModel,
    libraryModel,
    isapiAdapter: adapter,
    logger: SILENT,
  });

  return {
    worker,
    libSvc,
    enrSvc,
    adapter,
    libraryModel,
    templateModel,
    deviceModel,
  };
}

async function seedDevice(s, { id, deviceCode, branchId = 'br-1' } = {}) {
  const dev = {
    _id: id || 'dev-1',
    deviceCode: deviceCode || 'TRM-001',
    kind: 'terminal',
    branchId,
    capabilities: ['face'],
    retiredAt: null,
    ip: '192.168.1.10',
    port: 80,
    protocol: 'isapi',
    authMode: 'digest',
    enrollmentRole: 'primary',
    status: 'online',
  };
  s.deviceModel._store.push(dev);
  return dev;
}

async function seedLibraryWithDevice(s, deviceId) {
  const r = await s.libSvc.createLibrary({
    libraryCode: 'LIB-A',
    name: 'A',
    branchId: 'br-1',
    capacity: 100,
  });
  const lib = r.library;
  // Subscribe directly via the store (bypass eligibility checks for test speed)
  const stored = s.libraryModel._store.find(l => String(l._id) === String(lib._id));
  stored.devicesSubscribed = [deviceId];
  return stored;
}

describe('hikvision-sync-worker — happy path', () => {
  test('pending template → push → confirmed active + lastSyncedAt set', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);

    const enr = await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-1',
      images: [
        { angle: 'front', quality: 85, ref: 's3://a' },
        { angle: 'left', quality: 80, ref: 's3://b' },
      ],
      actor: { userId: 'hr' },
    });
    expect(enr.ok).toBe(true);
    expect(enr.template.status).toBe(reg.TEMPLATE_STATUS.PENDING);

    const result = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(result.ok).toBe(true);
    expect(result.result).toBe(reg.SYNC_RESULT.SUCCESS);
    expect(result.pushed).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.newIntegrityHash).toMatch(/^[a-f0-9]{64}$/);

    // Template should now be active
    const stored = s.templateModel._store.find(t => t.employeeId === 'emp-1');
    expect(stored.status).toBe(reg.TEMPLATE_STATUS.ACTIVE);
    expect(stored.hikvisionPersonId).toMatch(/^mock-pid-/);
    expect(stored.lastSyncedAt).toBeTruthy();

    // Device should hold the personId
    const onDevice = await s.adapter.listPersonIds(dev);
    expect(onDevice).toContain(stored.hikvisionPersonId);
  });

  test('second sync → NO_OP (idempotent)', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);
    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-1',
      images: [{ angle: 'front', quality: 85, ref: 's3://a' }],
      actor: { userId: 'hr' },
    });

    await s.worker.syncLibraryToDevice(lib._id, dev._id);
    const r2 = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(r2.result).toBe(reg.SYNC_RESULT.NO_OP);
    expect(r2.verified).toBe(1);
    expect(r2.pushed).toBe(0);
  });
});

describe('hikvision-sync-worker — diff scenarios', () => {
  test('mixed: 1 push (new pending) + 1 delete (orphan on device) + 1 verify (already in sync)', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);

    // Seed device with orphan personId
    s.adapter._seedDevice(dev.deviceCode, [{ personId: 'orphan-pid' }]);

    // Existing active template with matching device personId
    const activeTpl = {
      _id: 'tpl-A',
      libraryId: lib._id,
      employeeId: 'emp-A',
      status: reg.TEMPLATE_STATUS.ACTIVE,
      hikvisionPersonId: 'mock-pid-active',
      templateChecksum: 'sumA',
      enrollmentImages: [{ angle: 'front', quality: 85, ref: 's3://A' }],
      enrolledAt: new Date(),
    };
    s.templateModel._store.push(activeTpl);
    s.adapter._seedDevice(dev.deviceCode, [{ personId: 'mock-pid-active' }]);

    // New pending template
    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-B',
      images: [{ angle: 'front', quality: 85, ref: 's3://B' }],
      actor: { userId: 'hr' },
    });

    const r = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(r.ok).toBe(true);
    expect(r.pushed).toBe(1);
    expect(r.deleted).toBe(1);
    expect(r.verified).toBe(1);
  });
});

describe('hikvision-sync-worker — failure handling', () => {
  test('device unreachable → result=FAILED', async () => {
    const s = buildScenario({
      failures: { byDevice: { 'TRM-X': { ping: 'unreachable' } } },
    });
    const dev = await seedDevice(s, { id: 'dev-x', deviceCode: 'TRM-X' });
    const lib = await seedLibraryWithDevice(s, dev._id);

    const r = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(r.ok).toBe(false);
    expect(r.result).toBe(reg.SYNC_RESULT.FAILED);
    expect(r.errors[0].kind).toBe('unreachable');
  });

  test('partial push failure → result=PARTIAL + per-template lastSyncError', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);

    // Wrap adapter to ALWAYS fail pushPerson for emp-2 (across all retries).
    // We match on employeeRef in the payload — emp-2's pushes will fail
    // every attempt; emp-1's push will succeed first try.
    const origPush = s.adapter.pushPerson;
    s.adapter.pushPerson = async (deviceContext, payload) => {
      if (String(payload.employeeRef) === 'emp-2') {
        const err = new Error('simulated push failure for emp-2');
        throw err;
      }
      return origPush(deviceContext, payload);
    };

    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-1',
      images: [{ angle: 'front', quality: 85, ref: 's3://a' }],
      actor: { userId: 'hr' },
    });
    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-2',
      images: [{ angle: 'front', quality: 85, ref: 's3://b' }],
      actor: { userId: 'hr' },
    });

    const r = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(r.result).toBe(reg.SYNC_RESULT.PARTIAL);
    expect(r.pushed).toBe(1);
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
    expect(r.errors.some(e => e.kind === 'push-failed')).toBe(true);

    // The failed template should still be pending with lastSyncError set
    const failedTpl = s.templateModel._store.find(t => t.employeeId === 'emp-2');
    expect(failedTpl.status).toBe(reg.TEMPLATE_STATUS.PENDING);
    expect(failedTpl.lastSyncError).toBeTruthy();
  }, 30_000);
});

describe('hikvision-sync-worker — skipped scenarios', () => {
  test('archived library → SKIPPED', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);
    // Archive directly on store
    const stored = s.libraryModel._store.find(l => String(l._id) === String(lib._id));
    stored.status = reg.LIBRARY_STATUS.ARCHIVED;

    const r = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(r.result).toBe(reg.SYNC_RESULT.SKIPPED);
    expect(r.errors[0].kind).toBe('library-archived');
  });

  test('retired device → SKIPPED', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);
    const stored = s.deviceModel._store.find(d => String(d._id) === String(dev._id));
    stored.retiredAt = new Date();

    const r = await s.worker.syncLibraryToDevice(lib._id, dev._id);
    expect(r.result).toBe(reg.SYNC_RESULT.SKIPPED);
    expect(r.errors[0].kind).toBe('device-retired');
  });

  test('device not subscribed → SKIPPED', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const r = await s.libSvc.createLibrary({
      libraryCode: 'LIB-NS',
      name: 'NS',
      branchId: 'br-1',
      capacity: 100,
    });
    // Don't subscribe the device

    const res = await s.worker.syncLibraryToDevice(r.library._id, dev._id);
    expect(res.result).toBe(reg.SYNC_RESULT.SKIPPED);
    expect(res.errors[0].kind).toBe('device-not-subscribed');
  });
});

describe('hikvision-sync-worker — library fan-out', () => {
  test('syncLibrary fans out to every subscribed device', async () => {
    const s = buildScenario();
    const dev1 = await seedDevice(s, { id: 'd1', deviceCode: 'TRM-A' });
    const dev2 = await seedDevice(s, { id: 'd2', deviceCode: 'TRM-B' });

    const r = await s.libSvc.createLibrary({
      libraryCode: 'LIB-FAN',
      name: 'F',
      branchId: 'br-1',
      capacity: 100,
    });
    const stored = s.libraryModel._store.find(l => String(l._id) === String(r.library._id));
    stored.devicesSubscribed = [dev1._id, dev2._id];

    await s.enrSvc.enrollEmployee({
      libraryId: r.library._id,
      employeeId: 'emp-F',
      images: [{ angle: 'front', quality: 85, ref: 's3://f' }],
      actor: { userId: 'hr' },
    });

    const result = await s.worker.syncLibrary(r.library._id);
    expect(result.ok).toBe(true);
    expect(result.devices).toHaveLength(2);
    expect(result.summary.success + result.summary.partial).toBeGreaterThanOrEqual(1);
  });
});

// ═══ 9. Drift detection ════════════════════════════════════════

describe('hikvision-sync-worker — drift detection', () => {
  test('fresh library → no drift', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);
    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-D',
      images: [{ angle: 'front', quality: 85, ref: 's3://d' }],
      actor: { userId: 'hr' },
    });
    await s.worker.syncLibraryToDevice(lib._id, dev._id);

    const drift = await s.worker.detectDrift(lib._id);
    expect(drift.ok).toBe(true);
    expect(drift.hasDrift).toBe(false);
    expect(drift.storedHash).toBe(drift.currentHash);
  });

  test('library mutated after last sync → drift detected', async () => {
    const s = buildScenario();
    const dev = await seedDevice(s, {});
    const lib = await seedLibraryWithDevice(s, dev._id);
    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-1',
      images: [{ angle: 'front', quality: 85, ref: 's3://a' }],
      actor: { userId: 'hr' },
    });
    await s.worker.syncLibraryToDevice(lib._id, dev._id);

    // Enroll another employee AFTER the sync — drift appears
    await s.enrSvc.enrollEmployee({
      libraryId: lib._id,
      employeeId: 'emp-2',
      images: [{ angle: 'front', quality: 85, ref: 's3://b' }],
      actor: { userId: 'hr' },
    });

    const drift = await s.worker.detectDrift(lib._id);
    expect(drift.ok).toBe(true);
    expect(drift.hasDrift).toBe(true);
    expect(drift.storedHash).not.toBe(drift.currentHash);
  });
});
