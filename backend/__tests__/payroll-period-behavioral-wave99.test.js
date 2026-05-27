'use strict';

/**
 * payroll-period-behavioral-wave99.test.js — behavioral coverage for
 * W99 Phase 4 PayrollPeriod.
 *
 * Represents one payroll cycle (typically monthly) with a 3-state lifecycle:
 * open → closing → closed. The closed state seals the period — any later
 * change goes through an override ledger (audited). Wave-18 invariants:
 *   1. endDate > startDate
 *   2. status='closed' requires closedAt + closedBy + closeSnapshotHash
 *   3. status='open' must NOT carry any close metadata
 *   4. (branchId, periodCode) UNIQUE compound index
 *
 * Per CLAUDE.md doctrine — 28× application across W38 + W39 + W41 + W99 +
 * W191b + W193b + W200b + W356-W470. First entry from the "Other" backlog
 * category — closes the last single-model BACKLOG.md gap.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/payroll-period-behavioral-wave99.test.js --runInBand
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Period;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w99-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Period = require('../models/PayrollPeriod');
  await Period.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Period.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

let codeCounter = 0;
function uniqueCode() {
  codeCounter += 1;
  return `2026-${String(codeCounter).padStart(2, '0')}`;
}

function basePeriod(overrides = {}) {
  return {
    branchId: oid(),
    periodCode: uniqueCode(),
    startDate: new Date('2026-05-01T00:00:00Z'),
    endDate: new Date('2026-05-31T23:59:59Z'),
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W99 behavioral — required fields', () => {
  it('REJECTS without periodCode', async () => {
    const p = new Period({ ...basePeriod(), periodCode: undefined });
    await expect(p.save()).rejects.toThrow(/periodCode/);
  });

  it('REJECTS without startDate', async () => {
    const p = new Period({ ...basePeriod(), startDate: undefined });
    await expect(p.save()).rejects.toThrow(/startDate/);
  });

  it('REJECTS without endDate', async () => {
    const p = new Period({ ...basePeriod(), endDate: undefined });
    await expect(p.save()).rejects.toThrow(/endDate/);
  });

  it('SAVES baseline open period + defaults populate', async () => {
    const doc = await Period.create(basePeriod());
    expect(doc.status).toBe('open');
    expect(doc.closedAt).toBeNull();
    expect(doc.closedBy).toBeNull();
    expect(doc.closeSnapshotHash).toBeNull();
    expect(doc.casesCounted).toBe(0);
    expect(doc.overrideCount).toBe(0);
  });

  it('REJECTS periodCode > 32 chars', async () => {
    const p = new Period(basePeriod({ periodCode: 'a'.repeat(33) }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 2. (branchId, periodCode) compound uniqueness ────────────────────

describe('W99 behavioral — (branchId, periodCode) UNIQUE compound', () => {
  it('REJECTS duplicate (branchId, periodCode)', async () => {
    const branchId = oid();
    const code = uniqueCode();
    await Period.create(basePeriod({ branchId, periodCode: code }));
    await expect(Period.create(basePeriod({ branchId, periodCode: code }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });

  it('ALLOWS same periodCode across different branches', async () => {
    const code = uniqueCode();
    const a = await Period.create(basePeriod({ branchId: oid(), periodCode: code }));
    const b = await Period.create(basePeriod({ branchId: oid(), periodCode: code }));
    expect(a.periodCode).toBe(code);
    expect(b.periodCode).toBe(code);
    expect(a._id).not.toEqual(b._id);
  });

  it('ALLOWS multiple periodCodes within the same branch', async () => {
    const branchId = oid();
    const a = await Period.create(basePeriod({ branchId, periodCode: '2026-05' }));
    const b = await Period.create(basePeriod({ branchId, periodCode: '2026-06' }));
    expect(a.periodCode).toBe('2026-05');
    expect(b.periodCode).toBe('2026-06');
  });
});

// ─── 3. Status enum ───────────────────────────────────────────────────

describe('W99 behavioral — status enum (3 lifecycle states)', () => {
  it('SAVES status=open (default)', async () => {
    const doc = await Period.create(basePeriod());
    expect(doc.status).toBe('open');
  });

  it('SAVES status=closing (intermediate state during snapshot)', async () => {
    const doc = await Period.create(basePeriod({ status: 'closing' }));
    expect(doc.status).toBe('closing');
  });

  it('REJECTS invalid status', async () => {
    const p = new Period(basePeriod({ status: 'reopened' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Wave-18: endDate > startDate ──────────────────────────────────

describe('W99 behavioral — endDate > startDate invariant', () => {
  it('REJECTS endDate < startDate', async () => {
    const p = new Period(
      basePeriod({
        startDate: new Date('2026-05-31'),
        endDate: new Date('2026-05-01'),
      })
    );
    await expect(p.save()).rejects.toThrow(/endDate must be > startDate/);
  });

  it('REJECTS endDate === startDate', async () => {
    const same = new Date('2026-05-15');
    const p = new Period(basePeriod({ startDate: same, endDate: same }));
    await expect(p.save()).rejects.toThrow(/endDate must be > startDate/);
  });

  it('SAVES with valid endDate > startDate', async () => {
    const doc = await Period.create(basePeriod());
    expect(doc.endDate.getTime()).toBeGreaterThan(doc.startDate.getTime());
  });

  it('SAVES with millisecond difference (smallest valid range)', async () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-01T00:00:00.001Z');
    const doc = await Period.create(basePeriod({ startDate: start, endDate: end }));
    expect(doc.endDate.getTime()).toBeGreaterThan(doc.startDate.getTime());
  });
});

// ─── 5. Wave-18: closed status requires close metadata ────────────────

describe('W99 behavioral — closed status requires closedAt + closedBy + closeSnapshotHash', () => {
  it('REJECTS status=closed without closedAt', async () => {
    const p = new Period(
      basePeriod({
        status: 'closed',
        closedBy: oid(),
        closeSnapshotHash: 'sha256:abc123',
      })
    );
    await expect(p.save()).rejects.toThrow(/closedAt.*closed periods require closedAt/);
  });

  it('REJECTS status=closed without closedBy', async () => {
    const p = new Period(
      basePeriod({
        status: 'closed',
        closedAt: new Date(),
        closeSnapshotHash: 'sha256:abc123',
      })
    );
    await expect(p.save()).rejects.toThrow(/closedBy.*closed periods require closedBy/);
  });

  it('REJECTS status=closed without closeSnapshotHash', async () => {
    const p = new Period(
      basePeriod({
        status: 'closed',
        closedAt: new Date(),
        closedBy: oid(),
      })
    );
    await expect(p.save()).rejects.toThrow(
      /closeSnapshotHash.*closed periods require closeSnapshotHash/
    );
  });

  it('SAVES status=closed with all 3 close metadata fields', async () => {
    const doc = await Period.create(
      basePeriod({
        status: 'closed',
        closedAt: new Date(),
        closedBy: oid(),
        closedByRole: 'payroll_admin',
        closeSnapshotHash: 'sha256:abc123def456' + '0'.repeat(40),
        casesCounted: 42,
      })
    );
    expect(doc.status).toBe('closed');
    expect(doc.closedAt).toBeInstanceOf(Date);
  });
});

// ─── 6. Wave-18: open status must NOT carry close metadata ────────────

describe('W99 behavioral — open status forbids close metadata', () => {
  it('REJECTS status=open with closedAt set', async () => {
    const p = new Period(basePeriod({ status: 'open', closedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/open periods must not carry close metadata/);
  });

  it('REJECTS status=open with closedBy set', async () => {
    const p = new Period(basePeriod({ status: 'open', closedBy: oid() }));
    await expect(p.save()).rejects.toThrow(/open periods must not carry close metadata/);
  });

  it('REJECTS status=open with closeSnapshotHash set', async () => {
    const p = new Period(basePeriod({ status: 'open', closeSnapshotHash: 'sha256:x' }));
    await expect(p.save()).rejects.toThrow(/open periods must not carry close metadata/);
  });

  it('SAVES status=open with all close metadata fields null', async () => {
    const doc = await Period.create(basePeriod({ status: 'open' }));
    expect(doc.closedAt).toBeNull();
    expect(doc.closedBy).toBeNull();
    expect(doc.closeSnapshotHash).toBeNull();
  });
});

// ─── 7. Numeric bounds (casesCounted + overrideCount ≥ 0) ─────────────

describe('W99 behavioral — counter bounds', () => {
  it('REJECTS casesCounted < 0', async () => {
    const p = new Period(basePeriod({ casesCounted: -1 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS overrideCount < 0', async () => {
    const p = new Period(basePeriod({ overrideCount: -5 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with 0 counters (default)', async () => {
    const doc = await Period.create(basePeriod());
    expect(doc.casesCounted).toBe(0);
    expect(doc.overrideCount).toBe(0);
  });
});

// ─── 8. Indexes + collection ─────────────────────────────────────────

describe('W99 behavioral — indexes + collection', () => {
  it('branchId+periodCode is UNIQUE compound index', async () => {
    const indexes = await Period.collection.indexes();
    const compound = indexes.find(i => Object.keys(i.key).join('+') === 'branchId+periodCode');
    expect(compound).toBeDefined();
    expect(compound.unique).toBe(true);
  });

  it('declares status+endDate compound for closed-period lookups', async () => {
    const indexes = await Period.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('status+endDate');
  });

  it('uses canonical collection name payroll_periods', () => {
    expect(Period.collection.collectionName).toBe('payroll_periods');
  });
});

// ─── 9. End-to-end lifecycle ──────────────────────────────────────────

describe('W99 behavioral — open → closing → closed lifecycle', () => {
  it('records a monthly period from open through snapshot close', async () => {
    const branchId = oid();
    const closerId = oid();

    // 1. Open the May 2026 period
    const period = await Period.create({
      branchId,
      periodCode: '2026-05',
      startDate: new Date('2026-05-01T00:00:00Z'),
      endDate: new Date('2026-05-31T23:59:59Z'),
      status: 'open',
    });
    expect(period.status).toBe('open');

    // 2. Begin closing — snapshot computation in progress
    period.status = 'closing';
    await period.save();
    expect(period.status).toBe('closing');

    // 3. Finalize close — write hash + lock
    period.status = 'closed';
    period.closedAt = new Date();
    period.closedBy = closerId;
    period.closedByRole = 'payroll_admin';
    period.closeSnapshotHash = 'sha256:' + 'a'.repeat(64);
    period.casesCounted = 28; // 28 reconciliation cases sealed
    await period.save();

    const reloaded = await Period.findById(period._id);
    expect(reloaded.status).toBe('closed');
    expect(reloaded.closeSnapshotHash).toMatch(/^sha256:/);
    expect(reloaded.casesCounted).toBe(28);
    expect(reloaded.overrideCount).toBe(0); // no overrides yet
  });

  // Note: the "cannot revert closed → open" state transition is NOT enforced
  // at the schema level — the __invariants validator catches a fresh `new
  // Period({status:'open', closedAt:...})` but a save() that flips an
  // existing doc's status may bypass the cross-field check depending on
  // Mongoose's modified-path tracking. The service layer guards this
  // transition via explicit lock-cascade logic — see PayrollPeriod model
  // docblock §"Lock-cascade behaviour" steps 1-5.
});
