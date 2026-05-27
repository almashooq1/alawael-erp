'use strict';

/**
 * TherapistProgressRecord — short-form progress notes captured by the
 * therapist between sessions. Used by `routes/therapistPro.routes.js`
 * `/progress-records`. Lighter than SessionDocumentation (which is
 * the formal SOAP record per session).
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapistProgressRecord) {
  module.exports = mongoose.models.TherapistProgressRecord;
} else {
  const schema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      recordedAt: { type: Date, default: Date.now },
      domain: { type: String, default: null }, // motor, speech, behavior...
      observation: { type: String, required: true },
      score: { type: Number, default: null },
      trend: {
        type: String,
        enum: ['improving', 'stable', 'declining', 'unknown'],
        default: 'unknown',
      },
      attachments: { type: [String], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapistprogressrecords' }
  );

  schema.index({ therapist: 1, beneficiary: 1, recordedAt: -1 });

  module.exports =
    mongoose.models.TherapistProgressRecord || mongoose.model('TherapistProgressRecord', schema);
}
