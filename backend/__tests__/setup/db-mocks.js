/* eslint-disable no-unused-vars */
/**
 * Database Mock Setup for Jest Tests
 * Mocks MongoDB/Mongoose operations to avoid database timeouts
 * Enables full service execution without database connectivity
 */

const mongoose = require('mongoose');

// Mock transaction support
mongoose.connection.transaction = jest.fn(async callback => {
  try {
    return await callback({
      commit: jest.fn(),
      abort: jest.fn(),
      isAborted: jest.fn(() => false),
    });
  } catch (error) {
    throw error;
  }
});

// Mock Model.startSession
mongoose.startSession = jest.fn(async () => ({
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
  withTransaction: jest.fn(async callback => {
    return await callback({});
  }),
}));

// Global mock data store
global.mockDatabase = {
  assets: [],
  maintenances: [],
  schedules: [],
  health: [],
  users: [],
  reports: [],
  categories: [],
};

// Helper function to reset mocks between tests
global.resetMockDatabase = () => {
  global.mockDatabase = {
    assets: [],
    maintenances: [],
    schedules: [],
    health: [],
    users: [],
    reports: [],
    categories: [],
  };
};

// Mock Mongoose model methods
const createMockModel = (modelName, collection) => {
  return {
    find: jest.fn(async (query = {}) => ({
      select: jest.fn(async function () {
        return collection.filter(item => matchesQuery(item, query));
      }),
      lean: jest.fn(async function () {
        return collection.filter(item => matchesQuery(item, query));
      }),
      limit: jest.fn(function (n) {
        return this;
      }),
      skip: jest.fn(function (n) {
        return this;
      }),
      sort: jest.fn(function (order) {
        return this;
      }),
      exec: jest.fn(async function () {
        return collection.filter(item => matchesQuery(item, query));
      }),
      then: jest.fn(async function (onFulfill) {
        const result = collection.filter(item => matchesQuery(item, query));
        return onFulfill(result);
      }),
    })),
    findById: jest.fn(async id => {
      return collection.find(item => item._id?.toString() === id?.toString());
    }),
    findByIdAndUpdate: jest.fn(async (id, update) => {
      const item = collection.find(item => item._id?.toString() === id?.toString());
      if (item) {
        Object.assign(item, update);
      }
      return item;
    }),
    findByIdAndDelete: jest.fn(async id => {
      const index = collection.findIndex(item => item._id?.toString() === id?.toString());
      if (index > -1) {
        return collection.splice(index, 1)[0];
      }
      return null;
    }),
    findOneAndUpdate: jest.fn(async (query, update) => {
      const item = collection.find(item => matchesQuery(item, query));
      if (item) {
        Object.assign(item, update);
      }
      return item;
    }),
    create: jest.fn(async (...args) => {
      const docs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const created = [];
      for (const doc of docs) {
        const newDoc = {
          _id: mongoose.Types.ObjectId(),
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        collection.push(newDoc);
        created.push(newDoc);
      }
      return docs.length === 1 ? created[0] : created;
    }),
    insertMany: jest.fn(async docs => {
      const created = [];
      for (const doc of docs) {
        const newDoc = {
          _id: mongoose.Types.ObjectId(),
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        collection.push(newDoc);
        created.push(newDoc);
      }
      return created;
    }),
    updateMany: jest.fn(async (query, update) => {
      let modified = 0;
      for (const item of collection) {
        if (matchesQuery(item, query)) {
          Object.assign(item, update);
          modified++;
        }
      }
      return { modifiedCount: modified, acknowledged: true };
    }),
    deleteMany: jest.fn(async query => {
      let count = 0;
      for (let i = collection.length - 1; i >= 0; i--) {
        if (matchesQuery(collection[i], query)) {
          collection.splice(i, 1);
          count++;
        }
      }
      return { deletedCount: count, acknowledged: true };
    }),
    countDocuments: jest.fn(async (query = {}) => {
      return collection.filter(item => matchesQuery(item, query)).length;
    }),
    exists: jest.fn(async query => {
      return collection.some(item => matchesQuery(item, query)) ? { _id: true } : null;
    }),
    aggregate: jest.fn(async (pipeline = []) => {
      return {
        exec: jest.fn(async () => collection),
        then: jest.fn(async onFulfill => onFulfill(collection)),
      };
    }),
    distinct: jest.fn(async (field, query = {}) => {
      const values = new Set();
      for (const item of collection) {
        if (matchesQuery(item, query) && item[field]) {
          values.add(item[field]);
        }
      }
      return Array.from(values);
    }),
    bulkWrite: jest.fn(async operations => {
      return {
        ok: 1,
        writeErrors: [],
        insertedIds: {},
        modifiedCount: operations.length,
        deletedCount: 0,
        upsertedCount: 0,
      };
    }),
    collection: {
      drop: jest.fn(async () => {
        collection.length = 0;
        return true;
      }),
    },
  };
};

// Helper to match query objects
function matchesQuery(item, query) {
  for (const [key, value] of Object.entries(query)) {
    if (value instanceof RegExp) {
      if (!value.test(item[key]?.toString() || '')) {
        return false;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle MongoDB operators like { $gt: 5 }, { $in: [1,2,3] }
      for (const [op, opValue] of Object.entries(value)) {
        if (op === '$gt' && !(item[key] > opValue)) return false;
        if (op === '$gte' && !(item[key] >= opValue)) return false;
        if (op === '$lt' && !(item[key] < opValue)) return false;
        if (op === '$lte' && !(item[key] <= opValue)) return false;
        if (op === '$in' && !opValue.includes(item[key])) return false;
        if (op === '$nin' && opValue.includes(item[key])) return false;
        if (op === '$eq' && item[key] !== opValue) return false;
        if (op === '$ne' && item[key] === opValue) return false;
      }
    } else if (item[key]?.toString() !== value?.toString()) {
      return false;
    }
  }
  return true;
}

// Mock all model methods to return mock implementations
jest.mock(
  '../services/assetService',
  () => ({
    getAllAssets: jest.fn(async (filters = {}) => {
      const assets = global.mockDatabase.assets.filter(asset => matchesQuery(asset, filters));
      return { success: true, data: assets, count: assets.length };
    }),
    getAssetById: jest.fn(async id => {
      const asset = global.mockDatabase.assets.find(a => a._id?.toString() === id?.toString());
      if (!asset) throw new Error('Asset not found');
      return { success: true, data: asset };
    }),
    createAsset: jest.fn(async assetData => {
      const asset = {
        _id: mongoose.Types.ObjectId(),
        ...assetData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      global.mockDatabase.assets.push(asset);
      return { success: true, data: asset };
    }),
    updateAsset: jest.fn(async (id, updateData) => {
      const asset = global.mockDatabase.assets.find(a => a._id?.toString() === id?.toString());
      if (!asset) throw new Error('Asset not found');
      Object.assign(asset, updateData, { updatedAt: new Date() });
      return { success: true, data: asset };
    }),
    deleteAsset: jest.fn(async id => {
      const index = global.mockDatabase.assets.findIndex(a => a._id?.toString() === id?.toString());
      if (index === -1) throw new Error('Asset not found');
      const deleted = global.mockDatabase.assets.splice(index, 1)[0];
      return { success: true, data: deleted };
    }),
  }),
  { virtual: true }
);

jest.mock(
  '../services/maintenanceService',
  () => ({
    getAllSchedules: jest.fn(async (filters = {}) => {
      const schedules = global.mockDatabase.maintenances.filter(m => matchesQuery(m, filters));
      return { success: true, data: schedules, count: schedules.length };
    }),
    getScheduleById: jest.fn(async id => {
      const schedule = global.mockDatabase.maintenances.find(
        m => m._id?.toString() === id?.toString()
      );
      if (!schedule) throw new Error('Schedule not found');
      return { success: true, data: schedule };
    }),
    createSchedule: jest.fn(async scheduleData => {
      const schedule = {
        _id: mongoose.Types.ObjectId(),
        ...scheduleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      global.mockDatabase.maintenances.push(schedule);
      return { success: true, data: schedule };
    }),
    updateSchedule: jest.fn(async (id, updateData) => {
      const schedule = global.mockDatabase.maintenances.find(
        m => m._id?.toString() === id?.toString()
      );
      if (!schedule) throw new Error('Schedule not found');
      Object.assign(schedule, updateData, { updatedAt: new Date() });
      return { success: true, data: schedule };
    }),
    deleteSchedule: jest.fn(async id => {
      const index = global.mockDatabase.maintenances.findIndex(
        m => m._id?.toString() === id?.toString()
      );
      if (index === -1) throw new Error('Schedule not found');
      const deleted = global.mockDatabase.maintenances.splice(index, 1)[0];
      return { success: true, data: deleted };
    }),
  }),
  { virtual: true }
);

module.exports = {
  createMockModel,
  matchesQuery,
};
