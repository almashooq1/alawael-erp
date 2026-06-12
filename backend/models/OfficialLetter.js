'use strict';

/**
 * OfficialLetter — سجل إصدار الخطابات الرسمية (W1224).
 *
 * Every certificate letter printed from web-admin (/hr/forms/
 * employment-certificate, salary-certificate, …) is ISSUED here first:
 * an atomic per-type/per-year sequence assigns the official reference
 * number (e.g. `EC-2026-0007`), the subject identity is SNAPSHOTTED from
 * the system of record at issue time (letters must stay verifiable even
 * if the employee record later changes), and a random `verifyToken`
 * backs the QR code printed in the letter footer — any bank or authority
 * can scan it and hit the PUBLIC verify endpoint to confirm the letter
 * is genuine and not revoked.
 *
 * Lifecycle: issued → (optionally) revoked. No deletes — this is an
 * audit log. No TTL — official issuance records persist.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const LETTER_TYPES = Object.freeze({
  employment_certificate: { prefix: 'EC', labelAr: 'خطاب تعريف بالعمل' },
  salary_certificate: { prefix: 'SC', labelAr: 'خطاب تعريف بالراتب' },
  beneficiary_certificate: { prefix: 'BC', labelAr: 'خطاب تعريف بمستفيد' },
  experience_certificate: { prefix: 'XC', labelAr: 'شهادة خبرة' },
});

// ─── Atomic sequence counter (one doc per letterType+year) ────────────────
const counterSchema = new Schema(
  {
    _id: { type: String, required: true }, // `${letterType}:${year}`
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: 'official_letter_counters', versionKey: false }
);

const OfficialLetterCounter =
  mongoose.models.OfficialLetterCounter ||
  mongoose.model('OfficialLetterCounter', counterSchema);

// ─── Letter schema ─────────────────────────────────────────────────────────
const subjectSchema = new Schema(
  {
    kind: { type: String, enum: ['employee', 'beneficiary'], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String, default: null },
    number: { type: String, default: null }, // employee_number / file number
    jobTitle: { type: String, default: null },
    hireDate: { type: Date, default: null },
  },
  { _id: false }
);

const officialLetterSchema = new Schema(
  {
    letterType: {
      type: String,
      enum: Object.keys(LETTER_TYPES),
      required: true,
      index: true,
    },
    year: { type: Number, required: true },
    seq: { type: Number, required: true },
    refNumber: { type: String, required: true, unique: true }, // EC-2026-0007
    verifyToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(16).toString('hex'),
    },

    status: {
      type: String,
      enum: ['issued', 'revoked'],
      default: 'issued',
      index: true,
    },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    revokeReason: { type: String, default: null },

    subject: { type: subjectSchema, required: true },
    addressee: { type: String, default: 'إلى من يهمه الأمر' },
    // Letter-type-specific snapshot (e.g. salary breakdown for SC letters).
    payload: { type: Schema.Types.Mixed, default: null },

    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedByName: { type: String, default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
  },
  { timestamps: true, collection: 'official_letters' }
);

officialLetterSchema.index({ letterType: 1, year: 1, seq: 1 }, { unique: true });
officialLetterSchema.index({ branchId: 1, createdAt: -1 });
officialLetterSchema.index({ 'subject.refId': 1, createdAt: -1 });

// ─── Wave-18 cross-field invariants ────────────────────────────────────────
// Declared in a pre('validate') hook (async, Mongoose-9 style — W946/W483)
// so they run on EVERY save path, including update-saves (W1123 lesson:
// select:false virtual validators silently skip update-saves).
officialLetterSchema.pre('validate', async function () {
  // Update-saves skip select:false validators unless marked (W1123 lesson) —
  // __invariants here is a plain virtual + pre('validate') hook, so it runs
  // on every save path.
  if (this.status === 'revoked' && !this.revokeReason) {
    this.invalidate('revokeReason', 'revokeReason is required when status is revoked');
  }
  if (this.status === 'revoked' && !this.revokedAt) {
    this.invalidate('revokedAt', 'revokedAt is required when status is revoked');
  }
  if (this.status === 'issued' && (this.revokedAt || this.revokeReason)) {
    this.invalidate('status', 'issued letters must not carry revocation fields');
  }
});

/**
 * Atomically issue a letter: claim the next sequence for (type, year),
 * format the official reference number, and persist the snapshot.
 *
 * @param {object} args
 * @param {string} args.letterType  one of LETTER_TYPES keys
 * @param {object} args.subject     snapshot ({kind, refId, nameAr, ...})
 * @param {string} [args.addressee]
 * @param {object} [args.payload]
 * @param {object} args.issuer      { userId, name }
 * @param {string|null} [args.branchId]
 * @returns {Promise<import('mongoose').Document>}
 */
officialLetterSchema.statics.issue = async function issue({
  letterType,
  subject,
  addressee,
  payload,
  issuer,
  branchId,
}) {
  if (!LETTER_TYPES[letterType]) {
    const err = new Error(`Unknown letterType: ${letterType}`);
    err.code = 'INVALID_LETTER_TYPE';
    throw err;
  }
  const year = new Date().getFullYear();
  const counter = await OfficialLetterCounter.findOneAndUpdate(
    { _id: `${letterType}:${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const seq = counter.seq;
  const refNumber = `${LETTER_TYPES[letterType].prefix}-${year}-${String(seq).padStart(4, '0')}`;

  return this.create({
    letterType,
    year,
    seq,
    refNumber,
    subject,
    addressee: addressee || 'إلى من يهمه الأمر',
    payload: payload ?? null,
    issuedBy: issuer.userId,
    issuedByName: issuer.name ?? null,
    branchId: branchId ?? null,
  });
};

const OfficialLetter =
  mongoose.models.OfficialLetter || mongoose.model('OfficialLetter', officialLetterSchema);

module.exports = OfficialLetter;
module.exports.OfficialLetterCounter = OfficialLetterCounter;
module.exports.LETTER_TYPES = LETTER_TYPES;
