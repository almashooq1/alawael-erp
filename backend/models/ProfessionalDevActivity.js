/**
 * ProfessionalDevActivity — therapist's professional-development
 * activities (CME, conferences, courses). Used by
 * `routes/therapistExtended.routes.js` `/professional-dev`.
 *
 * Sibling to FieldTraining (which is supervised practice/internships)
 * and CpeRecord (which is the formal SCFHS-tracked CPE ledger).
 * This is the lighter "I attended X" log without the SCFHS attestation
 * overhead.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.ProfessionalDevActivity) {
  module.exports = mongoose.models.ProfessionalDevActivity;
} else {
  const professionalDevActivitySchema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      type: {
        type: String,
        enum: [
          'conference',
          'workshop',
          'webinar',
          'course',
          'self_study',
          'mentoring',
          'research',
          'other',
        ],
        default: 'workshop',
      },
      title: { type: String, required: true, trim: true },
      provider: { type: String, default: null },
      date: { type: Date, default: Date.now },
      hours: { type: Number, default: 0 },
      cpePoints: { type: Number, default: 0 },
      description: { type: String, default: null },
      certificateUrl: { type: String, default: null },
      verified: { type: Boolean, default: false },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'professionaldevactivities' }
  );

  professionalDevActivitySchema.index({ therapist: 1, date: -1 });

  module.exports = mongoose.model('ProfessionalDevActivity', professionalDevActivitySchema);
}
