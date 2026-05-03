/**
 * FieldTraining — supervised off-site / clinical practice records for
 * therapists. Used by `routes/therapistElite.routes.js` `/field-training`.
 *
 * Tracks scheduled training sessions, accumulated hours toward CPE/SCFHS
 * requirements, and evaluation snapshots from supervisors. The hoursLog
 * sub-array is append-only via `logTrainingHours` so we never lose audit
 * trail on claimed hours.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.FieldTraining) {
  module.exports = mongoose.models.FieldTraining;
} else {
  const evaluationSchema = new mongoose.Schema(
    {
      date: { type: Date, default: Date.now },
      evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      score: { type: Number, min: 0, max: 100 },
      notes: { type: String, default: null },
    },
    { _id: false }
  );

  const hoursLogSchema = new mongoose.Schema(
    {
      date: { type: Date, default: Date.now },
      hours: { type: Number, required: true, min: 0 },
      activity: { type: String, default: null },
      verified: { type: Boolean, default: false },
    },
    { _id: false }
  );

  const fieldTrainingSchema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      type: {
        type: String,
        enum: [
          'clinical_internship',
          'workshop',
          'certification_prep',
          'supervised_practice',
          'observership',
          'other',
        ],
        default: 'supervised_practice',
      },
      status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled'],
        default: 'planned',
      },
      title: { type: String, required: true, trim: true },
      description: { type: String, default: null },
      supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      location: { type: String, default: null },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      targetHours: { type: Number, default: 0 },
      completedHours: { type: Number, default: 0 },
      evaluations: { type: [evaluationSchema], default: [] },
      hoursLog: { type: [hoursLogSchema], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'fieldtrainings' }
  );

  fieldTrainingSchema.index({ therapist: 1, status: 1 });
  fieldTrainingSchema.index({ branch: 1, startDate: -1 });

  module.exports = mongoose.model('FieldTraining', fieldTrainingSchema);
}
