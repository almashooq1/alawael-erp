/**
 * نموذج الأهداف الاستراتيجية
 * Strategic Goal Model (BSC perspectives: financial, customer, internal, learning)
 */
const mongoose = require('mongoose');

const strategicGoalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    perspective: {
      type: String,
      required: true,
      enum: ['financial', 'customer', 'internal_processes', 'learning_growth'],
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    targetValue: { type: Number },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, maxlength: 50 },
    startDate: { type: Date },
    endDate: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    relatedInitiatives: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

strategicGoalSchema.index({ perspective: 1, status: 1 });
strategicGoalSchema.index({ createdBy: 1 });

module.exports =
  mongoose.models.StrategicGoal || mongoose.model('StrategicGoal', strategicGoalSchema);
