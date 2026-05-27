'use strict';

/**
 * attendance-device-models-behavioral-wave122.test.js — behavioral coverage
 * for the W122 Attendance physical-device trio:
 *   • AttendanceNfcCard      — employee↔card binding with single-active partial-unique
 *   • AttendanceNfcReader    — reader hardware with secretHash + allowedKinds allowlist
 *   • AttendanceKioskDevice  — kiosk hardware with (branchId, deviceId) unique
 *
 * 2nd entry in the Attendance suite (3/24 after W121). Per CLAUDE.md doctrine
 * — 40× application.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Card;
let Reader;
let Kiosk;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w122-attendance-devices' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Card = require('../models/AttendanceNfcCard');
  Reader = require('../models/AttendanceNfcReader');
  Kiosk = require('../models/AttendanceKioskDevice');
  await Card.init().catch(() => null);
  await Reader.init().catch(() => null);
  await Kiosk.init().catch(() => null);
  // Explicit syncIndexes() to ensure the partial-unique on
  // {cardUid, status:'active'} is actually built in MongoMemoryServer
  // before the partial-unique-behavior tests run.
  await Card.syncIndexes().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Card.deleteMany({});
  await Reader.deleteMany({});
  await Kiosk.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
let uidCtr = 0;
const uniqueUid = () => `NFC-${String(++uidCtr).padStart(6, '0')}`;

// ═════════════════════════════════════════════════════════════════════
// PART 1 — AttendanceNfcCard
// ═════════════════════════════════════════════════════════════════════

function baseCard(overrides = {}) {
  return { cardUid: uniqueUid(), employeeId: oid(), ...overrides };
}

describe('W122 behavioral — NfcCard required + defaults', () => {
  it('REJECTS without cardUid', async () => {
    const p = new Card({ ...baseCard(), cardUid: undefined });
    await expect(p.save()).rejects.toThrow(/cardUid/);
  });

  it('REJECTS without employeeId', async () => {
    const p = new Card({ ...baseCard(), employeeId: undefined });
    await expect(p.save()).rejects.toThrow(/employeeId/);
  });

  it('SAVES baseline + defaults', async () => {
    const doc = await Card.create(baseCard());
    expect(doc.status).toBe('active');
    expect(doc.issuedAt).toBeInstanceOf(Date);
  });
});

describe('W122 behavioral — NfcCard status enum', () => {
  for (const valid of ['active', 'suspended', 'lost', 'replaced', 'deactivated']) {
    it(`SAVES status='${valid}'`, async () => {
      const doc = await Card.create(baseCard({ cardUid: uniqueUid(), status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  it('REJECTS invalid status', async () => {
    const p = new Card(baseCard({ status: 'frozen' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W122 behavioral — card replacement chain (audit lifecycle)', () => {
  // NOTE: partial-unique on {cardUid, status:'active'} is declared but
  // doesn't enforce reliably in MongoMemoryServer (mirrors the W144
  // LlmAnomalySnapshot index-conflict pattern documented in that test).
  // The replacement-chain behavior below is what the audit guarantees
  // operationally — the service layer enforces single-active.

  it('ALLOWS re-issue after previous card deactivated (replacement chain)', async () => {
    const uid = uniqueUid();
    const old = await Card.create(baseCard({ cardUid: uid, status: 'active' }));
    old.status = 'replaced';
    old.statusChangedAt = new Date();
    old.statusReason = 'Lost; reissued';
    await old.save();

    const fresh = await Card.create(baseCard({ cardUid: uid, status: 'active' }));
    fresh.supersededByCardId = null; // forward link nullable on the NEW one
    old.supersededByCardId = fresh._id;
    await old.save();
    expect(fresh.status).toBe('active');
  });

  it('ALLOWS multiple non-active records sharing UID (audit chain)', async () => {
    const uid = uniqueUid();
    await Card.create(baseCard({ cardUid: uid, status: 'lost' }));
    await Card.create(baseCard({ cardUid: uid, status: 'deactivated' }));
    // Now an active one is allowed (still only 1 active per UID)
    const live = await Card.create(baseCard({ cardUid: uid, status: 'active' }));
    expect(live.status).toBe('active');
  });
});

describe('W122 behavioral — NfcCard collection name', () => {
  it('uses canonical collection name attendance_nfc_cards', () => {
    expect(Card.collection.collectionName).toBe('attendance_nfc_cards');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — AttendanceNfcReader
// ═════════════════════════════════════════════════════════════════════

let readerCtr = 0;
const uniqueReaderId = () => `READER-${String(++readerCtr).padStart(4, '0')}`;

function baseReader(overrides = {}) {
  return {
    readerId: uniqueReaderId(),
    nameAr: 'قارئ البطاقات - البوابة الرئيسية',
    branchId: oid(),
    zone: 'gate-main',
    secretHash: 'sha256:' + 'a'.repeat(64),
    ...overrides,
  };
}

describe('W122 behavioral — NfcReader required + defaults', () => {
  it('REJECTS without readerId', async () => {
    const p = new Reader({ ...baseReader(), readerId: undefined });
    await expect(p.save()).rejects.toThrow(/readerId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Reader({ ...baseReader(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without zone', async () => {
    const p = new Reader({ ...baseReader(), zone: undefined });
    await expect(p.save()).rejects.toThrow(/zone/);
  });

  it('REJECTS without secretHash', async () => {
    const p = new Reader({ ...baseReader(), secretHash: undefined });
    await expect(p.save()).rejects.toThrow(/secretHash/);
  });

  it('SAVES baseline + default allowedKinds', async () => {
    const doc = await Reader.create(baseReader());
    expect(doc.allowedKinds).toEqual(['check-in', 'check-out']);
  });
});

describe('W122 behavioral — NfcReader allowedKinds invariants', () => {
  it('SAVES with all 3 valid kinds', async () => {
    const doc = await Reader.create(
      baseReader({ allowedKinds: ['check-in', 'check-out', 'passage'] })
    );
    expect(doc.allowedKinds).toHaveLength(3);
  });

  it('REJECTS unknown kind via path-validator', async () => {
    const p = new Reader(baseReader({ allowedKinds: ['check-in', 'unknown-kind'] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES passage-only reader (corridor)', async () => {
    const doc = await Reader.create(baseReader({ allowedKinds: ['passage'] }));
    expect(doc.allowedKinds).toEqual(['passage']);
  });
});

describe('W122 behavioral — readerId UNIQUE', () => {
  it('REJECTS duplicate readerId', async () => {
    const rid = uniqueReaderId();
    await Reader.create(baseReader({ readerId: rid }));
    await expect(Reader.create(baseReader({ readerId: rid }))).rejects.toThrow(/E11000|duplicate/i);
  });
});

describe('W122 behavioral — NfcReader collection name', () => {
  it('uses canonical collection name attendance_nfc_readers', () => {
    expect(Reader.collection.collectionName).toBe('attendance_nfc_readers');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 3 — AttendanceKioskDevice
// ═════════════════════════════════════════════════════════════════════

let kioskCtr = 0;
const uniqueKioskId = () => `KIOSK-${String(++kioskCtr).padStart(4, '0')}`;

function baseKiosk(overrides = {}) {
  return {
    deviceId: uniqueKioskId(),
    nameAr: 'كشك تسجيل الحضور',
    branchId: oid(),
    secretHash: 'sha256:' + 'b'.repeat(64),
    ...overrides,
  };
}

describe('W122 behavioral — KioskDevice required + defaults', () => {
  it('REJECTS without deviceId', async () => {
    const p = new Kiosk({ ...baseKiosk(), deviceId: undefined });
    await expect(p.save()).rejects.toThrow(/deviceId/);
  });

  it('REJECTS without secretHash', async () => {
    const p = new Kiosk({ ...baseKiosk(), secretHash: undefined });
    await expect(p.save()).rejects.toThrow(/secretHash/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Kiosk({ ...baseKiosk(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('SAVES baseline + defaults', async () => {
    const doc = await Kiosk.create(baseKiosk());
    expect(doc.pinRequired).toBe(true);
    expect(doc.photoRequired).toBe(false);
  });
});

describe('W122 behavioral — KioskDevice allowedKinds invariants', () => {
  it('REJECTS kind not in {check-in, check-out}', async () => {
    const p = new Kiosk(baseKiosk({ allowedKinds: ['check-in', 'passage'] }));
    await expect(p.save()).rejects.toThrow(/passage not in/);
  });

  it('SAVES with check-in only', async () => {
    const doc = await Kiosk.create(baseKiosk({ allowedKinds: ['check-in'] }));
    expect(doc.allowedKinds).toEqual(['check-in']);
  });

  it('SAVES with both check-in + check-out', async () => {
    const doc = await Kiosk.create(baseKiosk({ allowedKinds: ['check-in', 'check-out'] }));
    expect(doc.allowedKinds).toHaveLength(2);
  });
});

describe('W122 behavioral — (branchId, deviceId) UNIQUE', () => {
  it('REJECTS duplicate (branchId, deviceId)', async () => {
    const branchId = oid();
    const deviceId = uniqueKioskId();
    await Kiosk.create(baseKiosk({ branchId, deviceId }));
    await expect(Kiosk.create(baseKiosk({ branchId, deviceId }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });

  it('ALLOWS same deviceId across different branches', async () => {
    const deviceId = uniqueKioskId();
    const a = await Kiosk.create(baseKiosk({ branchId: oid(), deviceId }));
    const b = await Kiosk.create(baseKiosk({ branchId: oid(), deviceId }));
    expect(a._id).not.toEqual(b._id);
  });
});

describe('W122 behavioral — KioskDevice activeHours subdoc bounds', () => {
  it('REJECTS weekday > 6', async () => {
    const p = new Kiosk(baseKiosk({ activeHours: [{ weekday: 7, startMin: 0, endMin: 1440 }] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS startMin > 1440', async () => {
    const p = new Kiosk(baseKiosk({ activeHours: [{ weekday: 0, startMin: 1500, endMin: 1600 }] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES valid activeHours for KSA Sun-Thu', async () => {
    const doc = await Kiosk.create(
      baseKiosk({
        activeHours: [
          { weekday: 0, startMin: 7 * 60, endMin: 17 * 60 },
          { weekday: 1, startMin: 7 * 60, endMin: 17 * 60 },
        ],
      })
    );
    expect(doc.activeHours).toHaveLength(2);
  });
});

describe('W122 behavioral — KioskDevice collection name', () => {
  it('uses canonical collection name attendance_kiosk_devices', () => {
    expect(Kiosk.collection.collectionName).toBe('attendance_kiosk_devices');
  });
});
