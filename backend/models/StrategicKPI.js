/**
 * نموذج مؤشرات الأداء الاستراتيجية
 * Strategic KPI Model
 */
const mongoose = require('mongoose');

const kpiRecordSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const strategicKPISchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'StrategicGoal', required: true },
    unit: { type: String, maxlength: 50 },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    baselineValue: { type: Number, default: 0 },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      default: 'monthly',
    },
    trend: {
      type: String,
      enum: ['up_good', 'down_good', 'stable_good'],
      default: 'up_good',
    },
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'behind', 'exceeded'],
      default: 'on_track',
    },
    records: [kpiRecordSchema],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

strategicKPISchema.index({ goalId: 1 });
strategicKPISchema.index({ status: 1 });

module.exports = mongoose.models.StrategicKPI || mongoose.model('StrategicKPI', strategicKPISchema);
