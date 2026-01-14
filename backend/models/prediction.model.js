const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (!useMock) {
  const PredictionSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    predictionType: {
      type: String,
      enum: ['performance', 'churn', 'behavior', 'trend'],
      required: true,
    },
    inputData: {
      type: Map,
      of: String,
      required: true,
    },
    prediction: {
      value: Number,
      confidence: Number,
      probability: Number,
      riskLevel: String,
    },
    factors: [
      {
        factor: String,
        weight: Number,
        impact: String,
      },
    ],
    recommendations: [
      {
        title: String,
        description: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        expectedImpact: Number,
      },
    ],
    actualOutcome: {
      occurred: Boolean,
      date: Date,
      feedback: String,
    },
    modelVersion: String,
    accuracy: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  });

  module.exports = mongoose.model('Prediction', PredictionSchema);
} else {
  const store = [];

  class Prediction {
    constructor(data = {}) {
      Object.assign(this, data);
      this._id = data._id || uuidv4();
      this.createdAt = data.createdAt || new Date();
      this.updatedAt = data.updatedAt || this.createdAt;
    }

    async save() {
      this.updatedAt = new Date();
      const existingIndex = store.findIndex(item => item._id === this._id);
      if (existingIndex >= 0) {
        store[existingIndex] = this;
      } else {
        store.push(this);
      }
      return this;
    }

    static async create(data = {}) {
      const doc = new Prediction(data);
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

  module.exports = Prediction;
  module.exports.isMockModel = true;
  module.exports._mockStore = store;
}
