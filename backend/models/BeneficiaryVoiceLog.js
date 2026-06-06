'use strict';

/**
 * BeneficiaryVoiceLog — W460.
 *
 * Persistent channel for the beneficiary's own voice — preferences,
 * dreams, fears, dislikes, daily ratings, complaints. CRPD Article 7
 * + 12 + 21 require that the beneficiary's views be heard and given
 * due weight regardless of disability severity. This is the
 * infrastructure that delivers on that requirement.
 *
 * Per Phase B of the v3 Beneficiary Lifecycle Architecture
 * (docs/blueprint/beneficiary-lifecycle-v3.md §2.2 Dimension B —
 * Beneficiary Voice & Rights).
 *
 * Capture modalities (matches AAC W358 + speech W284 infrastructure):
 *   verbal    — recorded text/audio (verbal beneficiaries)
 *   aac       — AAC selection (picture cards / symbol board)
 *   gesture   — observed gesture / behavior-coded
 *   proxy     — interpreted by caregiver/therapist (LOWEST weight in
 *               CRPD-compliance score; LAST resort, not default)
 *
 * Anti-substitution doctrine (CRPD Article 12): a 'proxy' entry with
 * capacityGrade='absent' is the ONLY case where the beneficiary's voice
 * may be omitted entirely. Every other capacity grade requires either
 * a verbal/aac/gesture entry OR a documented support arrangement.
 */

const mongoose = require('mongoose');

const BeneficiaryVoiceLogSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    // What kind of voice entry is this?
    entryKind: {
      type: String,
      enum: [
        'preference', // I like / I don't like
        'dream', // I want to be / I want to do
        'fear', // I'm afraid of / I avoid
        'dislike', // I don't want / I refuse
        'daily_rating', // mood/energy/satisfaction snapshot
        'session_rating', // post-session feedback
        'complaint', // explicit complaint (also surfaces to Complaint surface W465)
        'consent_change', // change of mind on previously-given consent
        'request', // I want help with / I need
      ],
      required: true,
      index: true,
    },

    // HOW the voice was captured
    captureModality: {
      type: String,
      enum: ['verbal', 'aac', 'gesture', 'proxy'],
      required: true,
    },

    // The voice content (always present — even proxy entries record the
    // interpreted intent verbatim, not just a summary)
    content: {
      text: { type: String, maxlength: 2000 },
      audioUrl: { type: String, maxlength: 500 }, // links to S3 / signed URL
      aacSymbols: [{ type: String, maxlength: 100 }], // symbol IDs from AAC profile
      ratingValue: { type: Number, min: 1, max: 5 },
      ratingScale: {
        type: String,
        enum: ['likert_5', 'face_5', 'thumb', 'star_5'],
      },
    },

    // Language
    language: { type: String, enum: ['ar', 'en', 'aac_symbol'], default: 'ar' },

    // Capacity context — required to surface CRPD-compliance properly.
    // 'full' means the beneficiary expressed without support
    // 'supported' means with documented support arrangement (advocate, AAC, etc.)
    // 'shared' means joint decision with caregiver
    // 'absent' means beneficiary unable to participate (last-resort proxy only)
    capacityGrade: {
      type: String,
      enum: ['full', 'supported', 'shared', 'absent'],
      required: true,
    },
    supportArrangement: { type: String, maxlength: 500 },

    // Capture metadata
    capturedAt: { type: Date, default: Date.now, index: true },
    capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    capturedByRole: {
      type: String,
      enum: ['beneficiary', 'family', 'advocate', 'therapist', 'case_manager', 'cultural_officer'],
      required: true,
    },

    // Did this entry result in a follow-up action?
    actionTaken: {
      type: String,
      enum: ['none', 'plan_adjusted', 'complaint_opened', 'consent_updated', 'advocate_notified'],
      default: 'none',
    },
    actionDetails: { type: String, maxlength: 500 },
    actionTakenAt: { type: Date },
    actionTakenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Linkages
    relatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    relatedConsentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consent' },
    relatedComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },

    // PDPL: sensitive content with TTL
    isSensitive: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: ['active', 'archived', 'superseded'],
      default: 'active',
    },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryVoiceLog' },
  },
  {
    timestamps: true,
    collection: 'beneficiary_voice_logs',
  }
);

// Indexes for common query patterns
BeneficiaryVoiceLogSchema.index({ beneficiaryId: 1, capturedAt: -1 });
BeneficiaryVoiceLogSchema.index({ beneficiaryId: 1, entryKind: 1, capturedAt: -1 });
BeneficiaryVoiceLogSchema.index({ branchId: 1, entryKind: 1, capturedAt: -1 });

// W460 Wave-18 invariants
BeneficiaryVoiceLogSchema.pre('save', async function () {
  // Anti-substitution doctrine: proxy + capacityGrade='absent' is the
  // ONLY case where we tolerate no content beyond proxy interpretation.
  // Other proxy entries MUST document why direct capture was infeasible.
  if (this.captureModality === 'proxy' && this.capacityGrade !== 'absent') {
    if (!this.supportArrangement || this.supportArrangement.trim().length < 10) {
      throw new Error(
          'BeneficiaryVoiceLog: proxy capture requires supportArrangement (≥10 chars) ' +
            'documenting why direct capture from beneficiary was infeasible'
        );
    }
  }

  // Daily/session rating entries require ratingValue
  if (
    (this.entryKind === 'daily_rating' || this.entryKind === 'session_rating') &&
    (this.content?.ratingValue == null || this.content?.ratingScale == null)
  ) {
    throw new Error(`BeneficiaryVoiceLog: ${this.entryKind} requires content.ratingValue + ratingScale`);
  }

  // AAC entries must have aacSymbols populated
  if (
    this.captureModality === 'aac' &&
    (!this.content?.aacSymbols || this.content.aacSymbols.length === 0)
  ) {
    throw new Error('BeneficiaryVoiceLog: aac capture requires content.aacSymbols[]');
  }

  
});

module.exports =
  mongoose.models.BeneficiaryVoiceLog ||
  mongoose.model('BeneficiaryVoiceLog', BeneficiaryVoiceLogSchema);
