'use strict';

/**
 * MorningHealthCheck — Wave 177.
 *
 * "الفحص الصحي الصباحي" — performed at arrival (bus drop-off or walk-in).
 * Decides whether the beneficiary enters the program, is observed, or
 * is sent home. Safety gate — temperature ≥ 38°C / vomiting / rash / etc.
 * automatically sets decision='send_home' and feeds into BeneficiaryDayAttendance
 * (status='sent_home').
 *
 * One row per (beneficiaryId, date). Symptoms tracked as boolean flags
 * for fast charting + an array for free-text additions.
 *
 * Wave-18 invariants:
 *  • (beneficiaryId, date) unique
 *  • temperatureC in [30, 45] or null
 *  • decision='send_home' requires reason
 */

const mongoose = require('mongoose');

const DECISIONS = ['allow', 'observe', 'send_home'];

const SymptomFlagsSchema = new mongoose.Schema(
  {
    cough: { type: Boolean, default: false },
    runnyNose: { type: Boolean, default: false },
    soreThroat: { type: Boolean, default: false },
    vomiting: { type: Boolean, default: false },
    diarrhea: { type: Boolean, default: false },
    rash: { type: Boolean, default: false },
    redEyes: { type: Boolean, default: false },
    earache: { type: Boolean, default: false },
    fatigue: { type: Boolean, default: false },
    breathingDifficulty: { type: Boolean, default: false },
  },
  { _id: false }
);

const MorningHealthCheckSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    checkTime: { type: Date, default: Date.now },

    temperatureC: { type: Number, default: null, min: 30, max: 45 },
    mood: {
      type: String,
      enum: ['normal', 'cheerful', 'sleepy', 'irritable', 'distressed'],
      default: 'normal',
    },
    symptoms: { type: SymptomFlagsSchema, default: () => ({}) },
    otherSymptoms: { type: [String], default: () => [] },

    decision: { type: String, enum: DECISIONS, required: true, default: 'allow', index: true },
    reason: { type: String, default: '', maxlength: 500 },

    nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nurseName: { type: String, default: '', maxlength: 100 },
    parentNotified: { type: Boolean, default: false },
    parentNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'morning_health_checks' }
);

MorningHealthCheckSchema.index({ beneficiaryId: 1, date: 1 }, { unique: true });
MorningHealthCheckSchema.index({ branchId: 1, date: -1 });
MorningHealthCheckSchema.index({ decision: 1, date: -1 });

MorningHealthCheckSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

MorningHealthCheckSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.decision === 'send_home' && !String(this.reason || '').trim()) {
    this.invalidate('reason', 'required when decision=send_home');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.MorningHealthCheck ||
  mongoose.model('MorningHealthCheck', MorningHealthCheckSchema);

module.exports.DECISIONS = DECISIONS;
