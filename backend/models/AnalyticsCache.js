const mongoose = require('mongoose');

const analyticsCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['HR_METRICS', 'FINANCE_FORECAST', 'SYSTEM_HEALTH', 'AI_INSIGHTS'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// Auto-delete expired documents
analyticsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AnalyticsCache', analyticsCacheSchema);
