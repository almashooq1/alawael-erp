/**
 * CpeRecord — Saudi SCFHS Continuing Professional Education credits.
 *
 * Saudi Commission for Health Specialties (SCFHS) requires licensed
 * health practitioners to accumulate a minimum number of CPE credits
 * within a rolling 5-year window to renew their license. Missing the
 * minimum = license lapse = cannot treat patients = revenue hit.
 *
 * We track each activity the therapist attended + its awarded credits
 * so HR can:
 *   • prove compliance at audit time
 *   • warn the therapist 6 months before the deadline if they're short
 *   • reject license-renewal bonuses before the center pays them twice
 *
 * Credit categories (SCFHS 2021 framework):
 *   • Category 1 — Accredited formal education (conferences, courses)
 *   • Category 2 — Practice-based (in-service, case reviews)
 *   • Category 3 — Self-directed (reading, online modules)
 *
 * Each category has its own annual minimum; the service layer handles
 * those thresholds. This model is the raw audit trail.
 */

'use strict';

const mongoose = require('mongoose');

const CpeRecordSchema = new mongoose.Schema(
  {
    // Who the credit belongs to (SCFHS-licensed employee)
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // Activity details — what did they attend / complete
    activityName: { type: String, required: true, trim: true },
    activityNameAr: { type: String, trim: true },
    provider: { type: String, trim: true }, // the accrediting body / institution
    accreditationNumber: { type: String, trim: true }, // SCFHS accreditation code
    category: {
      type: String,
      enum: ['1', '2', '3'],
      required: true,
      index: true,
    },

    // Credit math. Route POST rejects anything <= 0, so mirror the rule
    // at the model boundary — other write paths (migrations, imports)
    // shouldn't be able to slip a zero-hour record past validation.
    creditHours: { type: Number, required: true, min: 0.5 },

    // When the activity happened (credits count toward the 5-year window
    // that contains this date)
    activityDate: { type: Date, required: true, index: true },

    // Optional proof — certificate URL, receipt ID
    proofUrl: { type: String, trim: true },

    // HR verification status — credits only count toward renewal
    // when verified by an HR / compliance officer.
    verified: { type: Boolean, default: false, index: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Primary query: all credits for an employee in a date range (5-yr window)
CpeRecordSchema.index({ employeeId: 1, activityDate: -1 });

// Category rollups
CpeRecordSchema.index({ employeeId: 1, category: 1, verified: 1 });

module.exports = mongoose.models.CpeRecord || mongoose.model('CpeRecord', CpeRecordSchema);
