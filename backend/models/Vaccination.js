/**
 * Vaccination.js — Beneficiary vaccination records.
 *
 * Beneficiary-360 Commit 24. Powers
 * `clinical.vaccination.overdue.60d`.
 *
 * Design decisions:
 *
 *   1. **One record per dose.** Even vaccines with multiple doses
 *      (e.g., DTaP #1–#5) each get their own row. Queries for
 *      "MMR overdue" scan for `vaccine: 'MMR'` + dose logic.
 *
 *   2. **`dueDate` + `administeredAt` as separate fields.** A row
 *      starts life with `dueDate` set and `administeredAt: null`
 *      — that's "scheduled". Once given, `administeredAt` fills
 *      in. The flag's "overdue" definition is
 *      `administeredAt === null AND dueDate < (now - 60d)`.
 *
 *   3. **Minimal schema.** MOH compliance reporting deserves a
 *      richer model (batch number, lot expiry, adverse reactions);
 *      this collection exists for the red-flag adapter first.
 *      Additional fields can be added without migration.
 *
 *   4. **`status` enum for explicit states** — `scheduled`,
 *      `administered`, `skipped` (medical contraindication),
 *      `refused` (guardian declined). Only `scheduled` rows can be
 *      overdue; `skipped`/`refused` never fire the flag.
 */

'use strict';

const mongoose = require('mongoose');

const VACCINATION_STATUSES = Object.freeze(['scheduled', 'administered', 'skipped', 'refused']);

const vaccinationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    vaccine: { type: String, required: true, trim: true },
    doseNumber: { type: Number, default: 1 },
    status: {
      type: String,
      enum: VACCINATION_STATUSES,
      default: 'scheduled',
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    administeredAt: { type: Date, default: null },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, collection: 'vaccinations' }
);

vaccinationSchema.index({ beneficiaryId: 1, status: 1, dueDate: 1 });

const Vaccination = mongoose.models.Vaccination || mongoose.model('Vaccination', vaccinationSchema);

module.exports = { Vaccination, VACCINATION_STATUSES };
