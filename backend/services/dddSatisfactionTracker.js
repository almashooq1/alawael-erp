'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Satisfaction Tracker — Phase 27                     ██
 * ██  Track NPS, CSAT, CES & satisfaction trends              ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDSatisfactionScore, DDDSatisfactionTrend, DDDSatisfactionBenchmark, DDDSatisfactionAlert, SATISFACTION_METRICS, METRIC_STATUSES, SCORE_CATEGORIES, BENCHMARK_TYPES, TREND_PERIODS, SEGMENT_TYPES, BUILTIN_BENCHMARKS } = require('../models/DddSatisfactionTracker');

const BaseCrudService = require('./base/BaseCrudService');

class SatisfactionTracker extends BaseCrudService {
  constructor() {
    super('SatisfactionTracker');
  }

  /* Scores */
  async listScores(filter = {}) { return this._list(DDDSatisfactionScore, filter, { sort: { collectedAt: -1 } }); }
  async getScore(id) { return this._getById(DDDSatisfactionScore, id); }
  async recordScore(data) {
    data.scoreId = data.scoreId || `SAT-${Date.now()}`;
    return DDDSatisfactionScore.create(data);
  }

  /* Trends */
  async listTrends(filter = {}) { return this._list(DDDSatisfactionTrend, filter, { sort: { periodStart: -1 } }); }
  async generateTrend(data) {
    data.trendId = data.trendId || `TRND-${Date.now()}`;
    return DDDSatisfactionTrend.create(data);
  }

  /* Benchmarks */
  async listBenchmarks(filter = {}) { return this._list(DDDSatisfactionBenchmark, filter); }
  async createBenchmark(data) {
    data.benchmarkId = data.benchmarkId || `BMK-${Date.now()}`;
    return DDDSatisfactionBenchmark.create(data);
  }
  async updateBenchmark(id, data) { return this._update(DDDSatisfactionBenchmark, id, data); }

  /* Alerts */
  async listAlerts(filter = {}) { return this._list(DDDSatisfactionAlert, filter); }
  async createAlert(data) {
    data.alertId = data.alertId || `SALT-${Date.now()}`;
    return DDDSatisfactionAlert.create(data);
  }
  async resolveAlert(id) {
    return DDDSatisfactionAlert.findByIdAndUpdate(
      id,
      { status: 'completed', resolvedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* Analytics */
  async getSatisfactionAnalytics(filter = {}) {
    const [scores, trends, benchmarks] = await Promise.all([
      DDDSatisfactionScore.countDocuments(filter),
      DDDSatisfactionTrend.countDocuments(),
      DDDSatisfactionBenchmark.countDocuments(),
    ]);
    return { totalScores: scores, totalTrends: trends, totalBenchmarks: benchmarks };
  }

}

module.exports = new SatisfactionTracker();
