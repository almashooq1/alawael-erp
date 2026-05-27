/**
 * TherapyPrescription — therapist's prescription/recommendation for
 * exercises, home programs, devices, etc. Used by
 * `routes/therapistExtended.routes.js` `/prescriptions`.
 *
 * Distinct from `models/PrescriptionValidation.js` (CDSS drug
 * validation) and from formal medication prescriptions. This is the
 * non-pharmacological clinical recommendation a therapist hands to a
 * caregiver after a session.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.TherapyPrescription) {
  module.exports = mongoose.models.TherapyPrescription;
} else {
  const itemSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      kind: {
        type: String,
        enum: ['exercise', 'home_program', 'device', 'lifestyle', 'referral', 'other'],
        default: 'exercise',
      },
      instructions: { type: String, default: null },
      frequency: { type: String, default: null }, // "3x daily", "twice/week"
      durationDays: { type: Number, default: null },
    },
    { _id: false }
  );

  const therapyPrescriptionSchema = new mongoose.Schema(
    {
      prescriptionNumber: { type: String, unique: true, sparse: true },
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      session: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession', default: null },
      issuedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['active', 'completed', 'discontinued', 'expired'],
        default: 'active',
      },
      items: { type: [itemSchema], default: [] },
      notes: { type: String, default: null },
      sharedWithGuardian: { type: Boolean, default: false },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapyprescriptions' }
  );

  therapyPrescriptionSchema.index({ therapist: 1, issuedAt: -1 });
  therapyPrescriptionSchema.index({ beneficiary: 1, status: 1 });

  module.exports =
    mongoose.models.TherapyPrescription || mongoose.model('TherapyPrescription', therapyPrescriptionSchema);
}
