'use strict';

/**
 * attendance-import-models-behavioral-wave123.test.js — behavioral coverage
 * for the W123 Attendance batch-import pair:
 *   • AttendanceImportSource — webhook gateway config (per external source)
 *   • AttendanceImportBatch  — one upload event with payloadHash idempotency
 *
 * 3rd entry in the Attendance suite (7/24 covered after W121 + W122).
 * Per CLAUDE.md doctrine — 41× application.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Source;
let Batch;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w123-import-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Source = require('../models/AttendanceImportSource');
  Batch = require('../models/AttendanceImportBatch');
  await Source.init().catch(() => null);
  await Batch.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Source.deleteMany({});
  await Batch.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

let srcCtr = 0;
const uniqueSourceId = () => `SRC-${String(++srcCtr).padStart(4, '0')}`;

// ═════════════════════════════════════════════════════════════════════
// PART 1 — AttendanceImportSource
// ═════════════════════════════════════════════════════════════════════

function baseSrc(overrides = {}) {
  return {
    sourceId: uniqueSourceId(),
    nameAr: 'بوابة استيراد الحضور',
    secretHash: 'sha256:' + 'a'.repeat(64),
    ...overrides,
  };
}

describe('W123 behavioral — ImportSource required + defaults', () => {
  it('REJECTS without sourceId', async () => {
    const p = new Source({ ...baseSrc(), sourceId: undefined });
    await expect(p.save()).rejects.toThrow(/sourceId/);
  });

  it('REJECTS without nameAr', async () => {
    const p = new Source({ ...baseSrc(), nameAr: undefined });
    await expect(p.save()).rejects.toThrow(/nameAr/);
  });

  it('REJECTS without secretHash', async () => {
    const p = new Source({ ...baseSrc(), secretHash: undefined });
    await expect(p.save()).rejects.toThrow(/secretHash/);
  });

  it('SAVES baseline + defaults populate', async () => {
    const doc = await Source.create(baseSrc());
    expect(doc.employeeIdMode).toBe('objectId');
    expect(doc.maxRowsPerBatch).toBe(5000);
    expect(doc.active).toBe(true);
    expect(doc.allowedKinds).toEqual(['check-in', 'check-out']);
  });
});

describe('W123 behavioral — ImportSource employeeIdMode invariants', () => {
  it('SAVES employeeIdMode=objectId without field', async () => {
    const doc = await Source.create(baseSrc({ employeeIdMode: 'objectId' }));
    expect(doc.employeeIdMode).toBe('objectId');
  });

  it('REJECTS employeeIdMode=externalKey without employeeIdField', async () => {
    const p = new Source(baseSrc({ employeeIdMode: 'externalKey' }));
    await expect(p.save()).rejects.toThrow(
      /employeeIdField.*required when employeeIdMode=externalKey/
    );
  });

  it('SAVES employeeIdMode=externalKey with employeeIdField', async () => {
    const doc = await Source.create(
      baseSrc({ employeeIdMode: 'externalKey', employeeIdField: 'employee_external_id' })
    );
    expect(doc.employeeIdField).toBe('employee_external_id');
  });

  it('REJECTS invalid employeeIdMode enum', async () => {
    const p = new Source(baseSrc({ employeeIdMode: 'guess' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W123 behavioral — ImportSource maxRowsPerBatch bounds', () => {
  it('REJECTS maxRowsPerBatch > 50000', async () => {
    const p = new Source(baseSrc({ maxRowsPerBatch: 60000 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS maxRowsPerBatch < 1', async () => {
    const p = new Source(baseSrc({ maxRowsPerBatch: 0 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES at 50000 boundary', async () => {
    const doc = await Source.create(baseSrc({ maxRowsPerBatch: 50000 }));
    expect(doc.maxRowsPerBatch).toBe(50000);
  });
});

describe('W123 behavioral — ImportSource allowedKinds + sourceId UNIQUE', () => {
  it('REJECTS unknown allowedKind', async () => {
    const p = new Source(baseSrc({ allowedKinds: ['check-in', 'unknown'] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS duplicate sourceId', async () => {
    const sid = uniqueSourceId();
    await Source.create(baseSrc({ sourceId: sid }));
    await expect(Source.create(baseSrc({ sourceId: sid }))).rejects.toThrow(/E11000|duplicate/i);
  });

  it('SAVES with branchScope populated', async () => {
    const doc = await Source.create(baseSrc({ branchScope: [oid(), oid()] }));
    expect(doc.branchScope).toHaveLength(2);
  });
});

describe('W123 behavioral — ImportSource collection name', () => {
  it('uses canonical collection name attendance_import_sources', () => {
    expect(Source.collection.collectionName).toBe('attendance_import_sources');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — AttendanceImportBatch
// ═════════════════════════════════════════════════════════════════════

let hashCtr = 0;
const uniqueHash = () => 'sha256:' + String(++hashCtr).padStart(60, '0');

function baseBatch(overrides = {}) {
  return {
    sourceId: uniqueSourceId(),
    payloadHash: uniqueHash(),
    totalRows: 100,
    ...overrides,
  };
}

describe('W123 behavioral — ImportBatch required + defaults', () => {
  it('REJECTS without sourceId', async () => {
    const p = new Batch({ ...baseBatch(), sourceId: undefined });
    await expect(p.save()).rejects.toThrow(/sourceId/);
  });

  it('REJECTS without payloadHash', async () => {
    const p = new Batch({ ...baseBatch(), payloadHash: undefined });
    await expect(p.save()).rejects.toThrow(/payloadHash/);
  });

  it('REJECTS without totalRows', async () => {
    const p = new Batch({ ...baseBatch(), totalRows: undefined });
    await expect(p.save()).rejects.toThrow(/totalRows/);
  });

  it('SAVES baseline + defaults', async () => {
    const doc = await Batch.create(baseBatch());
    expect(doc.status).toBe('processing');
    expect(doc.acceptedRows).toBe(0);
    expect(doc.rejectedRows).toBe(0);
    expect(doc.duplicateRows).toBe(0);
    expect(doc.submittedAt).toBeInstanceOf(Date);
  });
});

describe('W123 behavioral — ImportBatch status enum', () => {
  for (const valid of ['accepted', 'partially-accepted', 'rejected', 'processing']) {
    it(`SAVES status='${valid}'`, async () => {
      const doc = await Batch.create(baseBatch({ status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  it('REJECTS invalid status', async () => {
    const p = new Batch(baseBatch({ status: 'pending' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W123 behavioral — ImportBatch row-count bounds', () => {
  it('REJECTS totalRows < 0', async () => {
    const p = new Batch(baseBatch({ totalRows: -1 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS acceptedRows < 0', async () => {
    const p = new Batch(baseBatch({ acceptedRows: -1 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES totalRows=0 (empty batch — caller validation)', async () => {
    const doc = await Batch.create(baseBatch({ totalRows: 0 }));
    expect(doc.totalRows).toBe(0);
  });
});

describe('W123 behavioral — ImportBatch idempotency: (sourceId, payloadHash) UNIQUE', () => {
  it('REJECTS duplicate (sourceId, payloadHash) — idempotent re-upload', async () => {
    const sourceId = uniqueSourceId();
    const payloadHash = uniqueHash();
    await Batch.create(baseBatch({ sourceId, payloadHash }));
    await expect(
      Batch.create(baseBatch({ sourceId, payloadHash, totalRows: 200 }))
    ).rejects.toThrow(/E11000|duplicate/i);
  });

  it('ALLOWS same payloadHash from different sourceId', async () => {
    const payloadHash = uniqueHash();
    const a = await Batch.create(baseBatch({ sourceId: uniqueSourceId(), payloadHash }));
    const b = await Batch.create(baseBatch({ sourceId: uniqueSourceId(), payloadHash }));
    expect(a._id).not.toEqual(b._id);
  });

  it('ALLOWS same sourceId with different payloadHash (sequential uploads)', async () => {
    const sourceId = uniqueSourceId();
    const a = await Batch.create(baseBatch({ sourceId }));
    const b = await Batch.create(baseBatch({ sourceId }));
    expect(a._id).not.toEqual(b._id);
  });
});

describe('W123 behavioral — ImportBatch rejectionSamples subdoc', () => {
  it('persists rejection samples for operator triage', async () => {
    const doc = await Batch.create(
      baseBatch({
        status: 'partially-accepted',
        totalRows: 100,
        acceptedRows: 97,
        rejectedRows: 3,
        rejectionSamples: [
          { rowIndex: 5, reason: 'employeeId not recognized', payload: { rawId: 'X' } },
          { rowIndex: 42, reason: 'invalid timestamp format' },
          { rowIndex: 78, reason: 'unknown allowedKind' },
        ],
      })
    );
    expect(doc.rejectionSamples).toHaveLength(3);
    expect(doc.rejectionSamples[0].rowIndex).toBe(5);
  });

  it('REJECTS rejectionSample without rowIndex', async () => {
    const p = new Batch(baseBatch({ rejectionSamples: [{ reason: 'missing rowIndex sample' }] }));
    await expect(p.save()).rejects.toThrow(/rowIndex/);
  });

  it('REJECTS rejectionSample without reason', async () => {
    const p = new Batch(baseBatch({ rejectionSamples: [{ rowIndex: 1 }] }));
    await expect(p.save()).rejects.toThrow(/reason/);
  });
});

describe('W123 behavioral — ImportBatch collection name', () => {
  it('uses canonical collection name attendance_import_batches', () => {
    expect(Batch.collection.collectionName).toBe('attendance_import_batches');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 3 — End-to-end ingestion pipeline
// ═════════════════════════════════════════════════════════════════════

describe('W123 behavioral — gateway → source → batch lifecycle', () => {
  it('configures source + accepts 2 batches with idempotent retry rejected', async () => {
    // 1. Operator provisions an external-key source (HRIS feed)
    const source = await Source.create({
      sourceId: 'hris-feed-001',
      nameAr: 'تغذية موارد بشرية',
      secretHash: 'sha256:hashed-secret-value',
      employeeIdMode: 'externalKey',
      employeeIdField: 'hr_employee_code',
      branchScope: [oid()],
      maxRowsPerBatch: 10000,
    });
    expect(source.active).toBe(true);

    // 2. First batch upload — processing state
    const batch1 = await Batch.create({
      sourceId: source.sourceId,
      payloadHash: 'sha256:' + 'b'.repeat(64),
      totalRows: 250,
      submitterIp: '10.20.30.40',
    });
    expect(batch1.status).toBe('processing');

    // 3. Worker completes: partially accepted
    batch1.status = 'partially-accepted';
    batch1.acceptedRows = 247;
    batch1.rejectedRows = 3;
    batch1.rejectionSamples = [
      { rowIndex: 12, reason: 'unknown hr_employee_code' },
      { rowIndex: 89, reason: 'duplicate within batch' },
      { rowIndex: 201, reason: 'invalid check-in timestamp' },
    ];
    batch1.eventBatchRefId = 'batch-ref-001';
    await batch1.save();
    expect(batch1.status).toBe('partially-accepted');

    // 4. Idempotent retry rejected (operator re-uploads same payload)
    await expect(
      Batch.create({
        sourceId: source.sourceId,
        payloadHash: batch1.payloadHash,
        totalRows: 250,
      })
    ).rejects.toThrow(/E11000|duplicate/i);

    // 5. Second batch with new hash succeeds
    const batch2 = await Batch.create({
      sourceId: source.sourceId,
      payloadHash: 'sha256:' + 'c'.repeat(64),
      totalRows: 100,
    });
    expect(batch2._id).not.toEqual(batch1._id);
  });
});
