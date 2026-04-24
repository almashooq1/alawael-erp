/**
 * MedicationOrder.js — Beneficiary active medications.
 *
 * Beneficiary-360 Commit 23. Named `MedicationOrder` (not the
 * broader `Medication`) because there are already Medication-like
 * sub-documents inside the Beneficiary model (`medicalInfo.medications`).
 * This collection is a separate, queryable first-class record —
 * the structured source of truth for "what drugs is this patient
 * currently on" that the conflict/interaction flags need.
 *
 * Design decisions:
 *
 *   1. **Free-form `name` + optional `rxNormId`.** The clinical
 *      team writes the medication name as they prescribe it. If
 *      the UI has rxNorm integration it stamps an id too; the
 *      interaction adapter will use whichever yields a match
 *      (exact name or rxNorm class).
 *
 *   2. **Status enum** — `active | held | stopped`. The flag
 *      adapter only considers `active`; `held` means temporarily
 *      paused (awaiting lab) and shouldn't alarm; `stopped` is
 *      historical.
 *
 *   3. **`startedAt` + `stoppedAt`** — audit trail. If `stoppedAt`
 *      is in the past AND status === 'active' the adapter treats
 *      the record as stale and skips it (defensive).
 *
 *   4. **No dose/frequency fields.** Those belong on a fuller
 *      prescription record with ZATCA/SFDA-compliant shape; this
 *      model exists only to power the two safety flags. We keep
 *      the schema narrow so the Medication Orders collection
 *      doesn't accidentally become the god-object for all
 *      pharmacy state.
 */

'use strict';

const mongoose = require('mongoose');

const MEDICATION_STATUSES = Object.freeze(['active', 'held', 'stopped']);

const medicationOrderSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    rxNormId: { type: String, default: null, trim: true },
    rxNormClass: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: MEDICATION_STATUSES,
      default: 'active',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    stoppedAt: { type: Date, default: null },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, collection: 'medication_orders' }
);

medicationOrderSchema.index({ beneficiaryId: 1, status: 1 });

const MedicationOrder =
  mongoose.models.MedicationOrder || mongoose.model('MedicationOrder', medicationOrderSchema);

module.exports = { MedicationOrder, MEDICATION_STATUSES };
