/**
 * analytics.model.js — Compatibility Proxy
 * ═════════════════════════════════════════
 * CANONICAL MODEL: Analytics.js (event/API tracking, 14 fields, TTL 90d)
 * This file re-exports the canonical model for production,
 * and provides a mock class for test environments.
 */
/* eslint-disable no-unused-vars */
const { v4: uuidv4 } = require('uuid');

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

if (!useMock) {
  // Delegate to canonical Analytics.js
  module.exports = require('./Analytics');
} else {
  const store = [];

  class Analytics {
    constructor(data = {}) {
      Object.assign(this, data);
      this._id = data._id || uuidv4();
      this.timestamp = data.timestamp || new Date();
      this.createdAt = data.createdAt || new Date();
    }

    async save() {
      const existingIndex = store.findIndex(item => item._id === this._id);
      if (existingIndex >= 0) {
        store[existingIndex] = this;
      } else {
        store.push(this);
      }
      return this;
    }

    static async create(data = {}) {
      const doc = new Analytics(data);
      await doc.save();
      return doc;
    }

    static find(query = {}) {
      const results = store.filter(item => {
        return Object.entries(query).every(([key, value]) => {
          return value === undefined || item[key]?.toString() === value.toString();
        });
      });

      const chainable = data => ({
        sort(sortObj = {}) {
          const [[key, direction]] = Object.entries(sortObj).length
            ? Object.entries(sortObj)
            : [['createdAt', -1]];
          const sorted = [...data].sort((a, b) => {
            const aVal = a[key] instanceof Date ? a[key].getTime() : a[key];
            const bVal = b[key] instanceof Date ? b[key].getTime() : b[key];
            return direction === -1 ? bVal - aVal : aVal - bVal;
          });
          return chainable(sorted);
        },
        limit(n) {
          return Promise.resolve(data.slice(0, n));
        },
        then(resolve, reject) {
          return Promise.resolve(data).then(resolve, reject);
        },
        exec() {
          return Promise.resolve(data);
        },
      });

      return chainable(results);
    }

    static async resetMock() {
      store.length = 0;
    }

    static get isMockModel() {
      return true;
    }

    static get _mockStore() {
      return store;
    }
  }

  module.exports = Analytics;
  module.exports.isMockModel = true;
  module.exports._mockStore = store;
}
