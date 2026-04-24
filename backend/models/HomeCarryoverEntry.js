/**
 * HomeCarryoverEntry.js — Guardian-logged home-practice records.
 *
 * Beneficiary-360 Commit 25. Powers `family.home_carryover.missing.14d`.
 *
 * "Home carry-over" is the rehab practice of the therapist
 * prescribing a task the guardian helps the child practice at
 * home between sessions. Tracking these logs is both clinically
 * useful (see what's actually getting practiced) and a family-
 * engagement signal — a family that never logs anything is a
 * family drifting away from the program.
 *
 * Design decisions:
 *
 *   1. **One row per entry.** Daily activity notes, not aggregated.
 *      The adapter looks at `max(loggedAt)` per beneficiary.
 *
 *   2. **`outcome` enum** — completed / partial / skipped. Out
 *      of scope for the current flag (which only cares about
 *      recency), but clinically valuable and essentially free.
 *
 *   3. **`loggedBy` optional** — some imports from paper logs
 *      might not know which guardian. We accept that; the flag
 *      only cares that an entry exists.
 *
 *   4. **Indexed on `(beneficiaryId, loggedAt desc)`** — the
 *      "most recent entry" lookup is the hot path.
 */

'use strict';

const mongoose = require('mongoose');

const HOME_CARRYOVER_OUTCOMES = Object.freeze(['completed', 'partial', 'skipped']);

const homeCarryoverSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
    },
    loggedAt: { type: Date, required: true, default: Date.now },
    activityDescription: { type: String, default: null, trim: true },
    outcome: {
      type: String,
      enum: HOME_CARRYOVER_OUTCOMES,
      default: 'completed',
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, collection: 'home_carryover_entries' }
);

homeCarryoverSchema.index({ beneficiaryId: 1, loggedAt: -1 });

const HomeCarryoverEntry =
  mongoose.models.HomeCarryoverEntry || mongoose.model('HomeCarryoverEntry', homeCarryoverSchema);

module.exports = { HomeCarryoverEntry, HOME_CARRYOVER_OUTCOMES };
