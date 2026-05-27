'use strict';

/**
 * attendance-triage-models-behavioral-wave124.test.js — behavioral coverage
 * for the W124 Attendance triage trio:
 *   • AttendanceException        — operator-facing exception queue
 *   • AttendanceCorrectionRequest — employee-submitted correction workflow
 *   • AttendanceAuditChain       — append-only audit log with hash linkage
 *
 * 4th entry in the Attendance suite (10/24 covered after W121 + W122 + W123).
 * Per CLAUDE.md doctrine — 42× application.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/attendance.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Exception;
let Correction;
let AuditChain;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w124-triage-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Exception = require('../models/AttendanceException');
  Correction = require('../models/AttendanceCorrectionRequest');
  AuditChain = require('../models/AttendanceAuditChain');
  await Exception.init().catch(() => null);
  await Correction.init().catch(() => null);
  await AuditChain.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Exception.deleteMany({});
  await Correction.deleteMany({});
  await AuditChain.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

let dedupCtr = 0;
const uniqueDedup = () => `EX:dedup:${++dedupCtr}`;

// ═════════════════════════════════════════════════════════════════════
// PART 1 — AttendanceException
// ═════════════════════════════════════════════════════════════════════

function baseExc(overrides = {}) {
  return {
    kind: 'missing-checkout',
    severity: 'medium',
    ownerRole: 'branch_manager',
    dedupKey: uniqueDedup(),
    summaryAr: 'لم يقم الموظف بتسجيل الخروج بنهاية المناوبة',
    ...overrides,
  };
}

describe('W124 behavioral — Exception required + enums', () => {
  it('REJECTS without kind', async () => {
    const p = new Exception({ ...baseExc(), kind: undefined });
    await expect(p.save()).rejects.toThrow(/kind/);
  });

  it('REJECTS unknown kind', async () => {
    const p = new Exception(baseExc({ kind: 'gravity-anomaly' }));
    await expect(p.save()).rejects.toThrow(/kind/);
  });

  it('REJECTS unknown severity', async () => {
    const p = new Exception(baseExc({ severity: 'mild' }));
    await expect(p.save()).rejects.toThrow(/severity/);
  });

  it('REJECTS without dedupKey', async () => {
    const p = new Exception({ ...baseExc(), dedupKey: undefined });
    await expect(p.save()).rejects.toThrow(/dedupKey/);
  });

  it('REJECTS without summaryAr', async () => {
    const p = new Exception({ ...baseExc(), summaryAr: undefined });
    await expect(p.save()).rejects.toThrow(/summaryAr/);
  });

  it('SAVES baseline + defaults', async () => {
    const doc = await Exception.create(baseExc());
    expect(doc.status).toBe('open');
    expect(doc.detectedAt).toBeInstanceOf(Date);
  });
});

describe('W124 behavioral — Exception severity + status enums', () => {
  for (const sev of ['low', 'medium', 'high', 'critical']) {
    it(`SAVES severity='${sev}'`, async () => {
      const doc = await Exception.create(baseExc({ dedupKey: uniqueDedup(), severity: sev }));
      expect(doc.severity).toBe(sev);
    });
  }

  it('SAVES status=open (default), acknowledged', async () => {
    const doc = await Exception.create(baseExc({ status: 'acknowledged' }));
    expect(doc.status).toBe('acknowledged');
  });
});

describe('W124 behavioral — Exception resolution invariants', () => {
  for (const term of ['resolved', 'dismissed', 'escalated']) {
    it(`REJECTS status='${term}' without resolution.actorId`, async () => {
      const p = new Exception(baseExc({ status: term }));
      await expect(p.save()).rejects.toThrow();
    });

    it(`SAVES status='${term}' with resolution.actorId`, async () => {
      const resolution = {
        actorId: oid(),
        actorRole: 'branch_manager',
        decidedAt: new Date(),
        note: `Operator decided ${term}`,
      };
      // escalated has an additional escalatedToRole requirement
      if (term === 'escalated') resolution.escalatedToRole = 'hr_admin';
      const doc = await Exception.create(baseExc({ status: term, resolution }));
      expect(doc.status).toBe(term);
    });
  }

  it('open status does NOT require resolution', async () => {
    const doc = await Exception.create(baseExc({ status: 'open' }));
    expect(doc.resolution.actorId).toBeNull();
  });
});

describe('W124 behavioral — Exception dedupKey UNIQUE (idempotent detector)', () => {
  it('REJECTS duplicate dedupKey (same detector run twice = no dup row)', async () => {
    const dedupKey = uniqueDedup();
    await Exception.create(baseExc({ dedupKey }));
    await expect(Exception.create(baseExc({ dedupKey }))).rejects.toThrow(/E11000|duplicate/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — AttendanceCorrectionRequest
// ═════════════════════════════════════════════════════════════════════

function baseReq(overrides = {}) {
  return {
    requesterId: oid(),
    kind: 'missing-checkout',
    targetDate: new Date('2026-05-20'),
    reasonAr: 'نسيت تسجيل الخروج بسبب اجتماع طارئ',
    ...overrides,
  };
}

describe('W124 behavioral — CorrectionRequest required + enums', () => {
  it('REJECTS without requesterId', async () => {
    const p = new Correction({ ...baseReq(), requesterId: undefined });
    await expect(p.save()).rejects.toThrow(/requesterId/);
  });

  it('REJECTS without targetDate', async () => {
    const p = new Correction({ ...baseReq(), targetDate: undefined });
    await expect(p.save()).rejects.toThrow(/targetDate/);
  });

  it('REJECTS without reasonAr', async () => {
    const p = new Correction({ ...baseReq(), reasonAr: undefined });
    await expect(p.save()).rejects.toThrow(/reasonAr/);
  });

  for (const valid of [
    'missing-checkin',
    'missing-checkout',
    'edit-time',
    'remote-day',
    'add-leave-day',
  ]) {
    it(`SAVES kind='${valid}'`, async () => {
      const doc = await Correction.create(baseReq({ kind: valid }));
      expect(doc.kind).toBe(valid);
    });
  }

  it('REJECTS invalid kind', async () => {
    const p = new Correction(baseReq({ kind: 'lunch-extension' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES baseline + defaults', async () => {
    const doc = await Correction.create(baseReq());
    expect(doc.status).toBe('pending');
    expect(doc.submittedAt).toBeInstanceOf(Date);
  });
});

describe('W124 behavioral — CorrectionRequest decision invariants', () => {
  it('REJECTS status=approved without decidedAt + decidedByActorId', async () => {
    const p = new Correction(baseReq({ status: 'approved' }));
    await expect(p.save()).rejects.toThrow(/decidedAt.*required when status=approved/);
  });

  it('REJECTS status=rejected without decidedAt', async () => {
    const p = new Correction(baseReq({ status: 'rejected', decidedByActorId: oid() }));
    await expect(p.save()).rejects.toThrow(/decidedAt/);
  });

  it('SAVES status=approved with full decision', async () => {
    const doc = await Correction.create(
      baseReq({
        status: 'approved',
        decidedAt: new Date(),
        decidedByActorId: oid(),
      })
    );
    expect(doc.status).toBe('approved');
  });

  it('SAVES status=rejected with full decision', async () => {
    const doc = await Correction.create(
      baseReq({
        status: 'rejected',
        decidedAt: new Date(),
        decidedByActorId: oid(),
      })
    );
    expect(doc.status).toBe('rejected');
  });

  it('SAVES status=pending or withdrawn without decision', async () => {
    const a = await Correction.create(baseReq({ status: 'pending' }));
    const b = await Correction.create(baseReq({ status: 'withdrawn' }));
    expect(a.status).toBe('pending');
    expect(b.status).toBe('withdrawn');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 3 — AttendanceAuditChain (append-only hash chain)
// ═════════════════════════════════════════════════════════════════════

let seqCtr = 0;
const nextSeq = () => ++seqCtr;
let hashCtr = 0;
const uniqueHash = () => 'h' + String(++hashCtr).padStart(63, '0');

function baseAudit(overrides = {}) {
  const hash = uniqueHash();
  return {
    sequence: nextSeq(),
    action: 'source-event-persisted',
    payload: { eventId: 'evt-001' },
    payloadHash: 'p' + hash.substring(1),
    prevHash: '0'.repeat(64), // genesis
    hash,
    ...overrides,
  };
}

describe('W124 behavioral — AuditChain required + enums', () => {
  it('REJECTS sequence < 0', async () => {
    const p = new AuditChain(baseAudit({ sequence: -1 }));
    await expect(p.save()).rejects.toThrow(/sequence/);
  });

  it('REJECTS unknown action', async () => {
    const p = new AuditChain(baseAudit({ action: 'fabricate' }));
    await expect(p.save()).rejects.toThrow(/action/);
  });

  it('REJECTS without payloadHash', async () => {
    const p = new AuditChain({ ...baseAudit(), payloadHash: undefined });
    await expect(p.save()).rejects.toThrow(/payloadHash/);
  });

  it('REJECTS without prevHash', async () => {
    const p = new AuditChain({ ...baseAudit(), prevHash: undefined });
    await expect(p.save()).rejects.toThrow(/prevHash/);
  });

  it('REJECTS without hash', async () => {
    const p = new AuditChain({ ...baseAudit(), hash: undefined });
    await expect(p.save()).rejects.toThrow(/hash/);
  });

  it('REJECTS without payload', async () => {
    const p = new AuditChain({ ...baseAudit(), payload: undefined });
    await expect(p.save()).rejects.toThrow(/payload/);
  });

  it('SAVES baseline genesis-anchored entry', async () => {
    const doc = await AuditChain.create(baseAudit());
    expect(doc.sequence).toBeGreaterThan(0);
    expect(doc.prevHash).toBe('0'.repeat(64));
    expect(doc.occurredAt).toBeInstanceOf(Date);
  });

  for (const action of [
    'source-event-persisted',
    'reconciliation-run',
    'exception-emitted',
    'correction-approved',
    'payroll-period-locked',
    'privacy-erasure',
  ]) {
    it(`SAVES action='${action}'`, async () => {
      const doc = await AuditChain.create(baseAudit({ action }));
      expect(doc.action).toBe(action);
    });
  }
});

describe('W124 behavioral — AuditChain sequence + hash UNIQUE', () => {
  it('REJECTS duplicate sequence', async () => {
    const seq = nextSeq();
    await AuditChain.create(baseAudit({ sequence: seq }));
    await expect(AuditChain.create(baseAudit({ sequence: seq }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });

  it('REJECTS duplicate hash', async () => {
    const hash = uniqueHash();
    await AuditChain.create(baseAudit({ hash }));
    await expect(AuditChain.create(baseAudit({ hash }))).rejects.toThrow(/E11000|duplicate/i);
  });
});

describe('W124 behavioral — AuditChain hash linkage simulation', () => {
  it('builds a 3-entry chain with each entry referring to predecessor', async () => {
    const e1 = await AuditChain.create({
      sequence: nextSeq(),
      action: 'source-event-persisted',
      payload: { id: 'evt-A' },
      payloadHash: 'ph-A',
      prevHash: '0'.repeat(64),
      hash: 'h-A' + 'a'.repeat(61),
    });

    const e2 = await AuditChain.create({
      sequence: nextSeq(),
      action: 'exception-emitted',
      payload: { excId: 'ex-1' },
      payloadHash: 'ph-B',
      prevHash: e1.hash,
      hash: 'h-B' + 'b'.repeat(61),
    });

    const e3 = await AuditChain.create({
      sequence: nextSeq(),
      action: 'exception-resolved',
      payload: { excId: 'ex-1', actor: 'manager-1' },
      payloadHash: 'ph-C',
      prevHash: e2.hash,
      hash: 'h-C' + 'c'.repeat(61),
    });

    expect(e2.prevHash).toBe(e1.hash);
    expect(e3.prevHash).toBe(e2.hash);

    const chain = await AuditChain.find().sort({ sequence: 1 });
    expect(chain).toHaveLength(3);
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 4 — Collection names
// ═════════════════════════════════════════════════════════════════════

describe('W124 behavioral — canonical collection names', () => {
  it('Exception uses attendance_exceptions', () => {
    expect(Exception.collection.collectionName).toBe('attendance_exceptions');
  });
  it('CorrectionRequest uses attendance_correction_requests', () => {
    expect(Correction.collection.collectionName).toBe('attendance_correction_requests');
  });
  it('AuditChain uses attendance_audit_chain', () => {
    // Mongoose default pluralisation may collapse the name; check
    // the schema-declared one matches the canonical.
    expect(AuditChain.collection.collectionName).toMatch(/attendance_audit_chain/);
  });
});
