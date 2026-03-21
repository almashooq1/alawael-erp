/* eslint-disable no-unused-vars */
/**
 * ForecastModel Model
 * ظ†ظ…ط§ط°ط¬ ط§ظ„طھظ†ط¨ط¤ ط¨ط§ظ„طھط¯ظپظ‚ط§طھ ط§ظ„ظ†ظ‚ط¯ظٹط© ظˆط§ظ„ظ…ط¨ظٹط¹ط§طھ
 */

const mongoose = require('mongoose');

const forecastModelSchema = new mongoose.Schema(
  {
    modelId: { type: String, required: true, unique: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },

    name: { type: String, required: true },

    modelType: {
      type: String,
      enum: ['arima', 'exponential_smoothing', 'linear_regression', 'neural_network', 'hybrid'],
      required: true,
      index: true,
    },

    parameters: {
      p: { type: Number, description: 'ARIMA p parameter' },
      d: { type: Number, description: 'ARIMA d parameter' },
      q: { type: Number, description: 'ARIMA q parameter' },
      alpha: { type: Number, description: 'Exponential smoothing alpha' },
      beta: { type: Number, description: 'Exponential smoothing beta' },
      seasonalPeriod: { type: Number, description: 'Seasonal period' },
      lookbackPeriods: {
        type: Number,
        default: 24,
        description: 'Number of periods used for training',
      },
      forecastHorizon: {
        type: Number,
        default: 12,
        description: 'Number of future periods to forecast',
      },
    },

    dataSource: {
      entity: { type: String, enum: ['CashFlow', 'Sales', 'Expenses', 'Revenue'], required: true },
      metric: String,
      aggregationLevel: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly'],
        default: 'monthly',
      },
    },

    trainingData: {
      startDate: Date,
      endDate: Date,
      recordCount: Number,
      dataPoints: [{ date: Date, value: Number }],
    },

    accuracy: {
      mae: { type: Number, description: 'Mean Absolute Error' },
      rmse: { type: Number, description: 'Root Mean Square Error' },
      mape: { type: Number, description: 'Mean Absolute Percentage Error' },
      rSquared: { type: Number, description: 'R-squared value' },
      testAccuracy: Number,
      validationAccuracy: Number,
    },

    forecasts: [
      {
        period: { month: Number, year: Number },
        predictedValue: Number,
        confidenceLevel: { type: String, enum: ['90%', '95%', '99%'], default: '95%' },
        lowerBound: Number,
        upperBound: Number,
        actualValue: Number,
        error: Number,
        absolutePercentageError: Number,
      },
    ],

    performance: {
      lastTrainingDate: Date,
      trainingDuration: Number,
      nextRetrainingDate: Date,
      performanceStatus: {
        type: String,
        enum: ['optimal', 'good', 'fair', 'poor'],
        default: 'good',
      },
      driftDetected: Boolean,
      driftLevel: Number,
    },

    status: {
      type: String,
      enum: ['training', 'active', 'inactive', 'deprecated'],
      default: 'active',
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    trainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    version: { type: Number, default: 1 },
    notes: String,
  },
  {
    timestamps: true,
    collection: 'forecast_models',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

forecastModelSchema.index({ organizationId: 1, modelType: 1 });
forecastModelSchema.index({ 'dataSource.entity': 1 });

forecastModelSchema.virtual('isAccurate').get(function () {
  return this.accuracy.mape < 10 && this.accuracy.rSquared > 0.8;
});

forecastModelSchema.virtual('needsRetraining').get(function () {
  if (!this.performance.lastTrainingDate) return true;
  const daysSinceTraining = Math.floor(
    (Date.now() - this.performance.lastTrainingDate) / (1000 * 60 * 60 * 24)
  );
  return daysSinceTraining > 30 || this.performance.driftDetected;
});

forecastModelSchema.methods.predict = function (periods = 12) {
  const predictions = [];
  if (this.modelType === 'linear_regression') {
    const lastHalf = this.trainingData.dataPoints.slice(
      -Math.floor(this.trainingData.dataPoints.length / 2)
    );
    const slope = (lastHalf[lastHalf.length - 1].value - lastHalf[0].value) / lastHalf.length;
    const lastValue = this.trainingData.dataPoints[this.trainingData.dataPoints.length - 1].value;

    for (let i = 1; i <= periods; i++) {
      predictions.push({
        value: lastValue + slope * i,
        lowerBound: (lastValue + slope * i) * 0.9,
        upperBound: (lastValue + slope * i) * 1.1,
      });
    }
  }
  return predictions;
};

forecastModelSchema.statics.getActiveModels = function (organizationId) {
  return this.find({ organizationId, status: 'active' });
};

forecastModelSchema.statics.getModelByType = function (organizationId, modelType) {
  return this.findOne({ organizationId, modelType, status: 'active' });
};

module.exports = mongoose.model('ForecastModel', forecastModelSchema);
