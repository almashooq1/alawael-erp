/**
 * نموذج المبادرات الاستراتيجية
 * Strategic Initiative Model
 */
const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: { type: Date },
  completed: { type: Boolean, default: false },
  completedDate: { type: Date },
});

const strategicInitiativeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, maxlength: 2000 },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'StrategicGoal', required: true },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled'],
      default: 'planned',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    budget: { type: Number, default: 0 },
    spentBudget: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    milestones: [milestoneSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

strategicInitiativeSchema.index({ goalId: 1, status: 1 });
strategicInitiativeSchema.index({ owner: 1 });

module.exports =
  mongoose.models.StrategicInitiative ||
  mongoose.model('StrategicInitiative', strategicInitiativeSchema);
