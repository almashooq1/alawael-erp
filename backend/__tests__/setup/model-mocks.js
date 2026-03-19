/* eslint-disable no-unused-vars */
/**
 * Comprehensive Model Mocking Setup
 * Intercepts mongoose model queries to prevent database timeouts
 */

const mongoose = require('mongoose');
const { Types } = require('mongoose');

// Helper to match query objects
function matchesQuery(item, query) {
  if (!item || typeof query !== 'object') return true;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    // Handle nested properties
    const itemValue = key.includes('.') ? getNestedValue(item, key) : item[key];

    if (value instanceof RegExp) {
      if (!value.test(itemValue?.toString() || '')) return false;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle MongoDB operators
      for (const [op, opValue] of Object.entries(value)) {
        if (op === '$gt' && !(itemValue > opValue)) return false;
        if (op === '$gte' && !(itemValue >= opValue)) return false;
        if (op === '$lt' && !(itemValue < opValue)) return false;
        if (op === '$lte' && !(itemValue <= opValue)) return false;
        if (op === '$in' && !opValue.includes(itemValue)) return false;
        if (op === '$nin' && opValue.includes(itemValue)) return false;
        if (op === '$eq' && itemValue !== opValue) return false;
        if (op === '$ne' && itemValue === opValue) return false;
        if (op === '$exists') {
          const exists = itemValue !== undefined && itemValue !== null;
          if (opValue && !exists) return false;
          if (!opValue && exists) return false;
        }
      }
    } else if (itemValue?.toString() !== value?.toString()) {
      if (!(itemValue instanceof Types.ObjectId && value?.toString() === itemValue.toString())) {
        return false;
      }
    }
  }
  return true;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// Create generic mock model factory
function createMockModel(collectionName) {
  const collection = global.mockDatabase[collectionName] || [];

  return {
    find: jest.fn(function (query = {}) {
      this._query = query;
      this._options = {};
      return this;
    }),

    findById: jest.fn(async id => {
      if (!id) return null;
      return collection.find(item => item._id?.toString() === id?.toString()) || null;
    }),

    findByIdAndUpdate: jest.fn(async (id, update, options = {}) => {
      const item = collection.find(item => item._id?.toString() === id?.toString());
      if (!item) return null;
      Object.assign(item, update, { updatedAt: new Date() });
      return item;
    }),

    findByIdAndDelete: jest.fn(async id => {
      const index = collection.findIndex(item => item._id?.toString() === id?.toString());
      if (index === -1) return null;
      return collection.splice(index, 1)[0];
    }),

    findOne: jest.fn(function (query = {}) {
      this._query = query;
      return this;
    }),

    findOneAndUpdate: jest.fn(async (query, update, options = {}) => {
      const item = collection.find(item => matchesQuery(item, query));
      if (!item) return null;
      Object.assign(item, update, { updatedAt: new Date() });
      return item;
    }),

    create: jest.fn(async (...args) => {
      const docs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const created = [];
      for (const doc of docs) {
        const newDoc = {
          _id: new Types.ObjectId(),
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
          _id: new Types.ObjectId(),
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
      let count = 0;
      for (const item of collection) {
        if (matchesQuery(item, query)) {
          Object.assign(item, update, { updatedAt: new Date() });
          count++;
        }
      }
      return { modifiedCount: count, acknowledged: true };
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

    estimatedDocumentCount: jest.fn(async () => {
      return collection.length;
    }),

    exists: jest.fn(async query => {
      return collection.some(item => matchesQuery(item, query)) ? { _id: true } : null;
    }),

    aggregate: jest.fn(function (pipeline = []) {
      return {
        exec: jest.fn().mockResolvedValue(collection),
        then: jest.fn(async onFulfill => onFulfill(collection)),
      };
    }),

    distinct: jest.fn(async (field, query = {}) => {
      const values = new Set();
      for (const item of collection) {
        if (matchesQuery(item, query) && item[field] !== undefined) {
          values.add(item[field]);
        }
      }
      return Array.from(values);
    }),

    bulkWrite: jest.fn(async () => ({
      ok: 1,
      writeErrors: [],
      insertedIds: {},
    })),

    collection: {
      drop: jest.fn(async () => {
        collection.length = 0;
        return true;
      }),
    },

    // Query builder methods
    select: jest.fn(function () {
      return this;
    }),
    lean: jest.fn(function () {
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
    sort: jest.fn(function (order) {
      this._sort = order;
      return this;
    }),
    populate: jest.fn(function () {
      return this;
    }),
    exec: jest.fn(async function () {
      const results = collection.filter(item => matchesQuery(item, this._query || {}));
      const skip = this._skip || 0;
      const limit = this._limit || results.length;
      return results.slice(skip, skip + limit);
    }),
    then: jest.fn(async function (onFulfill, onReject) {
      try {
        const results = collection.filter(item => matchesQuery(item, this._query || {}));
        const skip = this._skip || 0;
        const limit = this._limit || results.length;
        const final = results.slice(skip, skip + limit);
        return onFulfill(final);
      } catch (error) {
        return onReject?.(error);
      }
    }),
    catch: jest.fn(function (onReject) {
      return Promise.resolve().catch(onReject);
    }),
  };
}

// Mock all models dynamically
const mockedModels = {};
const modelNames = [
  'Asset',
  'AssetCategory',
  'AssetDepreciation',
  'AssetMaintenance',
  'AssetAllocation',
  'MaintenanceSchedule',
  'MaintenancePrediction',
  'HealthRecord',
  'HealthIndicator',
  'HealthAlert',
  'Schedule',
  'Report',
  'ReportDefinition',
  'User',
  'Document',
  'Message',
  'Notification',
  'PayrollRecord',
  'Analytics',
  'DisabilityRehabilitation',
  'Financial',
  'FinanceTemplate',
];

modelNames.forEach(name => {
  mockedModels[name] = createMockModel(name.charAt(0).toLowerCase() + name.slice(1));
});

module.exports = {
  mockedModels,
  createMockModel,
  matchesQuery,
};
