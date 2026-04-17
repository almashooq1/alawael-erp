/**
 * PublicBookingRequest — leads captured from the public landing.
 *
 * Distinct from Appointment (which requires an existing Beneficiary _id):
 * this model receives the raw form submission from /api/appointments/public,
 * stores it, and is then processed by the intake team who converts it into
 * a real Beneficiary + Appointment.
 *
 * Fields mirror the landing-page booking form at
 * frontend/src/data/landingContent.js → appointment.formFields.
 */

'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const CONDITIONS = [
  'إعاقة ذهنية',
  'اضطراب طيف التوحد',
  'متلازمة داون',
  'صعوبات تعلّم',
  'تأخّر نمو',
  'فرط حركة وتشتت انتباه',
  'تأخّر نطق ولغة',
  'غير متأكد — أحتاج تقييماً',
];

const TIME_SLOTS = ['صباحي (7:30 ص - 12:30 م)', 'مسائي (3:00 م - 8:00 م)', 'أي وقت يناسب'];

const STATUSES = ['new', 'contacted', 'scheduled', 'converted', 'declined', 'spam'];

const schema = new mongoose.Schema(
  {
    confirmationNumber: { type: String, unique: true, sparse: true, index: true },

    // Parent / caller info
    parentName: { type: String, required: true, trim: true, maxlength: 120 },
    parentPhone: {
      type: String,
      required: true,
      trim: true,
      // Saudi mobile (05xxxxxxxx) OR any international E.164 prefix
      match: [/^(?:\+?\d{7,15}|0\d{9,10})$/, 'رقم جوال غير صالح'],
      index: true,
    },
    parentEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },

    // Child info
    childName: { type: String, required: true, trim: true, maxlength: 120 },
    childAge: { type: Number, required: true, min: 0, max: 40 },
    childGender: { type: String, enum: ['male', 'female', ''], default: '' },

    // Case details
    conditionType: { type: String, required: true, enum: CONDITIONS },
    branchPreference: { type: String, required: true, trim: true, maxlength: 120 },
    preferredTime: { type: String, required: true, enum: TIME_SLOTS },
    notes: { type: String, trim: true, maxlength: 2000 },

    // Attribution + anti-abuse
    source: {
      type: String,
      enum: ['website', 'whatsapp', 'phone', 'walk-in', 'referral', 'other'],
      default: 'website',
    },
    referrer: { type: String, trim: true, maxlength: 500 }, // HTTP referer
    userAgent: { type: String, trim: true, maxlength: 500 },
    ipHash: { type: String, trim: true, index: true }, // sha256(ip) — no raw IP stored (PDPL)

    // Lifecycle
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contactedAt: { type: Date },
    convertedAt: { type: Date },
    convertedBeneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    internalNotes: { type: String, trim: true, maxlength: 4000 },

    // Consent (PDPL)
    consentMarketing: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate confirmation number (AW-YYYYMMDD-RRRRR) before validation.
schema.pre('validate', function (next) {
  if (!this.confirmationNumber) {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
    this.confirmationNumber = `AW-${y}${m}${d}-${rand}`;
  }
  next();
});

schema.index({ createdAt: -1 });
schema.index({ branchPreference: 1, status: 1 });

module.exports =
  mongoose.models.PublicBookingRequest || mongoose.model('PublicBookingRequest', schema);

module.exports.CONDITIONS = CONDITIONS;
module.exports.TIME_SLOTS = TIME_SLOTS;
module.exports.STATUSES = STATUSES;
