/**
 * TherapyAssessment — therapist-portal scope clinical assessments.
 * Used by `routes/therapistExtended.routes.js` `/assessments`.
 *
 * Distinct from `models/Assessment.js` (ProgramAssessment) and the
 * specialised assessments under `models/*Assessment.js` (ADL, ICF,
 * CDSS Risk, Standardized). This is the lightweight per-session
 * therapist log of what was observed during a visit — scores, notes,
 * recommendations — without the standardisation overhead.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.TherapyAssessment) {
  module.exports = mongoose.models.TherapyAssessment;
} else {
  const therapyAssessmentSchema = new mongoose.Schema(
    {
      assessmentNumber: { type: String, unique: true, sparse: true },
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      session: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession', default: null },
      type: {
        type: String,
        enum: ['baseline', 'progress', 'discharge', 'follow_up', 'screening', 'outcome', 'other'],
        default: 'progress',
      },
      conductedAt: { type: Date, default: Date.now },
      domain: { type: String, default: null }, // e.g. 'speech', 'motor', 'cognition'
      score: { type: Number, default: null },
      maxScore: { type: Number, default: null },
      observations: { type: String, default: null },
      recommendations: { type: String, default: null },
      attachments: { type: [String], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapyassessments' }
  );

  therapyAssessmentSchema.index({ therapist: 1, conductedAt: -1 });
  therapyAssessmentSchema.index({ beneficiary: 1, conductedAt: -1 });

  module.exports =
    mongoose.models.TherapyAssessment || mongoose.model('TherapyAssessment', therapyAssessmentSchema);
}
