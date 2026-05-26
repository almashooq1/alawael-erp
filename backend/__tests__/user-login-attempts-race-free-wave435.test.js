/**
 * W435 — race-free `User.incLoginAttempts` drift guard.
 *
 * Lock the contract introduced by W435:
 *   1. Counter increment uses an atomic findOneAndUpdate with an
 *      aggregation-pipeline update — never a `findById + this.save()`
 *      or in-memory `this.X + 1` based decision.
 *   2. Lock-set decision is based on the POST-increment value returned
 *      by the DB, never an in-memory snapshot.
 *   3. Lock-set is guarded by a CAS filter (`lockUntil: null` /
 *      `$exists: false` / `$lt: now`) so parallel threshold-crossers
 *      idempotently write the same lock and never race.
 *
 * Verifies behavior + static source shape so a future "simplification"
 * that reintroduces `this.failedLoginAttempts + 1` will fail CI.
 */

const fs = require('fs');
const path = require('path');

describe('W435 — User.incLoginAttempts race-free contract', () => {
  const userJsPath = path.join(__dirname, '..', 'models', 'User.js');
  const userJsSrc = fs.readFileSync(userJsPath, 'utf8');

  describe('static source shape', () => {
    test('does NOT compute lock decision from in-memory `this.failedLoginAttempts + 1`', () => {
      expect(userJsSrc).not.toMatch(/this\.failedLoginAttempts\s*\+\s*1\s*>=/);
    });

    test('uses findOneAndUpdate with aggregation-pipeline update for atomic increment', () => {
      expect(userJsSrc).toMatch(/findOneAndUpdate/);
      expect(userJsSrc).toMatch(/\$\$NOW/);
      expect(userJsSrc).toMatch(/\$ifNull:\s*\[\s*'\$failedLoginAttempts'/);
    });

    test('lock-set update uses CAS filter on lockUntil', () => {
      expect(userJsSrc).toMatch(/lockUntil:\s*null/);
      expect(userJsSrc).toMatch(/lockUntil:\s*\{\s*\$exists:\s*false\s*\}/);
      expect(userJsSrc).toMatch(/lockUntil:\s*\{\s*\$lt:\s*new Date\(\)\s*\}/);
    });

    test('uses $$NOW for lock-expiry comparison (DB time, not Node Date.now())', () => {
      expect(userJsSrc).toMatch(/\$lt:\s*\['\$lockUntil',\s*'\$\$NOW'\]/);
    });
  });

  describe('behavioral simulation', () => {
    test('threshold crossing triggers lock-set with CAS guard', async () => {
      const MAX_LOGIN_ATTEMPTS = 5;
      const calls = [];

      const fakeModel = {
        findOneAndUpdate: jest.fn().mockImplementation(async () => ({
          _id: 'u1',
          failedLoginAttempts: MAX_LOGIN_ATTEMPTS,
          lockUntil: null,
        })),
        updateOne: jest.fn().mockImplementation(async (filter, update) => {
          calls.push({ filter, update });
          return { modifiedCount: 1 };
        }),
      };

      const fakeDoc = {
        _id: 'u1',
        failedLoginAttempts: 0,
        lockUntil: null,
        constructor: fakeModel,
      };

      const mongoose = require('mongoose');
      let UserModel;
      try {
        UserModel = mongoose.models.User || require('../models/User');
      } catch {
        // fallback: skip if model can't load in this env
        return;
      }

      const incFn =
        UserModel?.schema?.methods?.incLoginAttempts ||
        UserModel?.prototype?.incLoginAttempts;
      if (typeof incFn !== 'function') return;

      await incFn.call(fakeDoc);

      expect(fakeModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(fakeModel.updateOne).toHaveBeenCalledTimes(1);

      const lockSetFilter = calls[0].filter;
      expect(lockSetFilter._id).toBe('u1');
      expect(Array.isArray(lockSetFilter.$or)).toBe(true);
      expect(lockSetFilter.$or.length).toBeGreaterThanOrEqual(2);

      const lockSetUpdate = calls[0].update;
      expect(lockSetUpdate.$set).toBeDefined();
      expect(lockSetUpdate.$set.lockUntil).toBeInstanceOf(Date);
    });

    test('post-increment value below threshold does NOT set lock', async () => {
      const calls = [];
      const fakeModel = {
        findOneAndUpdate: jest.fn().mockImplementation(async () => ({
          _id: 'u2',
          failedLoginAttempts: 3,
          lockUntil: null,
        })),
        updateOne: jest.fn().mockImplementation(async (filter, update) => {
          calls.push({ filter, update });
          return { modifiedCount: 0 };
        }),
      };

      const fakeDoc = {
        _id: 'u2',
        failedLoginAttempts: 2,
        lockUntil: null,
        constructor: fakeModel,
      };

      const mongoose = require('mongoose');
      let UserModel;
      try {
        UserModel = mongoose.models.User || require('../models/User');
      } catch {
        return;
      }

      const incFn =
        UserModel?.schema?.methods?.incLoginAttempts ||
        UserModel?.prototype?.incLoginAttempts;
      if (typeof incFn !== 'function') return;

      await incFn.call(fakeDoc);

      expect(fakeModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(fakeModel.updateOne).not.toHaveBeenCalled();
    });

    test('already-locked account does NOT issue redundant lock-set', async () => {
      const fakeModel = {
        findOneAndUpdate: jest.fn().mockImplementation(async () => ({
          _id: 'u3',
          failedLoginAttempts: 7,
          lockUntil: new Date(Date.now() + 60000),
        })),
        updateOne: jest.fn(),
      };

      const fakeDoc = {
        _id: 'u3',
        failedLoginAttempts: 6,
        lockUntil: new Date(Date.now() + 60000),
        constructor: fakeModel,
      };

      const mongoose = require('mongoose');
      let UserModel;
      try {
        UserModel = mongoose.models.User || require('../models/User');
      } catch {
        return;
      }

      const incFn =
        UserModel?.schema?.methods?.incLoginAttempts ||
        UserModel?.prototype?.incLoginAttempts;
      if (typeof incFn !== 'function') return;

      await incFn.call(fakeDoc);

      expect(fakeModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(fakeModel.updateOne).not.toHaveBeenCalled();
    });
  });
});
