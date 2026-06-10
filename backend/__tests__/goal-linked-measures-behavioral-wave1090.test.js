'use strict';

/**
 * goal-linked-measures-behavioral-wave1090.test.js — R1 behavioral counterpart.
 *
 * Proves the Goal.linkedMeasures invariants (golden-thread gap #1) actually
 * fire at runtime against an in-memory MongoDB, and that a valid goal with
 * linked measures round-trips with the expected defaults. Paired with the
 * static guard `goal-linked-measures-wave1090.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III + §XVI.1.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/goal-linked-measures-behavioral-wave1090.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Goal;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1090-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Goal = require('../models/Goal');
  await Goal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Goal.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

function baseGoal(overrides = {}) {
  return {
    title: 'Independent hand washing',
    programId: oid(),
    participantId: oid(),
    ...overrides,
  };
}

describe('R1 (W1090) — Goal.linkedMeasures behavioral', () => {
  test('a goal with a single primary linked measure saves + round-trips defaults', async () => {
    const measureId = oid();
    const g = await Goal.create(
      baseGoal({
        linkedMeasures: [{ measureId, targetScore: 80, targetDirection: 'increase' }],
      })
    );
    const fresh = await Goal.findById(g._id).lean();
    expect(fresh.linkedMeasures).toHaveLength(1);
    expect(String(fresh.linkedMeasures[0].measureId)).toBe(String(measureId));
    expect(fresh.linkedMeasures[0].role).toBe('primary'); // default
    expect(fresh.linkedMeasures[0].baselineResultId).toBeNull(); // default
    expect(fresh.linkedMeasures[0].targetScore).toBe(80);
    expect(fresh.linkedMeasures[0].targetDirection).toBe('increase');
    expect(fresh.linkedMeasures[0].addedAt).toBeInstanceOf(Date); // default
  });

  test('defaults to an empty array when omitted (legacy Goal records stay valid)', async () => {
    const g = await Goal.create(baseGoal());
    expect(Array.isArray(g.linkedMeasures)).toBe(true);
    expect(g.linkedMeasures).toHaveLength(0);
  });

  test('invariant 1: rejects two primary measures on the same goal', async () => {
    await expect(
      Goal.create(
        baseGoal({
          linkedMeasures: [
            { measureId: oid(), role: 'primary' },
            { measureId: oid(), role: 'primary' },
          ],
        })
      )
    ).rejects.toThrow(/at most one entry may have role: primary/);
  });

  test('allows one primary + one secondary measure', async () => {
    const g = await Goal.create(
      baseGoal({
        linkedMeasures: [
          { measureId: oid(), role: 'primary' },
          { measureId: oid(), role: 'secondary' },
        ],
      })
    );
    expect(g.linkedMeasures).toHaveLength(2);
  });

  test('invariant 2: rejects a duplicate measureId within the array', async () => {
    const dup = oid();
    await expect(
      Goal.create(
        baseGoal({
          linkedMeasures: [
            { measureId: dup, role: 'primary' },
            { measureId: dup, role: 'secondary' },
          ],
        })
      )
    ).rejects.toThrow(/duplicate measureId/);
  });

  test('invariant 3: rejects targetScore set without targetDirection', async () => {
    await expect(
      Goal.create(
        baseGoal({
          linkedMeasures: [{ measureId: oid(), targetScore: 50 }],
        })
      )
    ).rejects.toThrow(/targetScore set without targetDirection/);
  });

  test('the linkedMeasures.measureId index exists for outcome dashboards', async () => {
    const indexes = await Goal.collection.indexes();
    const hasIdx = indexes.some(ix => ix.key && ix.key['linkedMeasures.measureId'] === 1);
    expect(hasIdx).toBe(true);
  });
});
