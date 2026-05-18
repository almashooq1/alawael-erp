/**
 * hikvision-wave97-phase2.test.js — Wave 97 Phase 2.
 *
 * Unit tests for the face library + template enrollment slice. Builds
 * on the Wave 96 Phase 1 mock pattern (chainable Mongoose-style stubs
 * with thenable wrappers that DO NOT re-thenable the resolved value —
 * Phase 1's hard-won lesson).
 *
 * Sections:
 *   1. Registry helpers — validateEnrollmentImages + isDeviceEligibleForLibrary
 *   2. FaceLibrary service — create + duplicate code + invariants + archive cascade
 *   3. FaceLibrary service — device subscription gates (face cap, branch eligibility)
 *   4. Enrollment service — enroll guards (library archived, paused, full, duplicate)
 *   5. Enrollment service — confirm flow (pending → active)
 *   6. Enrollment service — suspend + re-enroll (chain via supersededByTemplateId)
 *   7. Enrollment service — exit cascade (employee left)
 *   8. Integrity hash determinism over identical input
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
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
              const err = new Error('E11000 partial unique conflict');
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
    if (!hit) {
      return { lean: async () => null, then: resolve => resolve(null) };
    }
    // Phase 1's hard-won lesson: inst must NOT be thenable
    const inst = new ModelCtor({ ...hit, _existing: true });
    inst._id = hit._id;
    return {
      lean: async () => ({ ...hit }),
      then: resolve => resolve(inst),
    };
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r => _matches(r, query));
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
      // Iterable for `for (const t of templates)` — wrap as instances
      // when invariants need to mutate-and-save.
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
    if (update.$set) {
      for (const r of matches) Object.assign(r, update.$set);
    }
    return { acknowledged: true, modifiedCount: matches.length };
  };

  return ModelCtor;
}

function _matches(row, query) {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      if (!v.some(cond => _matches(row, cond))) return false;
      continue;
    }
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
    if (v && typeof v === 'object' && '$lt' in v) {
      if (row[k] === null || row[k] === undefined) return false;
      if (!(new Date(row[k]) < new Date(v.$lt))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$gte' in v) {
      if (row[k] === null || row[k] === undefined) return false;
      if (!(new Date(row[k]) >= new Date(v.$gte))) return false;
      continue;
    }
    if (String(row[k]) !== String(v)) return false;
  }
  return true;
}

// Build the specific models with their invariants.

function buildLibraryModel() {
  const M = buildModel({
    invariants() {
      if (this.syncStrategy === reg.SYNC_STRATEGY.MULTI_BRANCH) {
        if (!Array.isArray(this.allowedBranchIds) || this.allowedBranchIds.length < 2) {
          this.invalidate('allowedBranchIds', 'multi-branch needs ≥2 branches');
        }
      }
      if (this.syncStrategy === reg.SYNC_STRATEGY.GLOBAL) {
        if (Array.isArray(this.allowedBranchIds) && this.allowedBranchIds.length > 0) {
          this.invalidate('allowedBranchIds', 'global must be empty');
        }
      }
      if (this.usedSlots > this.capacity) {
        this.invalidate('usedSlots', 'over capacity');
      }
    },
  });
  M._unique = [['libraryCode']];
  return M;
}

function buildTemplateModel() {
  const M = buildModel({
    invariants() {
      if (this.status === reg.TEMPLATE_STATUS.ACTIVE) {
        if (!this.hikvisionPersonId) {
          this.invalidate('hikvisionPersonId', 'active needs hikvisionPersonId');
        }
        if (!this.templateChecksum) {
          this.invalidate('templateChecksum', 'active needs templateChecksum');
        }
      }
      if (
        (this.status === reg.TEMPLATE_STATUS.SUSPENDED ||
          this.status === reg.TEMPLATE_STATUS.DELETED) &&
        !this.deactivationReason
      ) {
        this.invalidate('deactivationReason', 'required for inactive');
      }
      if (
        Array.isArray(this.enrollmentImages) &&
        !this.enrollmentImages.some(img => img.angle === reg.IMAGE_ANGLE.FRONT)
      ) {
        this.invalidate('enrollmentImages', 'front image required');
      }
    },
  });
  // Partial unique: at most one non-deleted (libraryId, employeeId)
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
  return buildModel(); // no invariants needed for these tests
}

const SILENT_LOGGER = { error: () => {}, warn: () => {}, info: () => {} };

// ─── 1. Registry helpers ───────────────────────────────────────

describe('hikvision.registry — Phase 2 helpers', () => {
  const goodImages = [
    { angle: 'front', quality: 85, ref: 'a.jpg' },
    { angle: 'left', quality: 80, ref: 'b.jpg' },
  ];

  test('validateEnrollmentImages accepts a front + side combo', () => {
    expect(reg.validateEnrollmentImages(goodImages).ok).toBe(true);
  });

  test('empty array → IMAGES_REQUIRED', () => {
    expect(reg.validateEnrollmentImages([]).reason).toBe(reg.REASON.IMAGES_REQUIRED);
  });

  test('no front image → FRONT_IMAGE_REQUIRED', () => {
    const r = reg.validateEnrollmentImages([
      { angle: 'left', quality: 80, ref: 'x' },
      { angle: 'right', quality: 80, ref: 'y' },
    ]);
    expect(r.reason).toBe(reg.REASON.FRONT_IMAGE_REQUIRED);
  });

  test('low quality → IMAGE_QUALITY_TOO_LOW', () => {
    const r = reg.validateEnrollmentImages([{ angle: 'front', quality: 40, ref: 'x' }]);
    expect(r.reason).toBe(reg.REASON.IMAGE_QUALITY_TOO_LOW);
  });

  test('invalid angle → INVALID_IMAGE_ANGLE', () => {
    const r = reg.validateEnrollmentImages([{ angle: 'diagonal', quality: 80, ref: 'x' }]);
    expect(r.reason).toBe(reg.REASON.INVALID_IMAGE_ANGLE);
  });

  test('duplicate angle without allowMulti → VALIDATION_FAILED', () => {
    const r = reg.validateEnrollmentImages([
      { angle: 'front', quality: 80, ref: 'a' },
      { angle: 'front', quality: 80, ref: 'b' },
    ]);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('isDeviceEligibleForLibrary — branch-only matches same branch only', () => {
    const lib = { syncStrategy: 'branch-only', branchId: 'b1' };
    const a = { branchId: 'b1', capabilities: ['face'] };
    const b = { branchId: 'b2', capabilities: ['face'] };
    expect(reg.isDeviceEligibleForLibrary(lib, a)).toBe(true);
    expect(reg.isDeviceEligibleForLibrary(lib, b)).toBe(false);
  });

  test('isDeviceEligibleForLibrary — global accepts any face-capable device', () => {
    const lib = { syncStrategy: 'global', branchId: 'b1' };
    const a = { branchId: 'b2', capabilities: ['face'] };
    const b = { branchId: 'b3', capabilities: ['lpr'] }; // no face
    expect(reg.isDeviceEligibleForLibrary(lib, a)).toBe(true);
    expect(reg.isDeviceEligibleForLibrary(lib, b)).toBe(false);
  });

  test('isDeviceEligibleForLibrary — multi-branch checks allowedBranchIds', () => {
    const lib = { syncStrategy: 'multi-branch', branchId: 'b1', allowedBranchIds: ['b1', 'b2'] };
    const a = { branchId: 'b2', capabilities: ['face'] };
    const b = { branchId: 'b3', capabilities: ['face'] };
    expect(reg.isDeviceEligibleForLibrary(lib, a)).toBe(true);
    expect(reg.isDeviceEligibleForLibrary(lib, b)).toBe(false);
  });
});

// ─── 2-3. FaceLibrary service ─────────────────────────────────

describe('hikvision-face-library.service', () => {
  function newSvc({ withDevice = false } = {}) {
    const libraryModel = buildLibraryModel();
    const templateModel = buildTemplateModel();
    const deviceModel = withDevice ? buildDeviceModel() : null;
    return {
      svc: createHikvisionFaceLibraryService({
        libraryModel,
        templateModel,
        deviceModel,
        logger: SILENT_LOGGER,
      }),
      libraryModel,
      templateModel,
      deviceModel,
    };
  }

  test('createLibrary — happy path', async () => {
    const { svc } = newSvc();
    const r = await svc.createLibrary({
      libraryCode: 'LIB-001',
      name: 'Riyadh HQ',
      branchId: 'br-1',
      capacity: 5000,
    });
    expect(r.ok).toBe(true);
    expect(r.library.status).toBe(reg.LIBRARY_STATUS.ACTIVE);
    expect(r.library.capacity).toBe(5000);
  });

  test('createLibrary — duplicate libraryCode → LIBRARY_CODE_TAKEN', async () => {
    const { svc } = newSvc();
    await svc.createLibrary({
      libraryCode: 'LIB-DUP',
      name: 'A',
      branchId: 'br-1',
      capacity: 100,
    });
    const r = await svc.createLibrary({
      libraryCode: 'LIB-DUP',
      name: 'B',
      branchId: 'br-2',
      capacity: 100,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.LIBRARY_CODE_TAKEN);
  });

  test('createLibrary — multi-branch with <2 branches → VALIDATION_FAILED', async () => {
    const { svc } = newSvc();
    const r = await svc.createLibrary({
      libraryCode: 'LIB-MB',
      name: 'MB',
      branchId: 'br-1',
      capacity: 100,
      syncStrategy: reg.SYNC_STRATEGY.MULTI_BRANCH,
      allowedBranchIds: ['br-1'], // only one — must be ≥2
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('createLibrary — global with allowedBranchIds → VALIDATION_FAILED', async () => {
    const { svc } = newSvc();
    const r = await svc.createLibrary({
      libraryCode: 'LIB-G',
      name: 'G',
      branchId: 'br-1',
      capacity: 100,
      syncStrategy: reg.SYNC_STRATEGY.GLOBAL,
      allowedBranchIds: ['br-1'],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('archiveLibrary — cascades active templates to suspended', async () => {
    const { svc, libraryModel, templateModel } = newSvc();
    const lib = await svc.createLibrary({
      libraryCode: 'LIB-A',
      name: 'A',
      branchId: 'br-1',
      capacity: 100,
    });
    // Inject 2 active templates directly into the store
    templateModel._store.push(
      {
        _id: 't1',
        libraryId: lib.library._id,
        employeeId: 'e1',
        status: reg.TEMPLATE_STATUS.ACTIVE,
        hikvisionPersonId: 'p1',
        templateChecksum: 'c1',
        enrollmentImages: [{ angle: 'front', quality: 85, ref: 'x' }],
      },
      {
        _id: 't2',
        libraryId: lib.library._id,
        employeeId: 'e2',
        status: reg.TEMPLATE_STATUS.PENDING,
        hikvisionPersonId: null,
        templateChecksum: null,
        enrollmentImages: [{ angle: 'front', quality: 85, ref: 'y' }],
      }
    );

    const r = await svc.archiveLibrary(lib.library._id, 'audit-driven retirement');
    expect(r.ok).toBe(true);
    expect(r.library.status).toBe(reg.LIBRARY_STATUS.ARCHIVED);
    expect(r.cascadedTemplates).toBe(2);

    const t1 = templateModel._store.find(t => t._id === 't1');
    expect(t1.status).toBe(reg.TEMPLATE_STATUS.SUSPENDED);
    expect(t1.cascadeReason).toBe(reg.CASCADE_REASON.LIBRARY_ARCHIVED);
    expect(libraryModel._store[0].status).toBe(reg.LIBRARY_STATUS.ARCHIVED);
  });

  test('subscribeDevice — face-incapable device → DEVICE_NOT_FACE_CAPABLE', async () => {
    const { svc, deviceModel, libraryModel } = newSvc({ withDevice: true });
    const lib = await svc.createLibrary({
      libraryCode: 'LIB-S',
      name: 'S',
      branchId: 'br-1',
      capacity: 100,
    });
    deviceModel._store.push({
      _id: 'd1',
      branchId: 'br-1',
      capabilities: ['lpr'], // no face
      retiredAt: null,
    });
    const r = await svc.subscribeDevice(lib.library._id, 'd1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.DEVICE_NOT_FACE_CAPABLE);
    void libraryModel;
  });

  test('subscribeDevice — wrong branch under branch-only → LIBRARY_BRANCH_MISMATCH', async () => {
    const { svc, deviceModel } = newSvc({ withDevice: true });
    const lib = await svc.createLibrary({
      libraryCode: 'LIB-BO',
      name: 'BO',
      branchId: 'br-1',
      capacity: 100,
    });
    deviceModel._store.push({
      _id: 'd2',
      branchId: 'br-2',
      capabilities: ['face'],
      retiredAt: null,
    });
    const r = await svc.subscribeDevice(lib.library._id, 'd2');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.LIBRARY_BRANCH_MISMATCH);
  });

  test('subscribeDevice → same device twice = DEVICE_ALREADY_SUBSCRIBED', async () => {
    const { svc, deviceModel } = newSvc({ withDevice: true });
    const lib = await svc.createLibrary({
      libraryCode: 'LIB-DUP-DEV',
      name: 'D',
      branchId: 'br-1',
      capacity: 100,
    });
    deviceModel._store.push({
      _id: 'd3',
      branchId: 'br-1',
      capabilities: ['face'],
      retiredAt: null,
    });
    const a = await svc.subscribeDevice(lib.library._id, 'd3');
    expect(a.ok).toBe(true);
    const b = await svc.subscribeDevice(lib.library._id, 'd3');
    expect(b.ok).toBe(false);
    expect(b.reason).toBe(reg.REASON.DEVICE_ALREADY_SUBSCRIBED);
  });

  test('computeIntegrityHash — deterministic on identical input + EMPTY when no templates', async () => {
    const { svc, templateModel } = newSvc();
    const empty = await svc.computeIntegrityHash({ libraryId: 'lib-empty' });
    expect(empty.ok).toBe(true);
    expect(empty.integrityHash).toBe('EMPTY');
    expect(empty.templateCount).toBe(0);

    templateModel._store.push(
      {
        _id: 'aaaa',
        libraryId: 'lib-hash',
        employeeId: 'e1',
        templateChecksum: 'sumA',
        status: reg.TEMPLATE_STATUS.ACTIVE,
      },
      {
        _id: 'bbbb',
        libraryId: 'lib-hash',
        employeeId: 'e2',
        templateChecksum: 'sumB',
        status: reg.TEMPLATE_STATUS.PENDING,
      }
    );
    const h1 = await svc.computeIntegrityHash({ libraryId: 'lib-hash' });
    const h2 = await svc.computeIntegrityHash({ libraryId: 'lib-hash' });
    expect(h1.integrityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(h1.integrityHash).toBe(h2.integrityHash);
    expect(h1.templateCount).toBe(2);
  });
});

// ─── 4-7. Enrollment service ───────────────────────────────────

describe('hikvision-face-enrollment.service', () => {
  async function setup({ capacity = 100, status = reg.LIBRARY_STATUS.ACTIVE } = {}) {
    const libraryModel = buildLibraryModel();
    const templateModel = buildTemplateModel();
    const libSvc = createHikvisionFaceLibraryService({
      libraryModel,
      templateModel,
      logger: SILENT_LOGGER,
    });
    const enrSvc = createHikvisionFaceEnrollmentService({
      templateModel,
      libraryModel,
      logger: SILENT_LOGGER,
    });
    const lib = await libSvc.createLibrary({
      libraryCode: 'LIB-E',
      name: 'E',
      branchId: 'br-1',
      capacity,
    });
    if (status !== reg.LIBRARY_STATUS.ACTIVE) {
      libraryModel._store[0].status = status;
    }
    return { enrSvc, libSvc, libraryModel, templateModel, libraryId: lib.library._id };
  }

  const goodImages = [
    { angle: 'front', quality: 85, ref: 'a.jpg' },
    { angle: 'left', quality: 80, ref: 'b.jpg' },
  ];

  test('enrollEmployee — happy path → pending template + library.usedSlots=1', async () => {
    const { enrSvc, libraryId, libraryModel } = await setup();
    const r = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-1',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(r.ok).toBe(true);
    expect(r.template.status).toBe(reg.TEMPLATE_STATUS.PENDING);
    expect(r.template.enrolledBy).toBe('hr-admin');
    expect(libraryModel._store[0].usedSlots).toBe(1);
  });

  test('enrollEmployee — missing actor → VALIDATION_FAILED', async () => {
    const { enrSvc, libraryId } = await setup();
    const r = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-1',
      images: goodImages,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('enrollEmployee — library archived → LIBRARY_ARCHIVED', async () => {
    const { enrSvc, libraryId } = await setup({ status: reg.LIBRARY_STATUS.ARCHIVED });
    const r = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-1',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.LIBRARY_ARCHIVED);
  });

  test('enrollEmployee — library paused → INVALID_LIBRARY_STATUS', async () => {
    const { enrSvc, libraryId } = await setup({ status: reg.LIBRARY_STATUS.PAUSED });
    const r = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-1',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.INVALID_LIBRARY_STATUS);
  });

  test('enrollEmployee — capacity full → LIBRARY_FULL', async () => {
    const { enrSvc, templateModel, libraryId } = await setup({ capacity: 1 });
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-A',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(a.ok).toBe(true);
    const b = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-B',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(b.ok).toBe(false);
    expect(b.reason).toBe(reg.REASON.LIBRARY_FULL);
    expect(templateModel._store.length).toBe(1);
  });

  test('enrollEmployee — duplicate (same library+employee non-deleted) → TEMPLATE_DUPLICATE', async () => {
    const { enrSvc, libraryId } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-DUP',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(a.ok).toBe(true);
    const b = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-DUP',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    expect(b.ok).toBe(false);
    expect(b.reason).toBe(reg.REASON.TEMPLATE_DUPLICATE);
  });

  test('confirmEnrollment — pending → active with personId + checksum', async () => {
    const { enrSvc, libraryId } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-OK',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    const r = await enrSvc.confirmEnrollment({
      templateId: a.template._id,
      hikvisionPersonId: 'hp-7',
      templateChecksum: 'sum-7',
    });
    expect(r.ok).toBe(true);
    expect(r.template.status).toBe(reg.TEMPLATE_STATUS.ACTIVE);
    expect(r.template.hikvisionPersonId).toBe('hp-7');
    expect(r.template.confirmedAt).toBeTruthy();
  });

  test('confirmEnrollment — already active → TEMPLATE_NOT_PENDING', async () => {
    const { enrSvc, libraryId } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-X',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    await enrSvc.confirmEnrollment({
      templateId: a.template._id,
      hikvisionPersonId: 'p1',
      templateChecksum: 'c1',
    });
    const r = await enrSvc.confirmEnrollment({
      templateId: a.template._id,
      hikvisionPersonId: 'p1',
      templateChecksum: 'c1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.TEMPLATE_NOT_PENDING);
  });

  test('confirmEnrollment — missing personId/checksum → 4xx codes', async () => {
    const { enrSvc, libraryId } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-PC',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    const noPid = await enrSvc.confirmEnrollment({ templateId: a.template._id });
    expect(noPid.reason).toBe(reg.REASON.PERSON_ID_REQUIRED);
    const noSum = await enrSvc.confirmEnrollment({
      templateId: a.template._id,
      hikvisionPersonId: 'p',
    });
    expect(noSum.reason).toBe(reg.REASON.CHECKSUM_REQUIRED);
  });

  test('suspendTemplate — active → suspended with cascadeReason=operator', async () => {
    const { enrSvc, libraryId, libraryModel } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-S',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    await enrSvc.confirmEnrollment({
      templateId: a.template._id,
      hikvisionPersonId: 'p',
      templateChecksum: 'c',
    });
    const r = await enrSvc.suspendTemplate({
      templateId: a.template._id,
      reason: 'employee on long leave',
      actor: { userId: 'hr-admin' },
    });
    expect(r.ok).toBe(true);
    expect(r.template.status).toBe(reg.TEMPLATE_STATUS.SUSPENDED);
    expect(r.template.cascadeReason).toBe(reg.CASCADE_REASON.OPERATOR_OVERRIDE);
    expect(libraryModel._store[0].usedSlots).toBe(0);
  });

  test('suspendTemplate — re-suspend is idempotent', async () => {
    const { enrSvc, libraryId } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-RE',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    await enrSvc.suspendTemplate({
      templateId: a.template._id,
      reason: 'first',
      actor: { userId: 'hr-admin' },
    });
    const r = await enrSvc.suspendTemplate({
      templateId: a.template._id,
      reason: 'second',
      actor: { userId: 'hr-admin' },
    });
    expect(r.ok).toBe(true);
    expect(r.idempotent).toBe(true);
  });

  test('reEnroll — superseded chain (old=deleted with supersededByTemplateId, new=pending)', async () => {
    const { enrSvc, libraryId, templateModel } = await setup();
    const a = await enrSvc.enrollEmployee({
      libraryId,
      employeeId: 'emp-RR',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    await enrSvc.confirmEnrollment({
      templateId: a.template._id,
      hikvisionPersonId: 'p',
      templateChecksum: 'c',
    });

    const newImages = [
      { angle: 'front', quality: 88, ref: 'new-a.jpg' },
      { angle: 'right', quality: 82, ref: 'new-b.jpg' },
    ];
    const r = await enrSvc.reEnroll({
      templateId: a.template._id,
      images: newImages,
      actor: { userId: 'hr-admin' },
    });
    expect(r.ok).toBe(true);
    expect(r.template.status).toBe(reg.TEMPLATE_STATUS.PENDING);
    expect(String(r.supersededTemplateId)).toBe(String(a.template._id));

    const oldRow = templateModel._store.find(t => String(t._id) === String(a.template._id));
    expect(oldRow.status).toBe(reg.TEMPLATE_STATUS.DELETED);
    expect(String(oldRow.supersededByTemplateId)).toBe(String(r.template._id));
  });

  test('deactivateOnExit — cascades all employee templates across libraries to deleted', async () => {
    const libraryModel = buildLibraryModel();
    const templateModel = buildTemplateModel();
    const libSvc = createHikvisionFaceLibraryService({
      libraryModel,
      templateModel,
      logger: SILENT_LOGGER,
    });
    const enrSvc = createHikvisionFaceEnrollmentService({
      templateModel,
      libraryModel,
      logger: SILENT_LOGGER,
    });

    const libA = await libSvc.createLibrary({
      libraryCode: 'LIB-X',
      name: 'X',
      branchId: 'br-1',
      capacity: 100,
    });
    const libB = await libSvc.createLibrary({
      libraryCode: 'LIB-Y',
      name: 'Y',
      branchId: 'br-2',
      capacity: 100,
    });

    await enrSvc.enrollEmployee({
      libraryId: libA.library._id,
      employeeId: 'emp-EX',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    await enrSvc.enrollEmployee({
      libraryId: libB.library._id,
      employeeId: 'emp-EX',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });
    // also enrol someone else who should NOT be cascaded
    await enrSvc.enrollEmployee({
      libraryId: libA.library._id,
      employeeId: 'emp-KEEP',
      images: goodImages,
      actor: { userId: 'hr-admin' },
    });

    const r = await enrSvc.deactivateOnExit({
      employeeId: 'emp-EX',
      exitReason: 'resignation',
      actor: { userId: 'hr-director' },
    });
    expect(r.ok).toBe(true);
    expect(r.deactivated).toBe(2);
    expect(r.affectedLibraries).toHaveLength(2);

    const exitedRows = templateModel._store.filter(t => t.employeeId === 'emp-EX');
    for (const row of exitedRows) {
      expect(row.status).toBe(reg.TEMPLATE_STATUS.DELETED);
      expect(row.cascadeReason).toBe(reg.CASCADE_REASON.EMPLOYEE_EXIT);
      expect(row.exitTriggeredAt).toBeTruthy();
    }
    const kept = templateModel._store.find(t => t.employeeId === 'emp-KEEP');
    expect(kept.status).toBe(reg.TEMPLATE_STATUS.PENDING);
  });

  test('computeImagesChecksum — deterministic + order-independent', () => {
    const { enrSvc } = {
      enrSvc: createHikvisionFaceEnrollmentService({
        templateModel: buildTemplateModel(),
        libraryModel: buildLibraryModel(),
        logger: SILENT_LOGGER,
      }),
    };
    const a = enrSvc.computeImagesChecksum([
      { angle: 'front', quality: 85, ref: 'a' },
      { angle: 'left', quality: 80, ref: 'b' },
    ]);
    const b = enrSvc.computeImagesChecksum([
      { angle: 'left', quality: 80, ref: 'b' },
      { angle: 'front', quality: 85, ref: 'a' },
    ]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
