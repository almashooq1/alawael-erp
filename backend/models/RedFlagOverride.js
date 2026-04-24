/**
 * RedFlagOverride.js — Mongoose model for emergency-override events.
 *
 * Beneficiary-360 Foundation Commit 8. When a clinician chooses to
 * start a session despite a blocking red flag (`emergencyOverride`
 * path in the guard), the event is recorded here. This is the
 * CBAHI evidence trail: *who* overrode, *when*, *which flag was
 * blocking*, and *why clinically*.
 *
 * Design decisions:
 *
 *   1. Append-only. Rows are never updated or deleted through the
 *      application layer — fixing a typo means inserting a
 *      successor row with a `correctedFromId` pointer. Keep the
 *      trail intact.
 *
 *   2. Indexed on (beneficiaryId, overriddenAt) so an auditor
 *      pulling "all overrides for this beneficiary in Q1" is a
 *      fast scan, not a collection scan.
 *
 *   3. `blockingFlagIds` is an array — a single override event
 *      often bypasses multiple blocking flags at once (e.g., both
 *      consent AND allergy). Recording each is important; they
 *      share the same clinical justification.
 *
 *   4. `context` is small structured metadata (session id,
 *      scheduled start time, therapist id, branch id) — not free
 *      text. Queries and dashboards key off these fields.
 */

'use strict';

const mongoose = require('mongoose');

const RedFlagOverrideSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: String, required: true, index: true },
    overriddenBy: { type: String, required: true },
    overriddenAt: { type: Date, required: true, default: Date.now },
    reason: { type: String, required: true, minlength: 10 },
    blockingFlagIds: { type: [String], default: [] },
    context: {
      sessionId: { type: String },
      therapistId: { type: String },
      scheduledStartTime: { type: Date },
      branchId: { type: String },
    },
    correctedFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RedFlagOverride',
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'red_flag_overrides',
  }
);

RedFlagOverrideSchema.index({ beneficiaryId: 1, overriddenAt: -1 });
RedFlagOverrideSchema.index({ overriddenAt: -1 });

module.exports =
  mongoose.models.RedFlagOverride || mongoose.model('RedFlagOverride', RedFlagOverrideSchema);
