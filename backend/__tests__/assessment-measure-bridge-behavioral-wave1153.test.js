'use strict';

/**
 * assessment-measure-bridge-behavioral-wave1153.test.js — gap #6 behavioral.
 *
 * Proves the canonical assessment→measure bridge (MeasureApplication.assessmentId
 * → ClinicalAssessment) supports the backward traversal "which measure
 * administrations came from this assessment?" against an in-memory MongoDB, and
 * that the W1153 index is registered. Paired with the static guard
 * `assessment-measure-bridge-wave1153.test.js`.
 *
 * Docs are seeded via raw collection.insertMany — MeasureApplication carries
 * heavy W210/W211 governance validation; the read pipeline (index + query) is
 * what gap #6 is about, so we test it on raw BSON the way a live DB holds it.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #6.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/assessment-measure-bridge-behavioral-wave1153.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MeasureApplication;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1153-assessment-measure-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  MeasureApplication = require('../domains/goals/models/MeasureApplication').MeasureApplication;
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasureApplication.collection.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('gap #6 (W1153) — assessment→measure bridge behavioral', () => {
  test('backward query: find all measure administrations sourced from a given assessment', async () => {
    const assessmentA = oid();
    const assessmentB = oid();
    const beneficiaryId = oid();
    await MeasureApplication.collection.insertMany([
      { beneficiaryId, measureId: oid(), assessmentId: assessmentA },
      { beneficiaryId, measureId: oid(), assessmentId: assessmentA },
      { beneficiaryId, measureId: oid(), assessmentId: assessmentB },
      { beneficiaryId, measureId: oid() }, // standalone — no assessment source
    ]);

    const fromA = await MeasureApplication.find({ assessmentId: assessmentA }).lean();
    expect(fromA).toHaveLength(2);

    const fromB = await MeasureApplication.find({ assessmentId: assessmentB }).lean();
    expect(fromB).toHaveLength(1);
  });

  test('a standalone administration (no assessmentId) is simply absent from the bridge query', async () => {
    const beneficiaryId = oid();
    await MeasureApplication.collection.insertMany([
      { beneficiaryId, measureId: oid() },
      { beneficiaryId, measureId: oid() },
    ]);
    const linked = await MeasureApplication.find({ assessmentId: { $ne: null } }).lean();
    expect(linked).toHaveLength(0);
  });

  test('the assessmentId index is registered on the collection', async () => {
    const indexes = await MeasureApplication.collection.indexes();
    const hasIndex = indexes.some(ix => ix.key && ix.key.assessmentId === 1);
    expect(hasIndex).toBe(true);
  });
});
