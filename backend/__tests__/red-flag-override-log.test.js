/**
 * red-flag-override-log.test.js — Beneficiary-360 Commit 8.
 *
 * Mix of unit tests against an in-memory fake model + integration
 * tests against mongodb-memory-server. The fake model lets us pin
 * the service contract without DB overhead; the real-model block
 * verifies the Mongoose schema (required fields, indexes).
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createOverrideLog } = require('../services/redFlagOverrideLog');

// ─── In-memory fake model ───────────────────────────────────────

function makeFakeModel() {
  const docs = [];
  let idSeq = 1;
  return {
    docs,
    async create(input) {
      const doc = {
        _id: `fake-${idSeq++}`,
        ...input,
        overriddenAt: input.overriddenAt instanceof Date ? input.overriddenAt : new Date(),
      };
      docs.push(doc);
      return { ...doc, toObject: () => doc };
    },
    find(query) {
      let result = [...docs];
      if (query.beneficiaryId) {
        result = result.filter(d => d.beneficiaryId === query.beneficiaryId);
      }
      if (query.overriddenAt && query.overriddenAt.$gte) {
        const cutoff = new Date(query.overriddenAt.$gte).getTime();
        result = result.filter(d => new Date(d.overriddenAt).getTime() >= cutoff);
      }
      return {
        sort(spec) {
          if (spec && spec.overriddenAt === -1) {
            result.sort(
              (a, b) => new Date(b.overriddenAt).getTime() - new Date(a.overriddenAt).getTime()
            );
          }
          return this;
        },
        limit(n) {
          result = result.slice(0, n);
          return this;
        },
        lean: async () => result,
      };
    },
  };
}

// ─── Unit: validation ───────────────────────────────────────────

describe('createOverrideLog — validation', () => {
  it('rejects missing beneficiaryId', async () => {
    const log = createOverrideLog({ model: makeFakeModel() });
    await expect(log.record({ overriddenBy: 'dr', reason: 'enough text here' })).rejects.toThrow(
      /beneficiaryId/
    );
  });

  it('rejects missing overriddenBy', async () => {
    const log = createOverrideLog({ model: makeFakeModel() });
    await expect(
      log.record({ beneficiaryId: 'BEN-1', reason: 'enough text here' })
    ).rejects.toThrow(/overriddenBy/);
  });

  it('rejects short reason', async () => {
    const log = createOverrideLog({ model: makeFakeModel() });
    await expect(
      log.record({ beneficiaryId: 'BEN-1', overriddenBy: 'dr', reason: 'ok' })
    ).rejects.toThrow(/at least 10 characters/);
  });

  it('rejects non-array blockingFlagIds', async () => {
    const log = createOverrideLog({ model: makeFakeModel() });
    await expect(
      log.record({
        beneficiaryId: 'BEN-1',
        overriddenBy: 'dr',
        reason: 'long enough reason',
        blockingFlagIds: 'a,b',
      })
    ).rejects.toThrow(/array/);
  });

  it('trims reason before length check', async () => {
    const log = createOverrideLog({ model: makeFakeModel() });
    await expect(
      log.record({
        beneficiaryId: 'BEN-1',
        overriddenBy: 'dr',
        reason: '        short        ', // 5 chars after trim
      })
    ).rejects.toThrow(/at least 10/);
  });
});

// ─── Unit: recording + querying via fake model ──────────────────

describe('createOverrideLog — record + query (fake model)', () => {
  it('records an override with all fields normalized', async () => {
    const fake = makeFakeModel();
    const log = createOverrideLog({ model: fake });
    const record = await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'dr.ahmed',
      reason: 'حالة طوارئ — تفاقم أعراض',
      blockingFlagIds: ['clinical.consent.treatment.missing_pre_session'],
      context: { sessionId: 'SES-9', therapistId: 'THER-3' },
    });
    expect(record.beneficiaryId).toBe('BEN-1');
    expect(record.overriddenBy).toBe('dr.ahmed');
    expect(record.reason).toBe('حالة طوارئ — تفاقم أعراض');
    expect(record.blockingFlagIds).toEqual(['clinical.consent.treatment.missing_pre_session']);
    expect(record.context.sessionId).toBe('SES-9');
    expect(fake.docs).toHaveLength(1);
  });

  it('listForBeneficiary returns records sorted newest first', async () => {
    const fake = makeFakeModel();
    const log = createOverrideLog({ model: fake });
    await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'a',
      reason: 'first override event',
      overriddenAt: new Date('2026-04-20T08:00:00.000Z'),
    });
    await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'b',
      reason: 'second override event',
      overriddenAt: new Date('2026-04-22T08:00:00.000Z'),
    });
    await log.record({
      beneficiaryId: 'BEN-2',
      overriddenBy: 'c',
      reason: 'other beneficiary',
    });
    const results = await log.listForBeneficiary('BEN-1');
    expect(results).toHaveLength(2);
    expect(results[0].overriddenBy).toBe('b'); // newer first
    expect(results[1].overriddenBy).toBe('a');
  });

  it('listRecent respects sinceIso cutoff', async () => {
    const fake = makeFakeModel();
    const log = createOverrideLog({ model: fake });
    await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'old',
      reason: 'way back when',
      overriddenAt: new Date('2026-04-10T00:00:00.000Z'),
    });
    await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'new',
      reason: 'recent event here',
      overriddenAt: new Date('2026-04-22T00:00:00.000Z'),
    });
    const since = await log.listRecent({ sinceIso: '2026-04-15T00:00:00.000Z' });
    expect(since).toHaveLength(1);
    expect(since[0].overriddenBy).toBe('new');
  });
});

// ─── Integration: real Mongoose model ──────────────────────────

describe('createOverrideLog — integration with real Mongoose model', () => {
  let mongoServer;
  let RedFlagOverride;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
    }
    await mongoose.connect(mongoServer.getUri(), { dbName: 'override-log-test' });
    RedFlagOverride = require('../models/RedFlagOverride');
    await RedFlagOverride.syncIndexes();
  }, 60_000);

  afterAll(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    if (mongoServer) await mongoServer.stop();
  }, 60_000);

  beforeEach(async () => {
    if (RedFlagOverride) await RedFlagOverride.deleteMany({});
  });

  it('persists a full override row to the collection', async () => {
    const log = createOverrideLog({ model: RedFlagOverride });
    const record = await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'dr.ahmed',
      reason: 'حالة طارئة — تدخل ضروري',
      blockingFlagIds: ['clinical.consent.treatment.missing_pre_session'],
      context: { sessionId: 'SES-42', branchId: 'RIY-SOLI' },
    });
    expect(record.id).toBeTruthy();
    const docs = await RedFlagOverride.find({}).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].reason).toBe('حالة طارئة — تدخل ضروري');
    expect(docs[0].context.sessionId).toBe('SES-42');
  });

  it('rejects a record missing required fields at the Mongoose layer too', async () => {
    // Bypass service validation by writing direct — proves the model guards itself
    await expect(
      RedFlagOverride.create({
        beneficiaryId: 'BEN-1',
        // overriddenBy missing
        reason: 'long enough reason',
      })
    ).rejects.toThrow();
  });

  it('stores overriddenAt defaulting to now when not provided', async () => {
    const log = createOverrideLog({ model: RedFlagOverride });
    const before = Date.now();
    const record = await log.record({
      beneficiaryId: 'BEN-1',
      overriddenBy: 'dr.ahmed',
      reason: 'auto timestamp event',
    });
    const stamped = new Date(record.overriddenAt).getTime();
    expect(stamped).toBeGreaterThanOrEqual(before - 1000);
    expect(stamped).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
