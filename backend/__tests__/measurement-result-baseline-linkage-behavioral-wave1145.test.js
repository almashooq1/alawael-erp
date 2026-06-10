'use strict';

/**
 * measurement-result-baseline-linkage-behavioral-wave1145.test.js — R5 behavioral.
 *
 * Proves the W1145 baseline-linkage invariants actually FIRE at runtime against
 * an in-memory MongoDB, that a baseline→progress series round-trips, and that
 * the change is ADDITIVE (legacy docs with neither field still save). Paired
 * with the static guard `measurement-result-baseline-linkage-wave1145.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #5 + §XVII R5.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/measurement-result-baseline-linkage-behavioral-wave1145.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MeasurementResult;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1145-baseline-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  MeasurementResult = require('../models/measurement/MeasurementResult.model');
  await MeasurementResult.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasurementResult.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// Minimal valid result satisfying the model's required fields.
function baseResult(overrides = {}) {
  return {
    beneficiaryId: oid(),
    measurementId: oid(),
    typeId: oid(),
    dateAdministrated: new Date('2026-01-01'),
    rawScore: 42,
    overallLevel: 'MODERATE',
    ...overrides,
  };
}

describe('R5 (W1145) — baseline linkage behavioral', () => {
  test('a baseline result + a progress result pointing back to it round-trip', async () => {
    const beneficiaryId = oid();
    const typeId = oid();

    const baseline = await MeasurementResult.create(
      baseResult({ beneficiaryId, typeId, isBaseline: true })
    );
    const progress = await MeasurementResult.create(
      baseResult({
        beneficiaryId,
        typeId,
        dateAdministrated: new Date('2026-03-01'),
        rawScore: 55,
        baselineResultId: baseline._id,
      })
    );

    const fresh = await MeasurementResult.findById(progress._id).lean();
    expect(String(fresh.baselineResultId)).toBe(String(baseline._id));
    expect(fresh.isBaseline).toBe(false); // default
    // change-from-baseline is now directly computable
    expect(progress.rawScore - baseline.rawScore).toBe(13);
  });

  test('invariant 1 fires: a result cannot be its own baseline', async () => {
    const r = new MeasurementResult(baseResult());
    r.baselineResultId = r._id; // self-reference
    await expect(r.save()).rejects.toThrow(/baselineResultId cannot reference the result itself/);
  });

  test('invariant 2 fires: a baseline must not set baselineResultId', async () => {
    const r = new MeasurementResult(baseResult({ isBaseline: true, baselineResultId: oid() }));
    await expect(r.save()).rejects.toThrow(/a baseline result must not set baselineResultId/);
  });

  test('additive — a legacy doc with NEITHER field still saves (no breaking change)', async () => {
    const r = await MeasurementResult.create(baseResult());
    const fresh = await MeasurementResult.findById(r._id).lean();
    expect(fresh.isBaseline).toBe(false); // default applied
    expect(fresh.baselineResultId).toBeNull(); // default applied
  });

  test('a valid baseline (isBaseline=true, no baselineResultId) saves', async () => {
    const r = await MeasurementResult.create(baseResult({ isBaseline: true }));
    expect(r.isBaseline).toBe(true);
    expect(r.baselineResultId).toBeNull();
  });
});
