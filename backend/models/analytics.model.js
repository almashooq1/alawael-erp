const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

if (!useMock) {
  const AnalyticsSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metricType: {
      type: String,
      enum: ['performance', 'engagement', 'activity', 'behavior'],
      required: true,
    },
    metricValue: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    createdAt: { type: Date, default: Date.now },
  });

  module.exports = mongoose.model('Analytics', AnalyticsSchema);
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
          const [[key, direction]] = Object.entries(sortObj).length ? Object.entries(sortObj) : [['createdAt', -1]];
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
