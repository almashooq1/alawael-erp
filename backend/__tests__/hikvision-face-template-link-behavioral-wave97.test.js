'use strict';

/**
 * hikvision-face-template-link-behavioral-wave97.test.js — behavioral coverage
 * for W97 Phase 2 HikvisionFaceTemplateLink.
 *
 * This is the biometric-PII bridge: links an Employee to a Hikvision-side
 * `personId` inside a face library. Privacy-critical (face templates are
 * irreversible biometric data) — Wave-18 invariants enforce that:
 *   1. active templates carry hikvisionPersonId
 *   2. active templates carry templateChecksum (drift detection)
 *   3. suspended/deleted templates require deactivationReason (audit)
 *   4. enrollmentImages MUST include at least one angle='front'
 *   5. enrollmentImages array must be non-empty (path-level validator)
 *
 * Plus: partial-unique (libraryId+employeeId) for non-deleted templates.
 *
 * Per CLAUDE.md doctrine — 31× application. First entry from
 * BEHAVIORAL_TEST_COVERAGE_BACKLOG.md Hikvision suite (10 models).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hikvision-face-template-link-behavioral-wave97.test.js --runInBand
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Link;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w97-hikvision-face-template-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Link = require('../models/HikvisionFaceTemplateLink');
  await Link.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Link.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function frontImage(extra = {}) {
  return { angle: 'front', quality: 88, ref: 's3://hikvision/templates/x.jpg', ...extra };
}

function baseLink(overrides = {}) {
  return {
    libraryId: oid(),
    employeeId: oid(),
    enrollmentImages: [frontImage()],
    ...overrides,
  };
}

// ─── 1. Required + path-validator ─────────────────────────────────────

describe('W97 behavioral — required fields + image-array validator', () => {
  it('REJECTS without libraryId', async () => {
    const p = new Link({ ...baseLink(), libraryId: undefined });
    await expect(p.save()).rejects.toThrow(/libraryId/);
  });

  it('REJECTS without employeeId', async () => {
    const p = new Link({ ...baseLink(), employeeId: undefined });
    await expect(p.save()).rejects.toThrow(/employeeId/);
  });

  it('REJECTS without enrollmentImages', async () => {
    const p = new Link({ ...baseLink(), enrollmentImages: undefined });
    await expect(p.save()).rejects.toThrow(/enrollmentImages/);
  });

  it('REJECTS empty enrollmentImages array', async () => {
    const p = new Link(baseLink({ enrollmentImages: [] }));
    await expect(p.save()).rejects.toThrow(/at least one image/);
  });

  it('SAVES baseline pending template (no checksum/personId required yet)', async () => {
    const doc = await Link.create(baseLink());
    expect(doc.status).toBe('pending');
    expect(doc.hikvisionPersonId).toBeNull();
    expect(doc.templateChecksum).toBeNull();
    expect(doc.enrolledAt).toBeInstanceOf(Date);
  });
});

// ─── 2. Wave-18: active status requires personId + checksum ──────────

describe('W97 behavioral — active status invariants', () => {
  it('REJECTS status=active without hikvisionPersonId', async () => {
    const p = new Link(
      baseLink({
        status: 'active',
        templateChecksum: 'sha256:abc',
      })
    );
    await expect(p.save()).rejects.toThrow(
      /hikvisionPersonId.*active templates require hikvisionPersonId/
    );
  });

  it('REJECTS status=active without templateChecksum', async () => {
    const p = new Link(
      baseLink({
        status: 'active',
        hikvisionPersonId: 'HIK_PERSON_001',
      })
    );
    await expect(p.save()).rejects.toThrow(
      /templateChecksum.*active templates require templateChecksum/
    );
  });

  it('SAVES active template with both personId + checksum', async () => {
    const doc = await Link.create(
      baseLink({
        status: 'active',
        hikvisionPersonId: 'HIK_PERSON_001',
        templateChecksum: 'sha256:' + 'a'.repeat(64),
        confirmedAt: new Date(),
      })
    );
    expect(doc.status).toBe('active');
    expect(doc.hikvisionPersonId).toBe('HIK_PERSON_001');
  });

  it('pending status does NOT require personId or checksum', async () => {
    const doc = await Link.create(baseLink({ status: 'pending' }));
    expect(doc.hikvisionPersonId).toBeNull();
    expect(doc.templateChecksum).toBeNull();
  });
});

// ─── 3. Wave-18: suspended/deleted require deactivationReason ────────

describe('W97 behavioral — deactivation reason invariants', () => {
  it('REJECTS status=suspended without deactivationReason', async () => {
    const p = new Link(baseLink({ status: 'suspended', deactivatedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(
      /deactivationReason.*suspended templates require a deactivationReason/
    );
  });

  it('REJECTS status=deleted without deactivationReason', async () => {
    const p = new Link(baseLink({ status: 'deleted', deactivatedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(
      /deactivationReason.*deleted templates require a deactivationReason/
    );
  });

  it('SAVES status=suspended with documented reason', async () => {
    const doc = await Link.create(
      baseLink({
        status: 'suspended',
        deactivatedAt: new Date(),
        deactivationReason: 'Employee on extended leave; library access paused per HR',
        cascadeReason: 'employee-suspended',
      })
    );
    expect(doc.status).toBe('suspended');
  });

  it('SAVES status=deleted with cascadeReason=employee-exit', async () => {
    const doc = await Link.create(
      baseLink({
        status: 'deleted',
        deactivatedAt: new Date(),
        exitTriggeredAt: new Date(),
        deactivationReason: 'Employee terminated 2026-05-27; all biometric data tombstoned',
        cascadeReason: 'employee-exit',
      })
    );
    expect(doc.cascadeReason).toBe('employee-exit');
  });

  it('REJECTS invalid cascadeReason enum', async () => {
    const p = new Link(
      baseLink({
        status: 'suspended',
        deactivatedAt: new Date(),
        deactivationReason: 'x',
        cascadeReason: 'employee_quit',
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Wave-18: must include a front-angle image ─────────────────────

describe('W97 behavioral — front-image requirement', () => {
  it('REJECTS enrollment with only side angles (no front)', async () => {
    const p = new Link(
      baseLink({
        enrollmentImages: [
          { angle: 'left', quality: 85, ref: 's3://x/l.jpg' },
          { angle: 'right', quality: 82, ref: 's3://x/r.jpg' },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/at least one image must be angle="front"/);
  });

  it('SAVES with front + side angles (recommended quality)', async () => {
    const doc = await Link.create(
      baseLink({
        enrollmentImages: [
          frontImage({ quality: 92 }),
          { angle: 'left', quality: 85, ref: 's3://x/l.jpg' },
          { angle: 'right', quality: 86, ref: 's3://x/r.jpg' },
        ],
      })
    );
    expect(doc.enrollmentImages).toHaveLength(3);
    expect(doc.enrollmentImages[0].angle).toBe('front');
  });

  it('REJECTS invalid image angle enum', async () => {
    const p = new Link(
      baseLink({
        enrollmentImages: [frontImage(), { angle: 'oblique', quality: 80, ref: 's3://x/o.jpg' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS image quality > 100', async () => {
    const p = new Link(baseLink({ enrollmentImages: [frontImage({ quality: 150 })] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS image quality < 0', async () => {
    const p = new Link(baseLink({ enrollmentImages: [frontImage({ quality: -10 })] }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 5. Status + template enum coverage ───────────────────────────────

describe('W97 behavioral — template status enum', () => {
  it('SAVES status=pending (default)', async () => {
    const doc = await Link.create(baseLink());
    expect(doc.status).toBe('pending');
  });

  it('REJECTS invalid status', async () => {
    const p = new Link(baseLink({ status: 'archived' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 6. Partial-unique (libraryId+employeeId) for non-deleted ─────────

describe('W97 behavioral — partial-unique active/pending/suspended per (library,employee)', () => {
  it('REJECTS 2nd pending template for same (libraryId, employeeId)', async () => {
    const libraryId = oid();
    const employeeId = oid();
    await Link.create(baseLink({ libraryId, employeeId, status: 'pending' }));
    await expect(
      Link.create(baseLink({ libraryId, employeeId, status: 'pending' }))
    ).rejects.toThrow(/E11000|duplicate/i);
  });

  it('ALLOWS new template after previous one is deleted (tombstone allowed)', async () => {
    const libraryId = oid();
    const employeeId = oid();
    await Link.create(
      baseLink({
        libraryId,
        employeeId,
        status: 'deleted',
        deactivatedAt: new Date(),
        deactivationReason: 'employee-exit',
        cascadeReason: 'employee-exit',
      })
    );
    // Should NOT collide because the prior one is `deleted` (outside partial filter)
    const fresh = await Link.create(baseLink({ libraryId, employeeId, status: 'pending' }));
    expect(fresh.status).toBe('pending');
  });

  it('ALLOWS different libraries for the same employee', async () => {
    const employeeId = oid();
    const a = await Link.create(baseLink({ libraryId: oid(), employeeId, status: 'pending' }));
    const b = await Link.create(baseLink({ libraryId: oid(), employeeId, status: 'pending' }));
    expect(a._id).not.toEqual(b._id);
  });
});

// ─── 7. Indexes + collection ─────────────────────────────────────────

describe('W97 behavioral — indexes + collection', () => {
  it('declares the documented per-field + compound indexes', async () => {
    const indexes = await Link.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('employeeId+status');
    expect(keys).toContain('libraryId+status');
    expect(keys).toContain('status+lastSyncedAt');
  });

  it('uses canonical collection name hikvision_face_template_links', () => {
    expect(Link.collection.collectionName).toBe('hikvision_face_template_links');
  });
});

// ─── 8. End-to-end: pending → active → re-enroll → tombstone ─────────

describe('W97 behavioral — full enrollment lifecycle with re-enroll + exit cascade', () => {
  it('records pending → active → suspended (re-enrolled) → deleted (exit)', async () => {
    const libraryId = oid();
    const employeeId = oid();

    // 1. Initial enrollment — pending awaiting device confirmation
    const v1 = await Link.create(
      baseLink({
        libraryId,
        employeeId,
        enrollmentImages: [
          frontImage({ quality: 90 }),
          { angle: 'left', quality: 84, ref: 's3://x/l.jpg' },
          { angle: 'right', quality: 86, ref: 's3://x/r.jpg' },
        ],
      })
    );
    expect(v1.status).toBe('pending');

    // 2. Sync worker confirms — template now active
    v1.status = 'active';
    v1.hikvisionPersonId = 'HIK_PERSON_E001_LIB001';
    v1.templateChecksum = 'sha256:' + 'a'.repeat(64);
    v1.confirmedAt = new Date();
    v1.lastSyncedAt = new Date();
    await v1.save();
    expect(v1.status).toBe('active');

    // 3. Re-enrollment — old template must move out of the partial-unique
    //    window (pending/active/suspended) before a new template can be
    //    created. Note: the model spec mentions "old one moves to
    //    suspended" but the partial-unique index includes suspended,
    //    so the realistic in-place re-enroll path is delete-old +
    //    create-new (atomic at the service layer). We exercise that path.
    v1.status = 'deleted';
    v1.deactivatedAt = new Date();
    v1.deactivationReason = 'Re-enrolled with higher-quality images per Q3 quality push';
    v1.cascadeReason = 'operator-override';
    await v1.save();

    const v2 = await Link.create(
      baseLink({
        libraryId,
        employeeId,
        enrollmentImages: [frontImage({ quality: 95 })],
      })
    );
    expect(v2.status).toBe('pending');

    // 4. Employee exit — v2 tombstoned (v1 already deleted)
    v2.status = 'deleted';
    v2.deactivatedAt = new Date();
    v2.exitTriggeredAt = new Date();
    v2.deactivationReason = 'Employee exit cascade 2026-05-27';
    v2.cascadeReason = 'employee-exit';
    await v2.save();

    const reloaded = await Link.find({ libraryId, employeeId });
    expect(reloaded).toHaveLength(2);
    expect(reloaded.every(t => t.status === 'deleted')).toBe(true);
  });
});
