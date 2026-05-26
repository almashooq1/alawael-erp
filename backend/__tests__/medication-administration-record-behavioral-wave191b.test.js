'use strict';

/**
 * medication-administration-record-behavioral-wave191b.test.js — behavioral
 * coverage for W191b MedicationAdministrationRecord (MAR).
 *
 * The per-dose ledger required by CBAHI + the Saudi regulation on health
 * professions executive bylaw (اللائحة التنفيذية لمزاولة المهن الصحية).
 * One Medication produces many MAR rows (one per scheduled dose).
 *
 * 3 Wave-18 invariants on the __invariants validator:
 *   1. status='administered' → actualTime + (administeredBy | administeredByName) required
 *   2. status='refused' → refusalReason required (trim non-empty)
 *   3. isControlled=true + status='administered' → witnessedBy or witnessedByName required
 *
 * Per CLAUDE.md doctrine — 26× application across W38 + W39 + W41 + W191b +
 * W193b + W356-W470. Second entry from the Clinical-operations lower-priority
 * group (W193b shipped first; this closes the MAR safety-critical gap).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/medication-administration-record-behavioral-wave191b.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MAR;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w191b-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  MAR = require('../models/MedicationAdministrationRecord');
  await MAR.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MAR.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

// Baseline = scheduled dose (no extra invariants required yet)
function baseRecord(overrides = {}) {
  return {
    beneficiaryId: oid(),
    medicationName: 'Methylphenidate 10mg',
    date: new Date(),
    scheduledTime: new Date(),
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W191b behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new MAR({ ...baseRecord(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without medicationName', async () => {
    const p = new MAR({ ...baseRecord(), medicationName: undefined });
    await expect(p.save()).rejects.toThrow(/medicationName/);
  });

  it('REJECTS without date', async () => {
    const p = new MAR({ ...baseRecord(), date: undefined });
    await expect(p.save()).rejects.toThrow(/date/);
  });

  it('REJECTS without scheduledTime', async () => {
    const p = new MAR({ ...baseRecord(), scheduledTime: undefined });
    await expect(p.save()).rejects.toThrow(/scheduledTime/);
  });

  it('SAVES baseline scheduled record + defaults populate', async () => {
    const doc = await MAR.create(baseRecord());
    expect(doc.status).toBe('scheduled');
    expect(doc.route).toBe('oral');
    expect(doc.isControlled).toBe(false);
    expect(doc.dose).toBe('');
  });
});

// ─── 2. Enum validation ───────────────────────────────────────────────

describe('W191b behavioral — status enum (5 lifecycle states)', () => {
  for (const valid of ['scheduled', 'missed', 'held']) {
    it(`SAVES status='${valid}' (no extra invariant)`, async () => {
      const doc = await MAR.create(baseRecord({ status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  it('REJECTS invalid status', async () => {
    const p = new MAR(baseRecord({ status: 'forgotten' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W191b behavioral — route enum (7 administration routes)', () => {
  for (const valid of [
    'oral',
    'topical',
    'injection',
    'inhaled',
    'rectal',
    'eye_drops',
    'ear_drops',
  ]) {
    it(`SAVES route='${valid}'`, async () => {
      const doc = await MAR.create(baseRecord({ route: valid }));
      expect(doc.route).toBe(valid);
    });
  }

  it('REJECTS invalid route', async () => {
    const p = new MAR(baseRecord({ route: 'subcutaneous_implant' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Wave-18: administered status requires actualTime + administrator ──

describe('W191b behavioral — administered status invariants', () => {
  it('REJECTS status=administered without actualTime', async () => {
    const p = new MAR(baseRecord({ status: 'administered', administeredBy: oid() }));
    await expect(p.save()).rejects.toThrow(/actualTime.*required when status=administered/);
  });

  it('REJECTS status=administered without administrator (neither ID nor name)', async () => {
    const p = new MAR(baseRecord({ status: 'administered', actualTime: new Date() }));
    await expect(p.save()).rejects.toThrow(
      /administeredBy.*administeredBy or administeredByName required/
    );
  });

  it('SAVES status=administered with administeredBy (ObjectId)', async () => {
    const doc = await MAR.create(
      baseRecord({
        status: 'administered',
        actualTime: new Date(),
        administeredBy: oid(),
      })
    );
    expect(doc.status).toBe('administered');
  });

  it('SAVES status=administered with administeredByName (string fallback for offline entries)', async () => {
    const doc = await MAR.create(
      baseRecord({
        status: 'administered',
        actualTime: new Date(),
        administeredByName: 'RN Sara Al-Otaibi',
      })
    );
    expect(doc.administeredByName).toBe('RN Sara Al-Otaibi');
  });

  it('non-administered status does NOT require actualTime', async () => {
    const doc = await MAR.create(baseRecord({ status: 'scheduled' }));
    expect(doc.actualTime).toBeNull();
  });
});

// ─── 4. Wave-18: refused status requires refusalReason ────────────────

describe('W191b behavioral — refused status invariants', () => {
  it('REJECTS status=refused without refusalReason', async () => {
    const p = new MAR(baseRecord({ status: 'refused' }));
    await expect(p.save()).rejects.toThrow(/refusalReason.*required when status=refused/);
  });

  it('REJECTS status=refused with whitespace-only refusalReason', async () => {
    const p = new MAR(baseRecord({ status: 'refused', refusalReason: '    ' }));
    await expect(p.save()).rejects.toThrow(/refusalReason/);
  });

  it('SAVES status=refused with documented refusalReason', async () => {
    const doc = await MAR.create(
      baseRecord({
        status: 'refused',
        refusalReason:
          'Beneficiary clamped jaw; non-coercive approach per BIP — re-attempt in 30 min',
      })
    );
    expect(doc.status).toBe('refused');
  });
});

// ─── 5. Wave-18: controlled-substance witness invariant ───────────────

describe('W191b behavioral — controlled-substance witness invariant', () => {
  it('REJECTS isControlled=true + status=administered without any witness', async () => {
    const p = new MAR(
      baseRecord({
        medicationName: 'Methylphenidate 10mg (Schedule II)',
        isControlled: true,
        status: 'administered',
        actualTime: new Date(),
        administeredBy: oid(),
      })
    );
    await expect(p.save()).rejects.toThrow(
      /witnessedBy.*controlled-substance administration requires a witness/
    );
  });

  it('SAVES isControlled=true with witnessedBy (ObjectId)', async () => {
    const doc = await MAR.create(
      baseRecord({
        medicationName: 'Methylphenidate 10mg (Schedule II)',
        isControlled: true,
        status: 'administered',
        actualTime: new Date(),
        administeredBy: oid(),
        witnessedBy: oid(),
      })
    );
    expect(doc.isControlled).toBe(true);
  });

  it('SAVES isControlled=true with witnessedByName (string fallback)', async () => {
    const doc = await MAR.create(
      baseRecord({
        medicationName: 'Diazepam PRN',
        isControlled: true,
        status: 'administered',
        actualTime: new Date(),
        administeredByName: 'RN Sara',
        witnessedByName: 'RN Maryam (witness)',
      })
    );
    expect(doc.witnessedByName).toBe('RN Maryam (witness)');
  });

  it('isControlled=true + status=refused does NOT require witness (refusal is not administration)', async () => {
    const doc = await MAR.create(
      baseRecord({
        medicationName: 'Methylphenidate 10mg',
        isControlled: true,
        status: 'refused',
        refusalReason: 'Beneficiary refused; no PRN trigger',
      })
    );
    expect(doc.status).toBe('refused');
    expect(doc.witnessedBy).toBeNull();
  });

  it('isControlled=false + status=administered does NOT require witness', async () => {
    const doc = await MAR.create(
      baseRecord({
        status: 'administered',
        actualTime: new Date(),
        administeredBy: oid(),
      })
    );
    expect(doc.isControlled).toBe(false);
    expect(doc.witnessedBy).toBeNull();
  });
});

// ─── 6. Indexes + collection ─────────────────────────────────────────

describe('W191b behavioral — indexes + collection', () => {
  it('declares the 3 documented compound indexes', async () => {
    const indexes = await MAR.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+scheduledTime');
    expect(keys).toContain('date+status');
    expect(keys).toContain('branchId+date');
  });

  it('uses canonical collection name medication_administration_records', () => {
    expect(MAR.collection.collectionName).toBe('medication_administration_records');
  });
});

// ─── 7. End-to-end MAR lifecycle ──────────────────────────────────────

describe('W191b behavioral — full scheduled → administered + side-effect tracking', () => {
  it('records a controlled-substance dose with witness + observed side-effect', async () => {
    const benId = oid();
    const nurseId = oid();
    const witnessId = oid();

    // 1. Scheduled dose (auto-generated by Medication schedule worker)
    const dose = await MAR.create({
      beneficiaryId: benId,
      medicationId: oid(),
      medicationName: 'Methylphenidate 10mg',
      dose: '10mg',
      route: 'oral',
      isControlled: true,
      date: new Date(),
      scheduledTime: new Date(),
      status: 'scheduled',
    });
    expect(dose.status).toBe('scheduled');

    // 2. Administered — actualTime + nurse + witness for Schedule II
    dose.status = 'administered';
    dose.actualTime = new Date();
    dose.administeredBy = nurseId;
    dose.administeredByName = 'RN Sara Al-Otaibi';
    dose.witnessedBy = witnessId;
    dose.witnessedByName = 'RN Maryam';
    dose.sideEffects = 'Mild appetite suppression noted at lunch (expected)';
    await dose.save();

    const reloaded = await MAR.findById(dose._id);
    expect(reloaded.status).toBe('administered');
    expect(reloaded.actualTime).toBeInstanceOf(Date);
    expect(reloaded.witnessedBy.toString()).toBe(witnessId.toString());
    expect(reloaded.sideEffects).toMatch(/appetite/);
  });
});
