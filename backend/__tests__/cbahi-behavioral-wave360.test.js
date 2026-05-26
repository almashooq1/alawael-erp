'use strict';

/**
 * cbahi-behavioral-wave360.test.js — behavioral counterpart to
 * `cbahi-wave360.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - status enum (draft/met/partially_met/not_met/not_applicable)
 *   - standardKey must exist in CBAHI registry (45 standards)
 *   - status=met ⇒ at least one evidence entry
 *   - status=partially_met ⇒ evidence + gapNotes
 *   - status=not_met ⇒ gapNotes
 *   - status=not_applicable ⇒ naJustification
 *   - non-draft ⇒ assessedBy + assessedAt
 *   - evidence[] entries: type + summary required
 *   - one attestation per (branchId, standardKey) — unique compound
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CbahiAttestation;
let registry;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w360-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  CbahiAttestation = require('../models/CbahiAttestation');
  registry = require('../intelligence/cbahi-standards.registry');
  await CbahiAttestation.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await CbahiAttestation.deleteMany({});
});

const validKey = () => registry.STANDARDS[0].key;
const validKey2 = () => registry.STANDARDS[1].key;

function baseDoc(overrides = {}) {
  return {
    branchId: new mongoose.Types.ObjectId(),
    standardKey: validKey(),
    ...overrides,
  };
}

describe('W360 behavioral — standardKey + uniqueness', () => {
  it('SAVES with valid standardKey from registry', async () => {
    const doc = await CbahiAttestation.create(baseDoc());
    expect(doc.status).toBe('draft');
  });

  it('REJECTS unknown standardKey not in registry', async () => {
    const p = new CbahiAttestation(baseDoc({ standardKey: 'NOT_A_REAL_STANDARD' }));
    await expect(p.save()).rejects.toThrow(/standardKey/);
  });

  it('REJECTS duplicate (branchId, standardKey)', async () => {
    const bid = new mongoose.Types.ObjectId();
    const key = validKey();
    await CbahiAttestation.create(baseDoc({ branchId: bid, standardKey: key }));
    await expect(
      CbahiAttestation.create(baseDoc({ branchId: bid, standardKey: key }))
    ).rejects.toThrow();
  });

  it('ALLOWS same standardKey across different branches', async () => {
    const key = validKey2();
    const a = await CbahiAttestation.create(baseDoc({ standardKey: key }));
    const b = await CbahiAttestation.create(baseDoc({ standardKey: key }));
    expect(a._id.toString()).not.toBe(b._id.toString());
  });
});

describe('W360 behavioral — status=met requires evidence', () => {
  it('REJECTS met without evidence', async () => {
    const p = new CbahiAttestation(
      baseDoc({ status: 'met', assessedByName: 'Quality Lead', assessedAt: new Date() })
    );
    await expect(p.save()).rejects.toThrow(/evidence/);
  });

  it('SAVES met with at least one evidence entry', async () => {
    const doc = await CbahiAttestation.create(
      baseDoc({
        status: 'met',
        evidence: [{ type: 'policy_document', summary: 'SOP-2026-001 reviewed' }],
        assessedByName: 'Quality Lead',
        assessedAt: new Date(),
      })
    );
    expect(doc.status).toBe('met');
  });
});

describe('W360 behavioral — status=partially_met needs evidence + gapNotes', () => {
  it('REJECTS partially_met without evidence', async () => {
    const p = new CbahiAttestation(
      baseDoc({
        status: 'partially_met',
        gapNotes: 'Training coverage at 60% of staff',
        assessedByName: 'QL',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/evidence/);
  });

  it('REJECTS partially_met without gapNotes', async () => {
    const p = new CbahiAttestation(
      baseDoc({
        status: 'partially_met',
        evidence: [{ type: 'training_record', summary: '60% of staff trained' }],
        assessedByName: 'QL',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/gapNotes/);
  });

  it('SAVES partially_met with both', async () => {
    const doc = await CbahiAttestation.create(
      baseDoc({
        status: 'partially_met',
        evidence: [{ type: 'training_record', summary: '60% of staff trained' }],
        gapNotes: 'Remaining 40% scheduled for Q2',
        assessedByName: 'QL',
        assessedAt: new Date(),
      })
    );
    expect(doc.status).toBe('partially_met');
  });
});

describe('W360 behavioral — status=not_met / not_applicable invariants', () => {
  it('REJECTS not_met without gapNotes', async () => {
    const p = new CbahiAttestation(
      baseDoc({ status: 'not_met', assessedByName: 'QL', assessedAt: new Date() })
    );
    await expect(p.save()).rejects.toThrow(/gapNotes/);
  });

  it('REJECTS not_applicable without naJustification', async () => {
    const p = new CbahiAttestation(
      baseDoc({ status: 'not_applicable', assessedByName: 'QL', assessedAt: new Date() })
    );
    await expect(p.save()).rejects.toThrow(/naJustification/);
  });

  it('SAVES not_applicable with naJustification', async () => {
    const doc = await CbahiAttestation.create(
      baseDoc({
        status: 'not_applicable',
        naJustification: 'Center does not perform inpatient procedures',
        assessedByName: 'QL',
        assessedAt: new Date(),
      })
    );
    expect(doc.status).toBe('not_applicable');
  });
});

describe('W360 behavioral — non-draft requires assessor', () => {
  it('REJECTS non-draft without assessedBy/Name', async () => {
    const p = new CbahiAttestation(
      baseDoc({
        status: 'met',
        evidence: [{ type: 'policy_document', summary: 'SOP-1' }],
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/assessedBy/);
  });

  it('REJECTS non-draft without assessedAt', async () => {
    const p = new CbahiAttestation(
      baseDoc({
        status: 'met',
        evidence: [{ type: 'policy_document', summary: 'SOP-1' }],
        assessedByName: 'QL',
      })
    );
    await expect(p.save()).rejects.toThrow(/assessedAt/);
  });
});

describe('W360 behavioral — evidence[] integrity', () => {
  it('REJECTS evidence with invalid type', async () => {
    const p = new CbahiAttestation(
      baseDoc({
        status: 'met',
        evidence: [{ type: 'not_real_type', summary: 'X' }],
        assessedByName: 'QL',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS evidence with empty summary', async () => {
    const p = new CbahiAttestation(
      baseDoc({
        status: 'met',
        evidence: [{ type: 'policy_document', summary: '' }],
        assessedByName: 'QL',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W360 behavioral — defaults', () => {
  it('defaults status=draft, evidence=[], history=[]', async () => {
    const doc = await CbahiAttestation.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.evidence).toEqual([]);
    expect(doc.history).toEqual([]);
  });
});
