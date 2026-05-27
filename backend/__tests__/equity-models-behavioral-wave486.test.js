'use strict';

/**
 * equity-models-behavioral-wave486.test.js — behavioral counterpart to
 * `equity-models-wave486.test.js` (static drift guard). MongoMemoryServer.
 *
 * Validates W485 + W486 Wave-18 invariants against a real Mongoose
 * runtime (per CLAUDE.md feedback_pair_static_with_behavioral_tests).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let EquityDisparityAlert;
let OutcomeBenchmark;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w486-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  EquityDisparityAlert = require('../models/EquityDisparityAlert');
  OutcomeBenchmark = require('../models/OutcomeBenchmark');
  await EquityDisparityAlert.init();
  await OutcomeBenchmark.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await EquityDisparityAlert.deleteMany({});
  await OutcomeBenchmark.deleteMany({});
});

function baseAlert(overrides = {}) {
  const now = Date.now();
  return {
    branchId: new mongoose.Types.ObjectId(),
    dimension: 'gender',
    metricKind: 'gas_avg_tscore',
    periodStart: new Date(now - 90 * 86400_000),
    periodEnd: new Date(now - 1 * 86400_000),
    periodKind: 'quarterly',
    findings: [
      {
        cohort: 'F',
        n: 40,
        mean: 38,
        vsReference: {
          referenceKey: 'M',
          referenceMean: 50,
          effectSize: -2.5,
          severity: 'major',
          flagged: true,
        },
      },
    ],
    overallSeverity: 'major',
    flaggedCount: 1,
    signatureHash: 'a'.repeat(64),
    status: 'open',
    generatedBy: 'equity_engine_cron',
    ...overrides,
  };
}

function baseBenchmark(overrides = {}) {
  return {
    scope: 'national',
    metricKind: 'gas_avg_tscore',
    centralTendency: 50,
    centralTendencyKind: 'mean',
    standardDeviation: 5,
    percentile25: 45,
    percentile75: 55,
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-03-31'),
    status: 'draft',
    ...overrides,
  };
}

describe('W485 — EquityDisparityAlert behavioral', () => {
  it('accepts a well-formed alert', async () => {
    const doc = await EquityDisparityAlert.create(baseAlert());
    expect(doc._id).toBeDefined();
    expect(doc.overallSeverity).toBe('major');
  });

  it('rejects when periodStart >= periodEnd', async () => {
    const now = Date.now();
    await expect(
      EquityDisparityAlert.create(
        baseAlert({
          periodStart: new Date(now),
          periodEnd: new Date(now - 86400_000),
        })
      )
    ).rejects.toThrow(/periodStart must be before periodEnd/);
  });

  it('rejects overallSeverity=none', async () => {
    await expect(
      EquityDisparityAlert.create(baseAlert({ overallSeverity: 'none' }))
    ).rejects.toThrow(/overallSeverity=none should not be persisted/);
  });

  it('rejects status=dismissed without dismissalReason', async () => {
    await expect(EquityDisparityAlert.create(baseAlert({ status: 'dismissed' }))).rejects.toThrow(
      /dismissed status requires dismissalReason/
    );
  });

  it('rejects status=dismissed with short dismissalReason (<5)', async () => {
    await expect(
      EquityDisparityAlert.create(baseAlert({ status: 'dismissed', dismissalReason: 'no' }))
    ).rejects.toThrow(/dismissed status requires dismissalReason/);
  });

  it('accepts status=dismissed with valid dismissalReason', async () => {
    const doc = await EquityDisparityAlert.create(
      baseAlert({
        status: 'dismissed',
        dismissalReason: 'duplicate of earlier alert',
      })
    );
    expect(doc.status).toBe('dismissed');
    expect(doc.dismissedAt).toBeInstanceOf(Date);
  });

  it('auto-fills acknowledgedAt on status=acknowledged', async () => {
    const doc = await EquityDisparityAlert.create(baseAlert({ status: 'acknowledged' }));
    expect(doc.acknowledgedAt).toBeInstanceOf(Date);
  });

  it('auto-fills resolvedAt on status=resolved', async () => {
    const doc = await EquityDisparityAlert.create(baseAlert({ status: 'resolved' }));
    expect(doc.resolvedAt).toBeInstanceOf(Date);
  });

  it('enforces signatureHash unique index (idempotency contract for W487)', async () => {
    const hash = 'b'.repeat(64);
    await EquityDisparityAlert.create(baseAlert({ signatureHash: hash }));
    await expect(
      EquityDisparityAlert.create(
        baseAlert({
          signatureHash: hash,
          branchId: new mongoose.Types.ObjectId(),
        })
      )
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('stores findings array intact', async () => {
    const doc = await EquityDisparityAlert.create(baseAlert());
    expect(doc.findings).toHaveLength(1);
    expect(doc.findings[0].n).toBe(40);
    expect(doc.findings[0].vsReference.severity).toBe('major');
    expect(doc.findings[0].vsReference.flagged).toBe(true);
  });

  it('rejects invalid dimension enum', async () => {
    await expect(EquityDisparityAlert.create(baseAlert({ dimension: 'bogus' }))).rejects.toThrow();
  });

  it('rejects invalid metricKind enum', async () => {
    await expect(EquityDisparityAlert.create(baseAlert({ metricKind: 'bogus' }))).rejects.toThrow();
  });
});

describe('W486 — OutcomeBenchmark behavioral', () => {
  it('accepts a well-formed national benchmark', async () => {
    const doc = await OutcomeBenchmark.create(baseBenchmark());
    expect(doc._id).toBeDefined();
    expect(doc.scope).toBe('national');
  });

  it('rejects scope=branch without branchId', async () => {
    await expect(OutcomeBenchmark.create(baseBenchmark({ scope: 'branch' }))).rejects.toThrow(
      /scope=branch requires branchId/
    );
  });

  it('accepts scope=branch with branchId', async () => {
    const doc = await OutcomeBenchmark.create(
      baseBenchmark({
        scope: 'branch',
        branchId: new mongoose.Types.ObjectId(),
      })
    );
    expect(doc.scope).toBe('branch');
  });

  it('rejects scope=regional without region', async () => {
    await expect(OutcomeBenchmark.create(baseBenchmark({ scope: 'regional' }))).rejects.toThrow(
      /scope=regional requires region/
    );
  });

  it('rejects percentile25 > percentile75', async () => {
    await expect(
      OutcomeBenchmark.create(baseBenchmark({ percentile25: 60, percentile75: 50 }))
    ).rejects.toThrow(/percentile25 must be <= percentile75/);
  });

  it('rejects periodStart >= periodEnd', async () => {
    await expect(
      OutcomeBenchmark.create(
        baseBenchmark({
          periodStart: new Date('2026-03-31'),
          periodEnd: new Date('2026-01-01'),
        })
      )
    ).rejects.toThrow(/periodStart must be before periodEnd/);
  });

  it('auto-fills publishedAt on status=published', async () => {
    const doc = await OutcomeBenchmark.create(baseBenchmark({ status: 'published' }));
    expect(doc.publishedAt).toBeInstanceOf(Date);
  });

  it('auto-fills retiredAt on status=retired', async () => {
    const doc = await OutcomeBenchmark.create(baseBenchmark({ status: 'retired' }));
    expect(doc.retiredAt).toBeInstanceOf(Date);
  });

  it('accepts dimensionFilters subdoc with gender + age_band', async () => {
    const doc = await OutcomeBenchmark.create(
      baseBenchmark({
        dimensionFilters: { gender: 'F', age_band: '6-12' },
      })
    );
    expect(doc.dimensionFilters.gender).toBe('F');
    expect(doc.dimensionFilters.age_band).toBe('6-12');
  });

  it('rejects invalid age_band enum', async () => {
    await expect(
      OutcomeBenchmark.create(baseBenchmark({ dimensionFilters: { age_band: '99' } }))
    ).rejects.toThrow();
  });

  it('rejects standardDeviation < 0', async () => {
    await expect(
      OutcomeBenchmark.create(baseBenchmark({ standardDeviation: -1 }))
    ).rejects.toThrow();
  });
});
