/**
 * StudentActivity.js — gamified daily-task collection for the student portal.
 *
 * Distinct from `Activity.js` (programs/sessions for staff). This collection
 * holds individual XP-rewarded tasks assigned to a beneficiary — practice
 * exercises, mood check-ins, journal prompts, mini-quizzes — each with its
 * own due date and completion lifecycle.
 *
 * The student-portal /today + /activities endpoints surface PENDING entries
 * whose dueAt falls inside the calling student's current day; /complete
 * flips status, stamps completedAt, and awards xpReward to the beneficiary's
 * gamification fields.
 *
 * Indexes:
 *   - (beneficiaryId, status, dueAt) → fast "what's due today?" queries
 *   - (beneficiaryId, status)        → achievements aggregations
 *
 * Field guarantees:
 *   - `beneficiaryId` is REQUIRED + indexed; every read MUST be scoped by it.
 *   - `xpReward` is bounded [0, 500] — keeps a misconfigured seed from
 *     handing out unrealistic XP that would mangle level calculations.
 *   - `kind` mirrors the same enum the appointment-icon mapper produces, so
 *     UI badges/colors render consistently across activities and sessions.
 */

'use strict';

const mongoose = require('mongoose');

const StudentActivitySchema = new mongoose.Schema(
  {
    beneficiaryId: { type: String, required: true, index: true },

    titleAr: { type: String, required: true, trim: true, maxlength: 200 },
    descriptionAr: { type: String, trim: true, maxlength: 2000 },

    kind: {
      type: String,
      enum: ['MOTOR', 'SPEECH', 'COGNITIVE', 'SOCIAL', 'JOURNAL', 'PRACTICE', 'OTHER'],
      default: 'PRACTICE',
      index: true,
    },
    icon: { type: String, default: '⭐' },

    xpReward: { type: Number, default: 30, min: 0, max: 500 },

    dueAt: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'completed', 'skipped'],
      default: 'pending',
      index: true,
    },
    completedAt: { type: Date },

    // Optional — link back to the appointment / care-plan goal that spawned
    // this task. Useful for /achievements drill-downs but never required.
    sourceKind: {
      type: String,
      enum: ['APPOINTMENT', 'GOAL', 'PROGRAM', 'MANUAL'],
      default: 'MANUAL',
    },
    sourceId: { type: String },

    assignedBy: { type: String }, // staff userId / 'system' for auto-seeded tasks
  },
  { timestamps: true, strict: true }
);

StudentActivitySchema.index({ beneficiaryId: 1, status: 1, dueAt: 1 });

module.exports =
  mongoose.models.StudentActivity || mongoose.model('StudentActivity', StudentActivitySchema);
