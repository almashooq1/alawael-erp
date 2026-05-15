'use strict';

const { BENCHMARKS, BAND_LABELS, classify } = require('../../config/benchmark.registry');

class BenchmarkService {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  list() {
    return BENCHMARKS;
  }

  classify(metricCode, observed) {
    return classify(metricCode, observed);
  }

  /**
   * Compare a bulk of observed metrics against industry benchmarks.
   *
   * @param {Record<string, number>} observed — keyed by metricCode.
   */
  compare(observed) {
    const out = [];
    for (const b of BENCHMARKS) {
      const value = observed[b.metricCode];
      out.push({
        metric: b,
        observed: value == null ? null : Number(value),
        result: value == null ? { band: 'unknown', benchmark: b } : classify(b.metricCode, value),
      });
    }
    const tally = {
      world_class: 0,
      top_quartile: 0,
      industry_median: 0,
      below_median: 0,
      unknown: 0,
    };
    for (const row of out) tally[row.result?.band || 'unknown']++;
    return { rows: out, summary: tally, bandLabels: BAND_LABELS };
  }
}

function createBenchmarkService(deps) {
  return new BenchmarkService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) _defaultInstance = new BenchmarkService({});
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { BenchmarkService, createBenchmarkService, getDefault, _replaceDefault };
