/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  notes: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const kpiSchema = new mongoose.Schema(
  {
    kpiId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, minlength: 3, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    category: {
      type: String,
      enum: [
        'quality',
        'hr',
        'operations',
        'finance',
        'medical',
        'technology',
        'safety',
        'customer',
      ],
      required: true,
    },
    department: { type: String, required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    target: { type: Number, required: true },
    actual: { type: Number, default: 0 },
    unit: { type: String, default: '%' },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    direction: {
      type: String,
      enum: ['higher_is_better', 'lower_is_better', 'target_exact'],
      default: 'higher_is_better',
    },
    thresholds: {
      excellent: { type: Number },
      good: { type: Number },
      warning: { type: Number },
      critical: { type: Number },
    },
    measurements: [measurementSchema],
    trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
    status: {
      type: String,
      enum: ['active', 'paused', 'archived'],
      default: 'active',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    fiscalYear: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

kpiSchema.index({ category: 1, status: 1 });
kpiSchema.index({ department: 1, fiscalYear: 1 });

module.exports = mongoose.models.KPI || mongoose.model('KPI', kpiSchema);
