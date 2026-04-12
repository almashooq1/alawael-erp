/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
/**
 * Jest Setup File
 * Database mocking setup to prevent MongoDB timeouts during testing
 */

// Test environment
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-for-jest!!';
process.env.SMART_TEST_MODE = 'true';
process.env.MONGOOSE_BUFFER_TIMEOUT = '500000';
process.env.DATABASE_POOL_SIZE = '1';
process.env.DATABASE_TIMEOUT = '500000';
process.env.MONGODB_URI = 'mongodb://mock-test-db';

// Increase timeout for all tests
jest.setTimeout(60000);

// Mock mongoose connection at module level
jest.mock(
  'mongoose',
  () => {
    // Mock database store
    const store = {
      assets: [],
      maintenances: [],
      schedules: [],
      health: [],
      users: [],
      reports: [],
      categories: [],
      documents: [],
      messages: [],
      notifications: [],
      payroll: [],
      analytics: [],
      disabilities: [],
      finances: [],
    };

    // Helper to match queries
    const matchesQuery = (item, query) => {
      if (!query || typeof query !== 'object') return true;
      for (const [key, val] of Object.entries(query)) {
        if (val === undefined) continue;
        if (val instanceof RegExp && !val.test(item[key]?.toString() || '')) return false;
        if (item[key]?.toString() !== val?.toString()) return false;
      }
      return true;
    };

    // Mock ObjectId generator
    let objectIdCounter = 0;
    class MockObjectId {
      constructor(id) {
        this._id = id ? id.toString() : `${++objectIdCounter}`.padStart(24, '0');
      }
      toString() {
        return this._id;
      }
      [Symbol.toStringTag] = 'ObjectId';
    }

    // Mock Types object
    const Types = {
      ObjectId: MockObjectId,
    };

    // Generic mock model
    const createModel = () => {
      const queryObj = {
        q: {},
        _isSingleDoc: false,
        select: jest.fn(function () {
          return this;
        }),
        lean: jest.fn(function () {
          return this;
        }),
        populate: jest.fn(function () {
          return this;
        }),
        limit: jest.fn(function (n) {
          this._limit = n;
          return this;
        }),
        skip: jest.fn(function (n) {
          this._skip = n;
          return this;
        }),
        sort: jest.fn(function (s) {
          this._sort = s;
          return this;
        }),
        _resolveResults: function () {
          if (this._isSingleDoc) {
            for (const coll of Object.values(store)) {
              const item = coll.find(i => matchesQuery(i, this.q));
              if (item) return item;
            }
            return null;
          }
          const results = [];
          for (const coll of Object.values(store)) {
            results.push(...coll.filter(i => matchesQuery(i, this.q)));
          }
          return results;
        },
        exec: jest.fn(async function () {
          return this._resolveResults();
        }),
        then: jest.fn(function (cb, ecb) {
          try {
            const result = this._resolveResults();
            return Promise.resolve(result).then(cb, ecb);
          } catch (err) {
            if (ecb) return Promise.reject(err).catch(ecb);
            return Promise.reject(err);
          }
        }),
        catch: jest.fn(function (ecb) {
          return this.then(undefined, ecb);
        }),
      };

      return {
        find: jest.fn(function (q = {}) {
          const qObj = Object.create(queryObj);
          qObj.q = q;
          return qObj;
        }),
        findById: jest.fn(function (id) {
          const qObj = Object.create(queryObj);
          qObj.q = { _id: id };
          qObj._isSingleDoc = true;
          qObj._resolveResults = function () {
            for (const coll of Object.values(store)) {
              const item = coll.find(i => i._id?.toString() === id?.toString());
              if (item) return item;
            }
            return null;
          };
          return qObj;
        }),
        findByIdAndUpdate: jest.fn(async (id, u) => {
          for (const coll of Object.values(store)) {
            const item = coll.find(i => i._id?.toString() === id?.toString());
            if (item) {
              Object.assign(item, u);
              return item;
            }
          }
          return null;
        }),
        findByIdAndDelete: jest.fn(async id => {
          for (const coll of Object.values(store)) {
            const idx = coll.findIndex(i => i._id?.toString() === id?.toString());
            if (idx !== -1) return coll.splice(idx, 1)[0];
          }
          return null;
        }),
        findOne: jest.fn(function (q = {}) {
          const qObj = Object.create(queryObj);
          qObj.q = q;
          qObj._isSingleDoc = true;
          return qObj;
        }),
        findOneAndUpdate: jest.fn(async (q, u) => {
          for (const coll of Object.values(store)) {
            const item = coll.find(i => matchesQuery(i, q));
            if (item) {
              Object.assign(item, u);
              return item;
            }
          }
          return null;
        }),
        findOneAndDelete: jest.fn(async q => {
          for (const coll of Object.values(store)) {
            const idx = coll.findIndex(i => matchesQuery(i, q));
            if (idx !== -1) return coll.splice(idx, 1)[0];
          }
          return null;
        }),
        create: jest.fn(async function (...args) {
          const docs = Array.isArray(args[0]) ? args[0] : args;
          const collName = this._collectionName || 'assets';
          if (!store[collName]) store[collName] = [];
          const coll = store[collName];
          const res = [];
          for (const doc of docs) {
            const newDoc = {
              _id: new Types.ObjectId(),
              ...doc,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            coll.push(newDoc);
            res.push(newDoc);
          }
          return docs.length === 1 ? res[0] : res;
        }),
        insertMany: jest.fn(async function (docs) {
          const collName = this._collectionName || 'assets';
          if (!store[collName]) store[collName] = [];
          const coll = store[collName];
          const res = [];
          for (const doc of docs) {
            const newDoc = { _id: new Types.ObjectId(), ...doc, createdAt: new Date() };
            coll.push(newDoc);
            res.push(newDoc);
          }
          return res;
        }),
        updateMany: jest.fn(async (q, u) => {
          let cnt = 0;
          for (const coll of Object.values(store)) {
            for (const item of coll) {
              if (matchesQuery(item, q)) {
                Object.assign(item, u);
                cnt++;
              }
            }
          }
          return { modifiedCount: cnt, ok: 1 };
        }),
        deleteMany: jest.fn(async q => {
          let cnt = 0;
          for (const coll of Object.values(store)) {
            for (let i = coll.length - 1; i >= 0; i--) {
              if (matchesQuery(coll[i], q)) {
                coll.splice(i, 1);
                cnt++;
              }
            }
          }
          return { deletedCount: cnt, ok: 1 };
        }),
        countDocuments: jest.fn(async (q = {}) => {
          let cnt = 0;
          for (const coll of Object.values(store)) {
            cnt += coll.filter(i => matchesQuery(i, q)).length;
          }
          return cnt;
        }),
        exists: jest.fn(async q => {
          for (const coll of Object.values(store)) {
            if (coll.some(i => matchesQuery(i, q))) return { _id: true };
          }
          return null;
        }),
        aggregate: jest.fn(() => ({
          exec: jest.fn(async () => []),
          then: jest.fn(async cb => cb([])),
        })),
        distinct: jest.fn(async () => []),
      };
    };

    // Mock mongoose.model() and mongoose.Schema
    const mockModels = {};

    const SchemaConstructor = jest.fn(function (schema) {
      const schemaInstance = {
        methods: {},
        statics: {},
        _schema: schema,
        index: jest.fn(() => schemaInstance),
        post: jest.fn(() => schemaInstance),
        pre: jest.fn(() => schemaInstance),
        virtual: jest.fn(() => ({
          get: jest.fn(() => schemaInstance),
          set: jest.fn(() => schemaInstance),
        })),
        path: jest.fn(() => ({
          validate: jest.fn(),
          get: jest.fn(),
          set: jest.fn(),
          required: jest.fn(),
        })),
        add: jest.fn(() => schemaInstance),
        set: jest.fn(() => schemaInstance),
        get: jest.fn(),
        plugin: jest.fn(() => schemaInstance),
        obj: schema || {},
      };
      return schemaInstance;
    });
    SchemaConstructor.Types = Types;

    const createModelFn = jest.fn((name, schema) => {
      if (!mockModels[name]) {
        mockModels[name] = createModel();
      }
      // Track collection name for create/insertMany operations
      const collKey = name.toLowerCase();
      if (!store[collKey]) store[collKey] = [];
      mockModels[name]._collectionName = collKey;
      mockModels[name].modelName = name;
      mockModels[name].collection = { name: collKey, collectionName: collKey };
      return mockModels[name];
    });

    const mockMongoose = {
      Types,
      Schema: SchemaConstructor,
      models: mockModels,
      model: createModelFn,
      plugin: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      connect: jest.fn(async () => ({ connected: true })),
      disconnect: jest.fn(async () => ({})),
      connection: {
        readyState: 0,
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        removeListener: jest.fn(),
        close: jest.fn(async () => {}),
        db: {
          admin: jest.fn(() => ({ ping: jest.fn(async () => ({ ok: 1 })) })),
          collection: jest.fn(() => ({})),
        },
        getClient: jest.fn(() => ({
          db: jest.fn(() => ({
            collection: jest.fn(() => ({})),
          })),
          topology: { s: { pool: {} } },
        })),
      },
      startSession: jest.fn(async () => ({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
        withTransaction: jest.fn(async callback => callback({})),
      })),
      Promise: Promise,
    };

    return mockMongoose;
  },
  { virtual: true }
);

// Suppress console (keep error/warn in CI for debugging)
const _isCI = process.env.CI === 'true';
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // In CI keep real error/warn so they appear in jest-output.txt / Step Summary
  error: _isCI ? console.error : jest.fn(),
  warn: _isCI ? console.warn : jest.fn(),
};

