'use strict';

/**
 * Behavioral counterpart for the attendance policy/governance trio:
 *   • AttendanceRetentionPolicy  (Wave 133) — per-collection PDPL rule
 *   • BranchGeofence             (Wave 122) — polygon + active hours
 *   • EmployeeCredential         (Wave 138) — SCFHS / Iqama / BLS / etc
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These exercise every Wave-18 `__invariants`
 * branch end-to-end against MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Policy;
let Geofence;
let Credential;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w122-133-138-attendance-policy' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Policy = require('../models/AttendanceRetentionPolicy');
  Geofence = require('../models/BranchGeofence');
  Credential = require('../models/EmployeeCredential');
  await Policy.init().catch(() => null);
  await Geofence.init().catch(() => null);
  await Credential.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Policy.deleteMany({});
  await Geofence.deleteMany({});
  await Credential.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  AttendanceRetentionPolicy (W133)
// ════════════════════════════════════════════════════════════════════

describe('AttendanceRetentionPolicy — Wave-18 invariants', () => {
  const basePolicy = (overrides = {}) => ({
    collection: 'attendance_source_events',
    retentionDays: 90,
    action: 'redact-pii',
    piiFields: ['geo.lat', 'geo.lng', 'sourceRefId'],
    ...overrides,
  });

  it('rejects unknown collection name', async () => {
    const p = new Policy(basePolicy({ collection: 'unrelated_collection' }));
    await expect(p.save()).rejects.toThrow(/collection/);
  });

  it('rejects retentionDays < 1', async () => {
    const p = new Policy(basePolicy({ retentionDays: 0 }));
    await expect(p.save()).rejects.toThrow(/retentionDays/);
  });

  it('rejects retentionDays > 7y', async () => {
    const p = new Policy(basePolicy({ retentionDays: 7 * 365 + 1 }));
    await expect(p.save()).rejects.toThrow(/retentionDays/);
  });

  it('rejects unknown action enum', async () => {
    const p = new Policy(basePolicy({ action: 'shred' }));
    await expect(p.save()).rejects.toThrow(/action/);
  });

  it('rejects action=redact-pii without piiFields', async () => {
    const p = new Policy(basePolicy({ action: 'redact-pii', piiFields: [] }));
    await expect(p.save()).rejects.toThrow(/piiFields/);
  });

  it('accepts action=hard-delete without piiFields', async () => {
    const p = new Policy(basePolicy({ action: 'hard-delete', piiFields: [] }));
    await expect(p.save()).resolves.toBeDefined();
  });

  it('enforces unique collection', async () => {
    await new Policy(basePolicy()).save();
    const dup = new Policy(basePolicy());
    await expect(dup.save()).rejects.toThrow();
  });

  it('accepts a fully-formed redact-pii policy', async () => {
    const p = new Policy(
      basePolicy({
        action: 'redact-pii',
        piiFields: ['geo.lat', 'geo.lng', 'auditChain.ip'],
        legalHoldFilter: { caseNumber: 'LH-2026-001' },
        notes: 'PDPL Article 23 compliance',
        lastEditedByActorId: oid(),
        lastEditedByRole: 'dpo',
      })
    );
    await expect(p.save()).resolves.toBeDefined();
  });

  it('persists default action = redact-pii + enabled = true', async () => {
    const p = await new Policy({
      collection: 'attendance_correction_requests',
      retentionDays: 365,
      piiFields: ['evidence.url'],
    }).save();
    expect(p.action).toBe('redact-pii');
    expect(p.enabled).toBe(true);
  });

  it('exposes COLLECTIONS + ACTIONS module constants', () => {
    expect(Policy.COLLECTIONS).toContain('attendance_source_events');
    expect(Policy.COLLECTIONS).toContain('daily_attendance_records');
    expect(Policy.ACTIONS).toEqual(['hard-delete', 'redact-pii', 'archive', 'noop']);
  });
});

// ════════════════════════════════════════════════════════════════════
//  BranchGeofence (W122)
// ════════════════════════════════════════════════════════════════════

describe('BranchGeofence — Wave-18 invariants', () => {
  const SQUARE = [
    [24.71, 46.67],
    [24.71, 46.68],
    [24.72, 46.68],
    [24.72, 46.67],
  ];

  const baseGeo = (overrides = {}) => ({
    branchId: oid(),
    nameAr: 'فرع الرياض الرئيسي',
    kind: 'branch-perimeter',
    polygon: SQUARE,
    ...overrides,
  });

  it('rejects rows without branchId', async () => {
    const g = new Geofence(baseGeo({ branchId: undefined }));
    await expect(g.save()).rejects.toThrow(/branchId/);
  });

  it('rejects rows without nameAr', async () => {
    const g = new Geofence(baseGeo({ nameAr: undefined }));
    await expect(g.save()).rejects.toThrow(/nameAr/);
  });

  it('rejects polygon with <3 vertices', async () => {
    const g = new Geofence(
      baseGeo({
        polygon: [
          [24.71, 46.67],
          [24.71, 46.68],
        ],
      })
    );
    await expect(g.save()).rejects.toThrow(/polygon/);
  });

  it('rejects polygon vertex with out-of-range latitude', async () => {
    const g = new Geofence(
      baseGeo({
        polygon: [
          [91, 46.67],
          [24.71, 46.68],
          [24.72, 46.68],
        ],
      })
    );
    await expect(g.save()).rejects.toThrow(/polygon/);
  });

  it('rejects polygon vertex with out-of-range longitude', async () => {
    const g = new Geofence(
      baseGeo({
        polygon: [
          [24.71, 181],
          [24.71, 46.68],
          [24.72, 46.68],
        ],
      })
    );
    await expect(g.save()).rejects.toThrow(/polygon/);
  });

  it('rejects polygon vertex that is not a [lat,lng] pair', async () => {
    const g = new Geofence(
      baseGeo({
        polygon: [
          [24.71], // single value
          [24.71, 46.68],
          [24.72, 46.68],
        ],
      })
    );
    await expect(g.save()).rejects.toThrow(/polygon/);
  });

  it('rejects bufferM > 500', async () => {
    const g = new Geofence(baseGeo({ bufferM: 600 }));
    await expect(g.save()).rejects.toThrow(/bufferM/);
  });

  it('rejects bufferM < 0', async () => {
    const g = new Geofence(baseGeo({ bufferM: -5 }));
    await expect(g.save()).rejects.toThrow(/bufferM/);
  });

  it('rejects kind enum drift', async () => {
    const g = new Geofence(baseGeo({ kind: 'unicorn-stable' }));
    await expect(g.save()).rejects.toThrow(/kind/);
  });

  it('rejects activeHours.day outside [0,6]', async () => {
    const g = new Geofence(baseGeo({ activeHours: [{ day: 7, start: '08:00', end: '17:00' }] }));
    await expect(g.save()).rejects.toThrow(/day/);
  });

  it('accepts a fully-formed branch-perimeter geofence', async () => {
    const g = new Geofence(
      baseGeo({
        bufferM: 30,
        activeHours: [
          { day: 0, start: '07:00', end: '18:00' },
          { day: 1, start: '07:00', end: '18:00' },
        ],
        allowedRoles: ['employee', 'driver'],
      })
    );
    await expect(g.save()).resolves.toBeDefined();
  });

  it('accepts field-zone / driver-garage / corridor kinds', async () => {
    for (const k of ['field-zone', 'driver-garage', 'corridor']) {
      const g = new Geofence(baseGeo({ branchId: oid(), kind: k }));
      await expect(g.save()).resolves.toBeDefined();
    }
  });

  it('persists default bufferM = 25 and active = true', async () => {
    const g = await new Geofence(baseGeo()).save();
    expect(g.bufferM).toBe(25);
    expect(g.active).toBe(true);
  });

  it('exposes GEOFENCE_KIND module constant', () => {
    expect(Geofence.GEOFENCE_KIND).toContain('branch-perimeter');
    expect(Geofence.GEOFENCE_KIND).toContain('field-zone');
  });
});

// ════════════════════════════════════════════════════════════════════
//  EmployeeCredential (W138)
// ════════════════════════════════════════════════════════════════════

describe('EmployeeCredential — Wave-18 invariants', () => {
  const baseCred = (overrides = {}) => ({
    employeeId: oid(),
    kind: 'scfhs-license',
    labelAr: 'ترخيص هيئة التخصصات الصحية السعودية',
    issueNumber: 'SCFHS-2026-' + Math.random().toString(36).slice(2),
    status: 'valid',
    ...overrides,
  });

  it('rejects rows without employeeId', async () => {
    const c = new Credential(baseCred({ employeeId: undefined }));
    await expect(c.save()).rejects.toThrow(/employeeId/);
  });

  it('rejects rows without labelAr', async () => {
    const c = new Credential(baseCred({ labelAr: undefined }));
    await expect(c.save()).rejects.toThrow(/labelAr/);
  });

  it('rejects rows without issueNumber', async () => {
    const c = new Credential(baseCred({ issueNumber: undefined }));
    await expect(c.save()).rejects.toThrow(/issueNumber/);
  });

  it('rejects kind enum drift', async () => {
    const c = new Credential(baseCred({ kind: 'jedi-license' }));
    await expect(c.save()).rejects.toThrow(/kind/);
  });

  it('rejects status enum drift', async () => {
    const c = new Credential(baseCred({ status: 'misplaced' }));
    await expect(c.save()).rejects.toThrow(/status/);
  });

  it('rejects status=expired without statusChangedAt', async () => {
    const c = new Credential(baseCred({ status: 'expired' }));
    await expect(c.save()).rejects.toThrow(/statusChangedAt/);
  });

  it('rejects status=suspended without statusChangedAt', async () => {
    const c = new Credential(baseCred({ status: 'suspended' }));
    await expect(c.save()).rejects.toThrow(/statusChangedAt/);
  });

  it('accepts status=expired with statusChangedAt', async () => {
    const c = new Credential(
      baseCred({
        status: 'expired',
        statusChangedAt: new Date(),
        statusReason: 'license expired 2026-04-30',
      })
    );
    await expect(c.save()).resolves.toBeDefined();
  });

  it('accepts a fully-formed SCFHS license', async () => {
    const c = new Credential(
      baseCred({
        issuingAuthority: 'Saudi Commission for Health Specialties',
        issuedAt: new Date('2025-01-01'),
        expiresAt: new Date('2027-01-01'),
        documentRef: 's3://creds/scfhs-12345.pdf',
        verifiedAt: new Date(),
        verifiedByActorId: oid(),
      })
    );
    await expect(c.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (employeeId, kind, issueNumber)', async () => {
    const emp = oid();
    const num = 'SCFHS-2026-001';
    await new Credential(
      baseCred({ employeeId: emp, kind: 'scfhs-license', issueNumber: num })
    ).save();
    const dup = new Credential(
      baseCred({ employeeId: emp, kind: 'scfhs-license', issueNumber: num })
    );
    await expect(dup.save()).rejects.toThrow();
  });

  it('accepts same issueNumber across different employees', async () => {
    const num = 'SHARED-NUM-001';
    await new Credential(baseCred({ employeeId: oid(), kind: 'iqama', issueNumber: num })).save();
    const second = new Credential(baseCred({ employeeId: oid(), kind: 'iqama', issueNumber: num }));
    await expect(second.save()).resolves.toBeDefined();
  });

  it('rejects reminderCount < 0', async () => {
    const c = new Credential(baseCred({ reminderCount: -1 }));
    await expect(c.save()).rejects.toThrow(/reminderCount/);
  });

  it('persists default status = valid and reminderCount = 0', async () => {
    const c = await new Credential({
      employeeId: oid(),
      kind: 'bls',
      labelAr: 'شهادة الإنعاش القلبي الرئوي الأساسي',
      issueNumber: 'BLS-' + Date.now(),
    }).save();
    expect(c.status).toBe('valid');
    expect(c.reminderCount).toBe(0);
  });

  it('exposes KINDS / STATUSES / SEVERITY_BY_KIND module constants', () => {
    expect(Credential.KINDS).toContain('scfhs-license');
    expect(Credential.KINDS).toContain('iqama');
    expect(Credential.STATUSES).toContain('valid');
    expect(Credential.STATUSES).toContain('expired');
    expect(Credential.SEVERITY_BY_KIND['scfhs-license']).toBe('critical');
    expect(Credential.SEVERITY_BY_KIND['iqama']).toBe('critical');
  });
});
