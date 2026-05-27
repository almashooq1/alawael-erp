'use strict';

/**
 * hikvision-face-library-behavioral-wave97b.test.js — behavioral coverage for
 * HikvisionFaceLibrary (logical container for face templates).
 *
 * Wave-18 invariants:
 *   1. syncStrategy=multi-branch requires allowedBranchIds.length ≥ 2
 *   2. syncStrategy=global requires empty allowedBranchIds
 *   3. usedSlots ≤ capacity (denorm consistency check)
 *
 * Plus capacity ≤ 50000 (MAX_LIBRARY_CAPACITY per Hikvision NVR cap).
 *
 * Per CLAUDE.md doctrine — 36× application. 7th Hikvision suite entry.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Library;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w97b-face-library-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Library = require('../models/HikvisionFaceLibrary');
  await Library.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Library.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

let codeCounter = 0;
function uniqueCode() {
  codeCounter += 1;
  return `LIB-${String(codeCounter).padStart(4, '0')}`;
}

function baseLib(overrides = {}) {
  return {
    libraryCode: uniqueCode(),
    name: 'Day-Care Staff Library — Riyadh',
    branchId: oid(),
    capacity: 5000,
    ...overrides,
  };
}

// ─── 1. Required fields ────────────────────────────────────────────

describe('W97b behavioral — required fields + defaults', () => {
  it('REJECTS without libraryCode', async () => {
    const p = new Library({ ...baseLib(), libraryCode: undefined });
    await expect(p.save()).rejects.toThrow(/libraryCode/);
  });

  it('REJECTS without name', async () => {
    const p = new Library({ ...baseLib(), name: undefined });
    await expect(p.save()).rejects.toThrow(/name/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Library({ ...baseLib(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without capacity', async () => {
    const p = new Library({ ...baseLib(), capacity: undefined });
    await expect(p.save()).rejects.toThrow(/capacity/);
  });

  it('SAVES baseline + defaults', async () => {
    const doc = await Library.create(baseLib());
    expect(doc.syncStrategy).toBe('branch-only');
    expect(doc.status).toBe('active');
    expect(doc.usedSlots).toBe(0);
    expect(doc.allowedBranchIds).toEqual([]);
    expect(doc.devicesSubscribed).toEqual([]);
  });
});

// ─── 2. Capacity bounds ────────────────────────────────────────────

describe('W97b behavioral — capacity 1-50000 bounds', () => {
  it('REJECTS capacity > 50000 (NVR hard cap)', async () => {
    const p = new Library(baseLib({ capacity: 60000 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS capacity < 1', async () => {
    const p = new Library(baseLib({ capacity: 0 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES at boundary 50000', async () => {
    const doc = await Library.create(baseLib({ capacity: 50000 }));
    expect(doc.capacity).toBe(50000);
  });
});

// ─── 3. libraryCode UNIQUE ────────────────────────────────────────

describe('W97b behavioral — libraryCode UNIQUE', () => {
  it('REJECTS duplicate libraryCode', async () => {
    const code = uniqueCode();
    await Library.create(baseLib({ libraryCode: code }));
    await expect(Library.create(baseLib({ libraryCode: code }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });
});

// ─── 4. Enum validation ───────────────────────────────────────────

describe('W97b behavioral — enums', () => {
  for (const valid of ['branch-only', 'multi-branch', 'global']) {
    it(`SAVES syncStrategy='${valid}' with proper allowedBranchIds shape`, async () => {
      const extras =
        valid === 'multi-branch'
          ? { allowedBranchIds: [oid(), oid()] }
          : valid === 'global'
            ? { allowedBranchIds: [] }
            : {};
      const doc = await Library.create(baseLib({ syncStrategy: valid, ...extras }));
      expect(doc.syncStrategy).toBe(valid);
    });
  }

  it('REJECTS invalid syncStrategy', async () => {
    const p = new Library(baseLib({ syncStrategy: 'all-branches' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const valid of ['active', 'paused', 'archived']) {
    it(`SAVES status='${valid}'`, async () => {
      const doc = await Library.create(baseLib({ status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  it('REJECTS invalid status', async () => {
    const p = new Library(baseLib({ status: 'syncing' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 5. Wave-18: multi-branch requires ≥2 allowed branches ─────────

describe('W97b behavioral — multi-branch invariant', () => {
  it('REJECTS multi-branch with empty allowedBranchIds', async () => {
    const p = new Library(baseLib({ syncStrategy: 'multi-branch' }));
    await expect(p.save()).rejects.toThrow(
      /multi-branch strategy requires at least 2 allowed branches/
    );
  });

  it('REJECTS multi-branch with only 1 allowedBranchId', async () => {
    const p = new Library(baseLib({ syncStrategy: 'multi-branch', allowedBranchIds: [oid()] }));
    await expect(p.save()).rejects.toThrow(
      /multi-branch strategy requires at least 2 allowed branches/
    );
  });

  it('SAVES multi-branch with ≥2 allowed branches', async () => {
    const doc = await Library.create(
      baseLib({ syncStrategy: 'multi-branch', allowedBranchIds: [oid(), oid(), oid()] })
    );
    expect(doc.allowedBranchIds).toHaveLength(3);
  });
});

// ─── 6. Wave-18: global requires empty allowedBranchIds ────────────

describe('W97b behavioral — global invariant', () => {
  it('REJECTS global with non-empty allowedBranchIds', async () => {
    const p = new Library(baseLib({ syncStrategy: 'global', allowedBranchIds: [oid(), oid()] }));
    await expect(p.save()).rejects.toThrow(/global strategy must have no allowedBranchIds/);
  });

  it('SAVES global with empty allowedBranchIds', async () => {
    const doc = await Library.create(baseLib({ syncStrategy: 'global', allowedBranchIds: [] }));
    expect(doc.syncStrategy).toBe('global');
  });
});

// ─── 7. Wave-18: usedSlots ≤ capacity ──────────────────────────────

describe('W97b behavioral — usedSlots ≤ capacity invariant', () => {
  it('REJECTS usedSlots > capacity', async () => {
    const p = new Library(baseLib({ capacity: 100, usedSlots: 150 }));
    await expect(p.save()).rejects.toThrow(/usedSlots \(150\) > capacity \(100\)/);
  });

  it('SAVES usedSlots === capacity (at cap)', async () => {
    const doc = await Library.create(baseLib({ capacity: 100, usedSlots: 100 }));
    expect(doc.usedSlots).toBe(100);
  });

  it('SAVES usedSlots < capacity (typical)', async () => {
    const doc = await Library.create(baseLib({ capacity: 5000, usedSlots: 1247 }));
    expect(doc.usedSlots).toBe(1247);
  });

  it('REJECTS usedSlots < 0', async () => {
    const p = new Library(baseLib({ usedSlots: -1 }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 8. Collection name ────────────────────────────────────────────

describe('W97b behavioral — canonical collection name', () => {
  it('uses canonical collection name hikvision_face_libraries', () => {
    expect(Library.collection.collectionName).toBe('hikvision_face_libraries');
  });
});

// ─── 9. End-to-end: branch-only → multi-branch upgrade flow ───────

describe('W97b behavioral — library upgrade lifecycle', () => {
  it('starts as branch-only, upgrades to multi-branch when 2nd branch shares', async () => {
    const primaryBranch = oid();
    const lib = await Library.create(
      baseLib({
        libraryCode: 'CARE-CENTER-A',
        branchId: primaryBranch,
        capacity: 10000,
        syncStrategy: 'branch-only',
        usedSlots: 234,
      })
    );
    expect(lib.syncStrategy).toBe('branch-only');

    // Operator extends to multi-branch (e.g. sister facility opens)
    const sisterBranch = oid();
    lib.syncStrategy = 'multi-branch';
    lib.allowedBranchIds = [primaryBranch, sisterBranch];
    await lib.save();
    expect(lib.syncStrategy).toBe('multi-branch');
    expect(lib.allowedBranchIds).toHaveLength(2);

    // Later: archived (no new enrollments)
    lib.status = 'archived';
    await lib.save();
    expect(lib.status).toBe('archived');
  });
});
