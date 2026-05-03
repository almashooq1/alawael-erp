'use strict';

/**
 * TherapyResearch — clinical research project conducted by therapists.
 * Used by `routes/therapistUltra.routes.js` `/research`. Tracks the
 * study + its publications + collaborators. Different from formal
 * IRB-managed research (which would need its own compliance schema).
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapyResearch) {
  module.exports = mongoose.models.TherapyResearch;
} else {
  const publicationSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      type: {
        type: String,
        enum: ['journal', 'conference', 'poster', 'thesis', 'other'],
        default: 'journal',
      },
      venue: { type: String, default: null },
      publishedAt: { type: Date, default: null },
      doi: { type: String, default: null },
      url: { type: String, default: null },
    },
    { _id: true }
  );

  const schema = new mongoose.Schema(
    {
      principalInvestigator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
      },
      coInvestigators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
      title: { type: String, required: true, trim: true },
      summary: { type: String, default: null },
      hypothesis: { type: String, default: null },
      status: {
        type: String,
        enum: [
          'planning',
          'recruiting',
          'in_progress',
          'analysis',
          'completed',
          'paused',
          'cancelled',
        ],
        default: 'planning',
      },
      irbApproved: { type: Boolean, default: false },
      irbApprovalRef: { type: String, default: null },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      publications: { type: [publicationSchema], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapyresearch' }
  );

  schema.index({ principalInvestigator: 1, status: 1 });

  module.exports = mongoose.model('TherapyResearch', schema);
}
