'use strict';

/**
 * hikvision-fraud-models-behavioral-wave100.test.js — behavioral coverage for
 * the W100 Phase 5 fraud-detection pair: HikvisionFraudFlag + HikvisionFraudScore.
 *
 * The two models flow together: detection engine emits a Flag, the score
 * service aggregates flags into a per-employee Score (denormalised for fast
 * UI lookup). Batching them follows the LLM-anomaly + Productivity precedent.
 *
 * HikvisionFraudFlag invariants:
 *   1. evidenceProcessedEventIds non-empty (audit trail required)
 *   2. state='dismissed' requires resolverId + resolverNote + scoreImpact=0
 *   3. state='escalated' requires escalatedToRole
 *   4. kind ≠ 'unregistered-repeat' requires employeeId
 *
 * HikvisionFraudScore invariants:
 *   1. currentScore in [0, 100]
 *   2. flagCount.{open+acknowledged+dismissed+escalated+expired} ≤ flagCount.total
 *   3. employeeId UNIQUE (one score per employee)
 *
 * Per CLAUDE.md doctrine — 32× application. Second + third Hikvision suite
 * entries; the privacy/safety-critical batch (W97 face templates + W100 fraud)
 * now complete.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hikvision-fraud-models-behavioral-wave100.test.js --runInBand
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Flag;
let Score;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w100-hikvision-fraud-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Flag = require('../models/HikvisionFraudFlag');
  Score = require('../models/HikvisionFraudScore');
  await Flag.init().catch(() => null);
  await Score.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Flag.deleteMany({});
  await Score.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ═════════════════════════════════════════════════════════════════════
// PART 1 — HikvisionFraudFlag
// ═════════════════════════════════════════════════════════════════════

function baseFlag(overrides = {}) {
  return {
    kind: 'repeat-mismatch',
    severity: 'medium',
    employeeId: oid(),
    evidenceProcessedEventIds: [oid(), oid(), oid()],
    scoreImpact: 15,
    ...overrides,
  };
}

describe('W100 behavioral — HikvisionFraudFlag required + enums', () => {
  it('REJECTS without kind', async () => {
    const p = new Flag({ ...baseFlag(), kind: undefined });
    await expect(p.save()).rejects.toThrow(/kind/);
  });

  it('REJECTS without severity', async () => {
    const p = new Flag({ ...baseFlag(), severity: undefined });
    await expect(p.save()).rejects.toThrow(/severity/);
  });

  it('SAVES baseline open flag + defaults', async () => {
    const doc = await Flag.create(baseFlag());
    expect(doc.state).toBe('open');
    expect(doc.detectedBy).toBe('engine');
    expect(doc.detectedAt).toBeInstanceOf(Date);
  });

  it('REJECTS invalid kind enum', async () => {
    const p = new Flag(baseFlag({ kind: 'rumor-detected' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const valid of [
    'repeat-mismatch',
    'shared-identity',
    'off-hours-access',
    'burst-access',
    'impossible-travel',
    'anti-spoof-trend',
    'template-inactive-used',
  ]) {
    it(`SAVES kind='${valid}' (employeeId-required path)`, async () => {
      const doc = await Flag.create(baseFlag({ kind: valid }));
      expect(doc.kind).toBe(valid);
    });
  }

  it('REJECTS invalid severity', async () => {
    const p = new Flag(baseFlag({ severity: 'extreme' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid state enum', async () => {
    const p = new Flag(baseFlag({ state: 'unresolved' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS scoreImpact > 100', async () => {
    const p = new Flag(baseFlag({ scoreImpact: 150 }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W100 behavioral — evidence audit trail invariant', () => {
  it('REJECTS empty evidenceProcessedEventIds array', async () => {
    const p = new Flag(baseFlag({ evidenceProcessedEventIds: [] }));
    await expect(p.save()).rejects.toThrow(
      /every flag must cite at least one processed event as evidence/
    );
  });

  it('REJECTS undefined evidenceProcessedEventIds (treated as empty)', async () => {
    const p = new Flag(baseFlag({ evidenceProcessedEventIds: undefined }));
    await expect(p.save()).rejects.toThrow(/every flag must cite at least one processed event/);
  });

  it('SAVES with ≥1 evidence event', async () => {
    const doc = await Flag.create(baseFlag({ evidenceProcessedEventIds: [oid()] }));
    expect(doc.evidenceProcessedEventIds).toHaveLength(1);
  });
});

describe('W100 behavioral — kind ≠ unregistered-repeat requires employeeId', () => {
  it('REJECTS repeat-mismatch without employeeId', async () => {
    const p = new Flag(baseFlag({ kind: 'repeat-mismatch', employeeId: null }));
    await expect(p.save()).rejects.toThrow(/repeat-mismatch flags require employeeId/);
  });

  it('REJECTS shared-identity without employeeId', async () => {
    const p = new Flag(baseFlag({ kind: 'shared-identity', employeeId: null }));
    await expect(p.save()).rejects.toThrow(/shared-identity flags require employeeId/);
  });

  it('ALLOWS unregistered-repeat WITHOUT employeeId (the exception)', async () => {
    const doc = await Flag.create(
      baseFlag({
        kind: 'unregistered-repeat',
        employeeId: null,
        hikvisionPersonId: null, // unregistered face — no person ID either
      })
    );
    expect(doc.kind).toBe('unregistered-repeat');
    expect(doc.employeeId).toBeNull();
  });
});

describe('W100 behavioral — dismissed-state invariants', () => {
  it('REJECTS state=dismissed without resolverId', async () => {
    const p = new Flag(
      baseFlag({ state: 'dismissed', scoreImpact: 0, resolverNote: 'false positive' })
    );
    await expect(p.save()).rejects.toThrow(/dismissed flags require resolverId/);
  });

  it('REJECTS state=dismissed without resolverNote', async () => {
    const p = new Flag(baseFlag({ state: 'dismissed', scoreImpact: 0, resolverId: oid() }));
    await expect(p.save()).rejects.toThrow(/dismissed flags require resolverNote/);
  });

  it('REJECTS state=dismissed with non-zero scoreImpact', async () => {
    const p = new Flag(
      baseFlag({
        state: 'dismissed',
        scoreImpact: 30,
        resolverId: oid(),
        resolverNote: 'reviewed — was a calibration artifact',
      })
    );
    await expect(p.save()).rejects.toThrow(/dismissed flags must have scoreImpact = 0/);
  });

  it('SAVES dismissed flag with resolver + note + scoreImpact=0', async () => {
    const doc = await Flag.create(
      baseFlag({
        state: 'dismissed',
        scoreImpact: 0,
        resolverId: oid(),
        resolverRole: 'security_lead',
        resolverNote:
          'Confirmed false positive — burst-access from legitimate handoff during shift change',
        resolvedAt: new Date(),
      })
    );
    expect(doc.state).toBe('dismissed');
  });
});

describe('W100 behavioral — escalated state requires escalatedToRole', () => {
  it('REJECTS state=escalated without escalatedToRole', async () => {
    const p = new Flag(baseFlag({ state: 'escalated' }));
    await expect(p.save()).rejects.toThrow(/escalated flags require escalatedToRole/);
  });

  it('SAVES state=escalated with target role', async () => {
    const doc = await Flag.create(
      baseFlag({
        state: 'escalated',
        escalatedToRole: 'dpo',
        resolverId: oid(),
        resolverNote: 'Cross-branch impossible-travel pattern — escalating to DPO for PDPL review',
      })
    );
    expect(doc.escalatedToRole).toBe('dpo');
  });
});

describe('W100 behavioral — HikvisionFraudFlag indexes + collection', () => {
  it('declares per-state + per-kind compound indexes', async () => {
    const indexes = await Flag.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('employeeId+state+detectedAt');
    expect(keys).toContain('kind+severity+detectedAt');
    expect(keys).toContain('state+detectedAt');
  });

  it('uses canonical collection name hikvision_fraud_flags', () => {
    expect(Flag.collection.collectionName).toBe('hikvision_fraud_flags');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — HikvisionFraudScore
// ═════════════════════════════════════════════════════════════════════

function baseScore(overrides = {}) {
  return {
    employeeId: oid(),
    currentScore: 0,
    band: 'low',
    flagCount: { open: 0, acknowledged: 0, dismissed: 0, escalated: 0, expired: 0, total: 0 },
    ...overrides,
  };
}

describe('W100 behavioral — HikvisionFraudScore required + defaults', () => {
  it('REJECTS without employeeId', async () => {
    const p = new Score({ currentScore: 0, band: 'low' });
    await expect(p.save()).rejects.toThrow(/employeeId/);
  });

  it('SAVES baseline zero-score record + defaults', async () => {
    const doc = await Score.create({ employeeId: oid() });
    expect(doc.currentScore).toBe(0);
    expect(doc.band).toBe('low');
    expect(doc.lastFlagId).toBeNull();
  });

  it('REJECTS duplicate employeeId (UNIQUE)', async () => {
    const employeeId = oid();
    await Score.create(baseScore({ employeeId }));
    await expect(Score.create(baseScore({ employeeId }))).rejects.toThrow(/E11000|duplicate/i);
  });
});

describe('W100 behavioral — currentScore [0,100] bounds', () => {
  it('REJECTS currentScore > 100', async () => {
    const p = new Score(baseScore({ currentScore: 150 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS currentScore < 0', async () => {
    const p = new Score(baseScore({ currentScore: -10 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES at boundaries 0 + 100', async () => {
    const a = await Score.create(baseScore({ employeeId: oid(), currentScore: 0 }));
    const b = await Score.create(
      baseScore({ employeeId: oid(), currentScore: 100, band: 'critical' })
    );
    expect(a.currentScore).toBe(0);
    expect(b.currentScore).toBe(100);
  });
});

describe('W100 behavioral — band enum (4 traffic-light tiers)', () => {
  for (const valid of ['low', 'medium', 'high', 'critical']) {
    it(`SAVES band='${valid}'`, async () => {
      const doc = await Score.create(baseScore({ employeeId: oid(), band: valid }));
      expect(doc.band).toBe(valid);
    });
  }

  it('REJECTS invalid band', async () => {
    const p = new Score(baseScore({ band: 'severe' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W100 behavioral — flagCount sum invariant', () => {
  it('REJECTS when state-sum exceeds total', async () => {
    const p = new Score(
      baseScore({
        flagCount: {
          open: 5,
          acknowledged: 3,
          dismissed: 2,
          escalated: 1,
          expired: 1,
          total: 5, // sum = 12, total = 5 → invalid
        },
      })
    );
    await expect(p.save()).rejects.toThrow(/sum of states.*exceeds total/);
  });

  it('SAVES when state-sum === total', async () => {
    const doc = await Score.create(
      baseScore({
        flagCount: { open: 3, acknowledged: 1, dismissed: 1, escalated: 0, expired: 0, total: 5 },
      })
    );
    expect(doc.flagCount.total).toBe(5);
  });

  it('SAVES when state-sum < total (some states not present in current snapshot)', async () => {
    const doc = await Score.create(
      baseScore({
        flagCount: { open: 1, acknowledged: 0, dismissed: 0, escalated: 0, expired: 0, total: 5 },
      })
    );
    expect(doc.flagCount.total).toBe(5);
  });

  it('REJECTS flagCount.open < 0', async () => {
    const p = new Score(
      baseScore({
        flagCount: { open: -1, acknowledged: 0, dismissed: 0, escalated: 0, expired: 0, total: 0 },
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W100 behavioral — HikvisionFraudScore indexes + collection', () => {
  it('employeeId is UNIQUE index', async () => {
    const indexes = await Score.collection.indexes();
    const emp = indexes.find(i => Object.keys(i.key).join('+') === 'employeeId');
    expect(emp).toBeDefined();
    expect(emp.unique).toBe(true);
  });

  it('declares band+currentScore compound for traffic-light dashboard', async () => {
    const indexes = await Score.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('band+currentScore');
  });

  it('uses canonical collection name hikvision_fraud_scores', () => {
    expect(Score.collection.collectionName).toBe('hikvision_fraud_scores');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 3 — End-to-end fraud-detection pipeline
// ═════════════════════════════════════════════════════════════════════

describe('W100 behavioral — Flag → Score aggregation pipeline', () => {
  it('records multiple flags → fraud score reflects aggregate band escalation', async () => {
    const employeeId = oid();
    const branchId = oid();

    // 1. Initial flag (medium repeat-mismatch)
    const f1 = await Flag.create({
      kind: 'repeat-mismatch',
      severity: 'medium',
      employeeId,
      branchId,
      evidenceProcessedEventIds: [oid(), oid(), oid()],
      scoreImpact: 15,
      summary: '3 confidence-fail events on template TPL_001 within 30min window',
    });
    expect(f1.state).toBe('open');

    // 2. Second flag — high-severity impossible-travel
    const f2 = await Flag.create({
      kind: 'impossible-travel',
      severity: 'high',
      employeeId,
      branchId,
      evidenceProcessedEventIds: [oid()],
      scoreImpact: 30,
      summary: 'Same template matched at Riyadh + Jeddah within 90min',
    });
    expect(f2.severity).toBe('high');

    // 3. Aggregate score reflects both flags
    const score = await Score.create({
      employeeId,
      currentScore: 45, // 15 + 30 = 45 → still 'medium' band
      band: 'medium',
      flagCount: { open: 2, acknowledged: 0, dismissed: 0, escalated: 0, expired: 0, total: 2 },
      lastFlagId: f2._id,
      lastFlagAt: f2.detectedAt,
      primaryBranchId: branchId,
    });
    expect(score.currentScore).toBe(45);
    expect(score.band).toBe('medium');

    // 4. Operator dismisses f1 as false positive
    f1.state = 'dismissed';
    f1.scoreImpact = 0;
    f1.resolverId = oid();
    f1.resolverRole = 'security_lead';
    f1.resolverNote = 'Calibration drift in camera 03; reseated lens, no real issue';
    f1.resolvedAt = new Date();
    await f1.save();

    // 5. Score updated to reflect only the remaining high flag
    score.currentScore = 30;
    score.band = 'medium';
    score.flagCount = {
      open: 1,
      acknowledged: 0,
      dismissed: 1,
      escalated: 0,
      expired: 0,
      total: 2,
    };
    score.lastComputedAt = new Date();
    await score.save();

    const reloaded = await Score.findOne({ employeeId });
    expect(reloaded.currentScore).toBe(30);
    expect(reloaded.flagCount.dismissed).toBe(1);
  });
});
