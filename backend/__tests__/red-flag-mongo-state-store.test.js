/**
 * red-flag-mongo-state-store.test.js — Beneficiary-360 Commit 6.
 *
 * Runs the shared state-store contract suite against the Mongoose-
 * backed implementation. Uses `mongodb-memory-server` so no external
 * Mongo is required. If the suite passes here AND in the in-memory
 * test file, the two adapters are behaviorally equivalent — that is
 * the whole point of Commit 6.
 *
 * Mongo-specific invariants (unique-index race handling, document
 * shape persistence) live in a second describe block below.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createMongoStateStore } = require('../services/redFlagMongoStateStore');
const RedFlagStateModel = require('../models/RedFlagState');
const {
  describeStoreContract,
  makeRegistry,
  flag,
  verdict,
} = require('./helpers/red-flag-store-contract');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'red-flag-test' });
  // Ensure indexes (unique compound) are built before the contract
  // suite starts — otherwise the race-handling test can be flaky.
  await RedFlagStateModel.syncIndexes();
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

// ─── Shared contract ────────────────────────────────────────────

describeStoreContract({
  name: 'mongo',
  createStore: async registry => createMongoStateStore({ registry }),
  // Each test gets a clean collection — avoids cross-test leakage
  // that would otherwise require per-test beneficiary-id namespacing.
  beforeEachHook: async () => {
    await RedFlagStateModel.deleteMany({});
  },
});

// ─── Mongo-specific invariants ──────────────────────────────────

describe('createMongoStateStore — Mongo specifics', () => {
  beforeEach(async () => {
    await RedFlagStateModel.deleteMany({});
  });

  it('throws when registry has no byId()', () => {
    expect(() => createMongoStateStore({ registry: {} })).toThrow(/byId/);
  });

  it('persists the active record with correct fields in the collection', async () => {
    const reg = makeRegistry([flag({ id: 'clinical.persist', severity: 'critical' })]);
    const store = createMongoStateStore({ registry: reg });
    await store.applyVerdicts('BEN-1', [verdict('clinical.persist', 'raised', 77)], {
      now: '2026-04-22T10:00:00.000Z',
    });

    const doc = await RedFlagStateModel.findOne({
      beneficiaryId: 'BEN-1',
      flagId: 'clinical.persist',
      status: 'active',
    }).lean();
    expect(doc).toBeTruthy();
    expect(doc.severity).toBe('critical');
    expect(doc.domain).toBe('clinical');
    expect(doc.observedValue).toBe(77);
    expect(doc.raisedAt).toBeInstanceOf(Date);
  });

  it('removes active record on condition_cleared resolution', async () => {
    const reg = makeRegistry([
      flag({
        id: 'clinical.persist',
        autoResolve: { type: 'condition_cleared', afterHours: null },
        cooldownHours: 24,
      }),
    ]);
    const store = createMongoStateStore({ registry: reg });
    await store.applyVerdicts('BEN-1', [verdict('clinical.persist', 'raised')], {
      now: '2026-04-22T10:00:00.000Z',
    });
    await store.applyVerdicts('BEN-1', [verdict('clinical.persist', 'clear')], {
      now: '2026-04-22T11:00:00.000Z',
    });

    const active = await RedFlagStateModel.findOne({
      beneficiaryId: 'BEN-1',
      flagId: 'clinical.persist',
      status: 'active',
    });
    expect(active).toBeNull();

    const cooldown = await RedFlagStateModel.findOne({
      beneficiaryId: 'BEN-1',
      flagId: 'clinical.persist',
      status: 'cooldown',
    });
    expect(cooldown).toBeTruthy();
    expect(cooldown.resolvedBy).toBe('auto');
  });

  it('unique index prevents duplicate active records for the same (bId, flagId)', async () => {
    // Direct model writes — prove the index is in force.
    await RedFlagStateModel.create({
      beneficiaryId: 'BEN-1',
      flagId: 'clinical.test',
      status: 'active',
      severity: 'warning',
      domain: 'clinical',
      raisedAt: new Date(),
      lastObservedAt: new Date(),
    });
    await expect(
      RedFlagStateModel.create({
        beneficiaryId: 'BEN-1',
        flagId: 'clinical.test',
        status: 'active',
        severity: 'warning',
        domain: 'clinical',
        raisedAt: new Date(),
        lastObservedAt: new Date(),
      })
    ).rejects.toThrow(/E11000|duplicate key/);
  });

  it('two concurrent applyVerdicts calls race-safely; only one reports newlyRaised', async () => {
    const reg = makeRegistry([flag({ id: 'clinical.race' })]);
    const store = createMongoStateStore({ registry: reg });

    const v = verdict('clinical.race', 'raised');
    const now = '2026-04-22T10:00:00.000Z';
    const [r1, r2] = await Promise.all([
      store.applyVerdicts('BEN-1', [v], { now }),
      store.applyVerdicts('BEN-1', [v], { now }),
    ]);

    const totalNewlyRaised = r1.newlyRaised.length + r2.newlyRaised.length;
    const totalStillRaised = r1.stillRaised.length + r2.stillRaised.length;
    expect(totalNewlyRaised).toBe(1);
    expect(totalStillRaised).toBe(1);

    const docs = await RedFlagStateModel.find({
      beneficiaryId: 'BEN-1',
      flagId: 'clinical.race',
      status: 'active',
    }).lean();
    expect(docs).toHaveLength(1);
  });
});
