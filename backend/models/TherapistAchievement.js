/**
 * TherapistAchievement — recognition records for therapists.
 * Used by `routes/therapistElite.routes.js` `/achievements`.
 *
 * Distinct from CPE credits (which live in `models/CpeRecord.js`)
 * and from formal certifications (which live in HR credentials).
 * This is the lightweight "kudos / publication / award" feed for
 * the therapist portal — used in profile pages and recognition
 * dashboards.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.TherapistAchievement) {
  module.exports = mongoose.models.TherapistAchievement;
} else {
  const therapistAchievementSchema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      type: {
        type: String,
        enum: [
          'certification',
          'award',
          'publication',
          'conference_talk',
          'milestone',
          'kudos',
          'other',
        ],
        default: 'kudos',
      },
      title: { type: String, required: true, trim: true },
      description: { type: String, default: null },
      date: { type: Date, default: Date.now },
      issuingBody: { type: String, default: null },
      evidenceUrl: { type: String, default: null },
      verified: { type: Boolean, default: false },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      verifiedAt: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapistachievements' }
  );

  therapistAchievementSchema.index({ therapist: 1, date: -1 });
  therapistAchievementSchema.index({ branch: 1, type: 1 });

  module.exports =
    mongoose.models.TherapistAchievement || mongoose.model('TherapistAchievement', therapistAchievementSchema);
}
