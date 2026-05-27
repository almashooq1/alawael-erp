'use strict';

/**
 * hikvision-branch-config-behavioral-wave98.test.js — behavioral coverage
 * for HikvisionBranchConfig (per-branch threshold overrides).
 *
 * Wave-18 invariants:
 *   1. branchId required (path-level + invariant)
 *   2. revision > 1 → lastEditedBy required (audit trail)
 *   3. confidenceThresholds keys MUST be in registry allowlist
 *   4. fraudDefaults keys MUST be in registry allowlist
 *
 * Plus branchId UNIQUE (one config per branch).
 *
 * Per CLAUDE.md doctrine — 35× application. 6th Hikvision suite entry.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Config;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w98-branch-config-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Config = require('../models/HikvisionBranchConfig');
  await Config.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Config.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

function baseCfg(overrides = {}) {
  return { branchId: oid(), ...overrides };
}

// ─── 1. Required fields + defaults ──────────────────────────────────

describe('W98 behavioral — required fields + defaults', () => {
  it('REJECTS without branchId', async () => {
    const p = new Config({});
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('SAVES baseline first-time config + defaults populate', async () => {
    const doc = await Config.create(baseCfg());
    expect(doc.revision).toBe(1);
    expect(doc.confidenceThresholds).toEqual({});
    expect(doc.fraudDefaults).toEqual({});
    expect(doc.lastEditedBy).toBeNull();
  });

  it('REJECTS revision < 1', async () => {
    const p = new Config(baseCfg({ revision: 0 }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 2. branchId UNIQUE ────────────────────────────────────────────

describe('W98 behavioral — branchId UNIQUE', () => {
  it('REJECTS 2nd config for same branchId', async () => {
    const branchId = oid();
    await Config.create(baseCfg({ branchId }));
    await expect(Config.create(baseCfg({ branchId }))).rejects.toThrow(/E11000|duplicate/i);
  });

  it('ALLOWS configs for different branches', async () => {
    const a = await Config.create(baseCfg());
    const b = await Config.create(baseCfg());
    expect(a._id).not.toEqual(b._id);
  });
});

// ─── 3. Wave-18: revision > 1 requires lastEditedBy ────────────────

describe('W98 behavioral — revision > 1 requires lastEditedBy', () => {
  it('SAVES revision=1 without lastEditedBy (system-seed exception)', async () => {
    const doc = await Config.create(baseCfg());
    expect(doc.revision).toBe(1);
    expect(doc.lastEditedBy).toBeNull();
  });

  it('REJECTS revision=2 without lastEditedBy', async () => {
    const p = new Config(baseCfg({ revision: 2 }));
    await expect(p.save()).rejects.toThrow(/lastEditedBy.*required for revisions > 1/);
  });

  it('SAVES revision=2 with lastEditedBy populated', async () => {
    const doc = await Config.create(
      baseCfg({ revision: 2, lastEditedBy: oid(), lastEditedAt: new Date() })
    );
    expect(doc.revision).toBe(2);
    expect(doc.lastEditedBy).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('SAVES at high revision with attribution intact', async () => {
    const doc = await Config.create(
      baseCfg({ revision: 47, lastEditedBy: oid(), lastEditedAt: new Date() })
    );
    expect(doc.revision).toBe(47);
  });
});

// ─── 4. Wave-18: confidenceThresholds allowlist ────────────────────

describe('W98 behavioral — confidenceThresholds keys must be allowlisted', () => {
  it('SAVES with all 7 documented allowed keys', async () => {
    const doc = await Config.create(
      baseCfg({
        confidenceThresholds: {
          FACE_TERMINAL_AUTO_ACCEPT: 92,
          FACE_TERMINAL_REVIEW_FLOOR: 65,
          CAMERA_GATE_AUTO_ACCEPT: 95,
          CAMERA_GATE_REVIEW_FLOOR: 70,
          CAMERA_CORRIDOR_REVIEW_FLOOR: 60,
          DUPLICATE_SUPPRESSION_WINDOW_MS: 5000,
          CORROBORATION_WINDOW_MS: 30000,
        },
      })
    );
    expect(Object.keys(doc.confidenceThresholds)).toHaveLength(7);
  });

  it('REJECTS unknown confidenceThresholds key', async () => {
    const p = new Config(
      baseCfg({
        confidenceThresholds: {
          FACE_TERMINAL_AUTO_ACCEPT: 92,
          UNKNOWN_FUTURE_KEY: 50, // not in allowlist
        },
      })
    );
    await expect(p.save()).rejects.toThrow(/confidenceThresholds.UNKNOWN_FUTURE_KEY/);
  });

  it('SAVES partial override (single allowed key)', async () => {
    const doc = await Config.create(
      baseCfg({ confidenceThresholds: { FACE_TERMINAL_REVIEW_FLOOR: 68 } })
    );
    expect(doc.confidenceThresholds.FACE_TERMINAL_REVIEW_FLOOR).toBe(68);
  });
});

// ─── 5. Wave-18: fraudDefaults allowlist ───────────────────────────

describe('W98 behavioral — fraudDefaults keys must be allowlisted', () => {
  it('SAVES with all 6 documented allowed fraud keys', async () => {
    const doc = await Config.create(
      baseCfg({
        fraudDefaults: {
          REPEAT_MISMATCH_THRESHOLD: 3,
          REPEAT_MISMATCH_WINDOW_MS: 1800000,
          BURST_THRESHOLD: 10,
          BURST_WINDOW_MS: 60000,
          SHARED_IDENTITY_THRESHOLD: 2,
          SHARED_IDENTITY_WINDOW_MS: 604800000,
        },
      })
    );
    expect(Object.keys(doc.fraudDefaults)).toHaveLength(6);
  });

  it('REJECTS unknown fraudDefaults key', async () => {
    const p = new Config(
      baseCfg({
        fraudDefaults: { BURST_THRESHOLD: 8, COSMIC_THRESHOLD: 5 },
      })
    );
    await expect(p.save()).rejects.toThrow(/fraudDefaults.COSMIC_THRESHOLD/);
  });
});

// ─── 6. notes maxlength ────────────────────────────────────────────

describe('W98 behavioral — notes 500-char cap', () => {
  it('REJECTS notes > 500 chars', async () => {
    const p = new Config(baseCfg({ notes: 'x'.repeat(501) }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES notes at exactly 500 chars (boundary)', async () => {
    const doc = await Config.create(baseCfg({ notes: 'x'.repeat(500) }));
    expect(doc.notes).toHaveLength(500);
  });
});

// ─── 7. Collection name ────────────────────────────────────────────

describe('W98 behavioral — canonical collection name', () => {
  it('uses canonical collection name hikvision_branch_configs', () => {
    expect(Config.collection.collectionName).toBe('hikvision_branch_configs');
  });
});

// ─── 8. End-to-end: seed → operator edit → audit revision ──────────

describe('W98 behavioral — branch config lifecycle (seed → tune → audit)', () => {
  it('creates branch config, operator tunes 2 fraud thresholds, audit chain preserved', async () => {
    const branchId = oid();
    const operatorId = oid();

    // 1. System seeds default (revision=1, no attribution)
    const cfg = await Config.create({
      branchId,
      confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 90 },
      fraudDefaults: { BURST_THRESHOLD: 10 },
      notes: 'Initial config — branch onboarding',
    });
    expect(cfg.revision).toBe(1);

    // 2. Operator tunes after observing data — must attribute
    cfg.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT = 93;
    cfg.fraudDefaults.BURST_THRESHOLD = 8;
    cfg.fraudDefaults.BURST_WINDOW_MS = 90000;
    cfg.notes = 'Tightened burst threshold per Q3 review (saw 12% spike in night shift)';
    cfg.revision = 2;
    cfg.lastEditedBy = operatorId;
    cfg.lastEditedAt = new Date();
    cfg.markModified('confidenceThresholds');
    cfg.markModified('fraudDefaults');
    await cfg.save();
    expect(cfg.revision).toBe(2);

    const reloaded = await Config.findOne({ branchId });
    expect(reloaded.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(93);
    expect(reloaded.fraudDefaults.BURST_THRESHOLD).toBe(8);
    expect(reloaded.lastEditedBy.toString()).toBe(operatorId.toString());
  });
});
