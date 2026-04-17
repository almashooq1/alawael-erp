/**
 * PublicJobApplication — submissions from the public /careers page.
 *
 * Distinct from the existing internal JobApplication model (which is
 * scoped to an existing Branch and tied into internal HR workflow):
 * this is an unauthenticated lead — HR converts it into an internal
 * JobApplication / Employee after screening.
 */

'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const STATUSES = ['new', 'screening', 'interviewing', 'offered', 'hired', 'declined'];

const schema = new mongoose.Schema(
  {
    referenceNumber: { type: String, unique: true, sparse: true, index: true },

    // Target job (free-text id from careersContent.js)
    jobId: { type: String, required: true, index: true, maxlength: 80 },
    jobTitle: { type: String, required: true, trim: true, maxlength: 160 },

    // Applicant
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^(?:\+?\d{7,15}|0\d{9,10})$/, 'رقم جوال غير صالح'],
    },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    yearsExperience: { type: Number, min: 0, max: 50, default: 0 },
    currentRole: { type: String, trim: true, maxlength: 160 },
    highestEducation: { type: String, trim: true, maxlength: 160 },
    certifications: { type: String, trim: true, maxlength: 500 },
    linkedinUrl: { type: String, trim: true, maxlength: 300 },
    coverLetter: { type: String, trim: true, maxlength: 3000 },

    // Lifecycle
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true, maxlength: 4000 },

    // Attribution + anti-abuse
    source: {
      type: String,
      enum: ['careers-page', 'referral', 'linkedin', 'other'],
      default: 'careers-page',
    },
    ipHash: { type: String, trim: true },
    userAgent: { type: String, trim: true, maxlength: 500 },

    consentDataProcessing: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.pre('validate', function (next) {
  if (!this.referenceNumber) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.referenceNumber = `AWHR-${y}${m}${day}-${rand}`;
  }
  next();
});

schema.index({ createdAt: -1 });
schema.index({ jobId: 1, status: 1 });

module.exports =
  mongoose.models.PublicJobApplication || mongoose.model('PublicJobApplication', schema);
module.exports.STATUSES = STATUSES;
