'use strict';

/**
 * DailyTask — therapist's lightweight todo list. Used by
 * `routes/therapistPro.routes.js` `/daily-tasks`. Distinct from
 * formal clinical tasks tracked in care plans.
 */

const mongoose = require('mongoose');

if (mongoose.models.DailyTask) {
  module.exports = mongoose.models.DailyTask;
} else {
  const dailyTaskSchema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      title: { type: String, required: true, trim: true },
      description: { type: String, default: null },
      dueDate: { type: Date, default: null },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
      },
      relatedBeneficiary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary',
        default: null,
      },
      completedAt: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'dailytasks' }
  );

  dailyTaskSchema.index({ therapist: 1, status: 1, dueDate: 1 });

  module.exports = mongoose.model('DailyTask', dailyTaskSchema);
}
