'use strict';

/**
 * user-login-attempts-behavioral-wave1221.test.js — User.incLoginAttempts
 * against MongoMemoryServer (real Mongoose driver, NO mocks).
 *
 * Behavioral counterpart to the W435 static/mocked drift guard. The W435
 * suite mocks findOneAndUpdate, so it kept passing while Mongoose 9
 * rejected the aggregation-pipeline array update at runtime
 * ("Cannot pass an array to query updates unless the `updatePipeline`
 * option is set") — every wrong-password login on prod returned 500
 * from 2026-05-29 until the W1221 fix, and the brute-force counter
 * never incremented. This suite calls the real method end-to-end so any
 * future driver-level rejection of the pipeline update fails CI.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let User;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1221-login-attempts' } });
  await mongoose.connect(mongod.getUri());
  User = require('../models/User');
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
afterEach(async () => {
  if (User) await User.deleteMany({});
});

const baseUser = (over = {}) => ({
  fullName: 'مستخدم اختبار',
  email: `w1221-${new mongoose.Types.ObjectId().toString()}@test.local`,
  password: 'Str0ng!Passw0rd',
  ...over,
});

describe('W1221 User.incLoginAttempts — real-driver behavioral contract', () => {
  test('resolves (no Mongoose-9 pipeline rejection) and increments 0 → 1', async () => {
    const u = await User.create(baseUser());
    const updated = await u.incLoginAttempts();
    expect(updated).not.toBeNull();
    expect(updated.failedLoginAttempts).toBe(1);
    expect(updated.lockUntil ?? null).toBeNull();
  });

  test('5th consecutive failure sets lockUntil in the future (account locked)', async () => {
    const u = await User.create(baseUser());
    for (let i = 0; i < 5; i++) {
      await u.incLoginAttempts();
    }
    const row = await User.findById(u._id).select('+failedLoginAttempts +lockUntil');
    expect(row.failedLoginAttempts).toBe(5);
    expect(row.lockUntil).toBeInstanceOf(Date);
    expect(row.lockUntil.getTime()).toBeGreaterThan(Date.now());
    expect(row.isLocked).toBe(true);
  });

  test('expired lock → next failure resets counter to 1 and clears the stale lock', async () => {
    const u = await User.create(baseUser());
    await User.updateOne(
      { _id: u._id },
      { $set: { failedLoginAttempts: 5, lockUntil: new Date(Date.now() - 60_000) } }
    );
    const updated = await u.incLoginAttempts();
    expect(updated.failedLoginAttempts).toBe(1);
    expect(updated.lockUntil ?? null).toBeNull();
  });

  test('resetLoginAttempts clears counter and lock', async () => {
    const u = await User.create(baseUser());
    await u.incLoginAttempts();
    await u.incLoginAttempts();
    await u.resetLoginAttempts();
    const row = await User.findById(u._id).select('+failedLoginAttempts +lockUntil');
    expect(row.failedLoginAttempts).toBe(0);
    expect(row.lockUntil ?? null).toBeNull();
    expect(row.isLocked).toBe(false);
  });
});