// ─── MongoMemoryServer URI override ────────────────────────────────
// Integration tests (jest.unmock('mongoose')) read .env at module-load time,
// overwriting process.env.MONGODB_URI with the real (authenticated) server.
// This beforeAll runs AFTER test module-level code but BEFORE the test's own
// beforeAll, so it re-overrides the env var to point at the in-memory server.
const _fs = require('fs');
const _path = require('path');
const _uriFile = _path.join(__dirname, '.test-mongo-uri');

beforeAll(() => {
  try {
    const memUri = _fs.readFileSync(_uriFile, 'utf-8').trim();
    if (memUri) {
      process.env.MONGO_URI = memUri;
      process.env.MONGODB_URI = memUri;
    }
  } catch {
    // globalSetup may not have written the file (e.g. missing mongodb-memory-server)
  }
});

// ─── Global teardown: close leaked handles so workers exit cleanly ──
afterAll(async () => {
  // 1. Disconnect real mongoose if any test unmocked it and opened a connection
  try {
    const realMongoose = jest.requireActual('mongoose');
    if (realMongoose.connection && realMongoose.connection.readyState !== 0) {
      await realMongoose.disconnect();
    }
  } catch {
    // mongoose may not be importable or already disconnected
  }

  // 2. Close any leaked Redis/ioredis connections
  try {
    const Redis = jest.requireActual('ioredis');
    if (Redis.default && typeof Redis.default.prototype.quit === 'function') {
      // ioredis instances may linger — nothing to do at class level
    }
  } catch {
    // ioredis not installed or not used
  }

  // 3. Clear ALL timers (setTimeout, setInterval, etc.)
  jest.clearAllTimers();

  // 4. Clear any pending unhandled promise rejections listener
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');
});

// Mock database store
global.mockDatabase = {
  assets: [],
  maintenances: [],
  schedules: [],
  health: [],
  users: [],
  reports: [],
};

beforeEach(() => {
  global.mockDatabase = {
    assets: [],
    maintenances: [],
    schedules: [],
    health: [],
    users: [],
    reports: [],
  };
});

// Custom matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () => `expected ${received} to be a valid date`,
    };
  },

  toBeValidNationalId(received) {
    const pass = /^\d{10}$/.test(received);
    return {
      pass,
      message: () => `expected ${received} to be Saudi National ID`,
    };
  },

  toBeValidViolationCode(received) {
    const validCodes = [
      '101',
      '102',
      '103',
      '201',
      '202',
      '203',
      '204',
      '205',
      '301',
      '302',
      '303',
      '304',
      '401',
      '402',
      '403',
      '404',
      '405',
      '406',
      '407',
      '408',
    ];
    const pass = validCodes.includes(String(received));
    return {
      pass,
      message: () => `expected ${received} to be valid code`,
    };
  },

  toHaveComplianceScore(received) {
    const pass = typeof received.score === 'number' && received.score >= 0 && received.score <= 100;
    return {
      pass,
      message: () => `expected score 0-100`,
    };
  },
});
