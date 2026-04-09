/**
 * FamilyMember — نموذج أفراد الأسرة / أولياء الأمور
 *
 * يُسجّل بيانات كل فرد من أسرة المستفيد مع صلاحياته
 * وموافقاته القانونية وتفضيلات التواصل
 *
 * @module domains/family/models/FamilyMember
 */

const mongoose = require('mongoose');

// ─── Consent Sub-Schema ─────────────────────────────────────────────────────
const consentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'treatment_consent',
        'data_sharing',
        'photo_video',
        'tele_rehab',
        'research_participation',
        'home_program',
        'medication',
        'outing',
        'emergency_contact',
      ],
    },
    status: {
      type: String,
      enum: ['granted', 'revoked', 'pending', 'expired'],
      default: 'pending',
    },
    grantedAt: Date,
    revokedAt: Date,
    expiresAt: Date,
    documentUrl: String,
    notes: String,
  },
  { _id: true }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const familyMemberSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },

    // ── Personal Info ───────────────────────────────────────────────────────
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    relationship: {
      type: String,
      required: true,
      enum: [
        'father',
        'mother',
        'guardian',
        'sibling',
        'grandparent',
        'uncle_aunt',
        'caregiver',
        'other',
      ],
    },
    isPrimaryContact: { type: Boolean, default: false },
    isLegalGuardian: { type: Boolean, default: false },

    // ── Contact ─────────────────────────────────────────────────────────────
    phone: String,
    email: String,
    preferredLanguage: { type: String, default: 'ar' },
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'sms', 'whatsapp', 'email', 'in_app', 'in_person'],
      default: 'phone',
    },
    availableTimes: [String], // e.g. ['morning', 'afternoon']

    // ── Portal Access ───────────────────────────────────────────────────────
    portalAccess: {
      enabled: { type: Boolean, default: false },
      userId: { type: mongoose.Schema.Types.ObjectId }, // link to User if registered
      lastLogin: Date,
      accessLevel: {
        type: String,
        enum: ['view_only', 'view_communicate', 'full'],
        default: 'view_only',
      },
    },

    // ── Consents ────────────────────────────────────────────────────────────
    consents: [consentSchema],

    // ── Engagement Metrics ──────────────────────────────────────────────────
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    lastContactDate: Date,
    totalInteractions: { type: Number, default: 0 },

    // ── Notes ───────────────────────────────────────────────────────────────
    notes: String,
    tags: [String],

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'family_members',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
familyMemberSchema.index({ beneficiaryId: 1, relationship: 1 });
familyMemberSchema.index({ 'portalAccess.userId': 1 });

module.exports = mongoose.models.FamilyMember || mongoose.model('FamilyMember', familyMemberSchema);
