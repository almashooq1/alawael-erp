/**
 * nphies-claim-model-behavioral-wave1437.test.js
 *
 * W1437 — NphiesClaim submission timestamp invariants.
 *
 *   1. nphies.submission.updatedAt defaults to creation time.
 *   2. Saving a claim with nphies.submission changes stamps updatedAt.
 *   3. nphies.submission.updatedBy is persisted when set.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/nphies-claim-model-behavioral-wave1437.test.js --runInBand
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let NphiesClaim;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1437-nphies-claim' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  NphiesClaim = require('../models/NphiesClaim');
  await NphiesClaim.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await NphiesClaim.deleteMany({});
});

function baseClaim(overrides = {}) {
  return {
    claimNumber: `CLM-${Math.random().toString(36).slice(2, 10)}`,
    beneficiary: new mongoose.Types.ObjectId(),
    memberId: 'MBR-1',
    serviceDate: new Date(),
    totalAmount: 100,
    nphies: {
      submission: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        claimReference: 'REF-001',
      },
    },
    ...overrides,
  };
}

describe('W1437 — NphiesClaim submission.updatedAt', () => {
  it('defaults updatedAt on creation', async () => {
    const doc = await NphiesClaim.create(baseClaim());
    expect(doc.nphies.submission.updatedAt).toBeInstanceOf(Date);
    expect(doc.nphies.submission.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('preserves updatedBy when set', async () => {
    const doc = await NphiesClaim.create(
      baseClaim({ nphies: { submission: { updatedBy: 'webhook' } } })
    );
    expect(doc.nphies.submission.updatedBy).toBe('webhook');
  });

  it('stamps updatedAt on submission change via pre-save hook', async () => {
    const doc = await NphiesClaim.create(baseClaim());
    const firstUpdatedAt = doc.nphies.submission.updatedAt.getTime();

    await new Promise(r => setTimeout(r, 50));

    doc.nphies.submission.status = 'APPROVED';
    doc.nphies.submission.updatedBy = 'sweeper';
    await doc.save();

    expect(doc.nphies.submission.updatedAt.getTime()).toBeGreaterThan(firstUpdatedAt);
    expect(doc.nphies.submission.updatedBy).toBe('sweeper');
  });

  it('does not mutate updatedAt when submission is unchanged', async () => {
    const doc = await NphiesClaim.create(baseClaim());
    const firstUpdatedAt = doc.nphies.submission.updatedAt.getTime();

    doc.totalAmount = 200;
    await doc.save();

    expect(doc.nphies.submission.updatedAt.getTime()).toBe(firstUpdatedAt);
  });
});
