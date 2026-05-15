'use strict';

const {
  forecast,
  detectLevelShift,
  linearRegression,
} = require('../../config/trend-forecast.registry');

class TrendForecastService {
  constructor({ measurementModel = null, indicatorModel = null, logger = console } = {}) {
    this.measurementModel = measurementModel;
    this.indicatorModel = indicatorModel;
    this.logger = logger;
  }

  /**
   * Pure-data forecast — caller supplies a sequence of values.
   */
  forecastSeries(values, opts = {}) {
    return forecast(values, opts);
  }

  detectLevelShift(values, opts = {}) {
    return detectLevelShift(values, opts);
  }

  fitLine(values) {
    return linearRegression(values);
  }

  /**
   * Pull a quality indicator's measurement history and produce a
   * forecast. Requires QualityMeasurement model to be wired.
   */
  async forecastIndicator(indicatorId, { months = 12, horizon = 3 } = {}) {
    if (!this.measurementModel) {
      throw Object.assign(new Error('measurement model not wired'), { code: 'NOT_WIRED' });
    }
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const docs = await this.measurementModel
      .find({ indicatorId, measurementDate: { $gte: cutoff } })
      .sort({ measurementDate: 1 })
      .lean();
    if (!docs || docs.length < 3) {
      return { error: 'INSUFFICIENT_DATA', count: docs ? docs.length : 0 };
    }
    const values = docs.map(d => Number(d.value));
    const f = forecast(values, { horizon });
    const shift = detectLevelShift(values);
    return {
      indicatorId,
      sampleSize: values.length,
      first: docs[0].measurementDate,
      last: docs[docs.length - 1].measurementDate,
      forecast: f,
      levelShift: shift,
    };
  }
}

function createTrendForecastService(deps) {
  return new TrendForecastService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    let measurementModel = null;
    let indicatorModel = null;
    try {
      measurementModel = require('../../models/quality/QualityMeasurement');
    } catch (_) {
      /* optional */
    }
    try {
      indicatorModel = require('../../models/quality/QualityIndicator');
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new TrendForecastService({ measurementModel, indicatorModel });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { TrendForecastService, createTrendForecastService, getDefault, _replaceDefault };
