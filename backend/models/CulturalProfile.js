'use strict';

/**
 * CulturalProfile — W475.
 *
 * Per-beneficiary (and per-family) cultural preference profile per Phase E
 * Cultural Intelligence Layer (v3 §9). Captures the configurable cultural
 * accommodations that drive scheduling, gender routing, modesty handling,
 * dialect awareness, and religious observance.
 *
 * One profile per beneficiary (unique constraint). Created during Phase 1
 * intake; updated whenever family preferences change.
 */

const mongoose = require('mongoose');

const CulturalProfileSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // ── Religious observance ──────────────────────────────────────────
    religiousObservance: {
      observesRamadan: { type: Boolean, default: null }, // null = inferred from age
      observesDailyPrayers: { type: Boolean, default: true },
      hasMedicalExemptionFromFasting: { type: Boolean, default: false },
      medicalExemptionDetails: { type: String, maxlength: 500 },
      observesFridayKhutbah: { type: Boolean, default: true },
      schoolOfThought: {
        type: String,
        enum: ['hanafi', 'maliki', 'shafii', 'hanbali', 'other', 'unspecified'],
        default: 'hanbali', // Saudi default
      },
    },

    // ── Gender preferences (modesty + therapist routing) ──────────────
    genderPreferences: {
      // Therapist gender preference for the beneficiary
      therapistGenderPreference: {
        type: String,
        enum: ['male', 'female', 'no_preference'],
        default: 'no_preference',
      },
      // Hard requirement vs. preference — hard means we WILL block scheduling
      // with mismatched-gender therapist; soft means we surface a warning
      strictness: {
        type: String,
        enum: ['strict', 'preferred', 'flexible'],
        default: 'preferred',
      },
      // Female-only sessions requested? (group therapy / shared spaces)
      femaleOnlySessions: { type: Boolean, default: false },
      // Mahram (chaperone) accommodation request
      mahramRequired: { type: Boolean, default: false },
      mahramRelationship: { type: String, maxlength: 100 },
    },

    // ── Modesty accommodations ────────────────────────────────────────
    modesty: {
      hijabDuringTherapy: { type: Boolean, default: false },
      privateExamRoom: { type: Boolean, default: false },
      modestyDrapes: { type: Boolean, default: false },
      photoConsent: { type: Boolean, default: false },
      videoConsent: { type: Boolean, default: false },
      // Photo of beneficiary - additional family-level consent needed
      familyMembersInPhotosConsent: { type: Boolean, default: false },
    },

    // ── Family structure (multi-generational decision rights) ─────────
    // The full decision-rights graph lives in DecisionRightsAssessment (W461);
    // this is a quick reference for who-to-include in family meetings.
    familyStructure: {
      decisionMakers: [
        {
          relationship: {
            type: String,
            enum: [
              'father',
              'mother',
              'grandfather_paternal',
              'grandfather_maternal',
              'grandmother_paternal',
              'grandmother_maternal',
              'uncle_paternal',
              'uncle_maternal',
              'aunt',
              'older_brother',
              'older_sister',
              'spouse',
              'guardian_court_appointed',
              'tribal_elder',
              'other',
            ],
          },
          name: { type: String, maxlength: 200 },
          priority: { type: Number, min: 1, max: 10 },
          consultRequired: { type: Boolean, default: false },
        },
      ],
      familyType: {
        type: String,
        enum: ['nuclear', 'extended', 'single_parent', 'guardian_only', 'tribal'],
        default: 'extended', // Saudi cultural default
      },
      culturallySignificantEvents: [
        {
          eventType: {
            type: String,
            enum: [
              'hajj',
              'umrah',
              'eid_al_fitr',
              'eid_al_adha',
              'national_day',
              'family_wedding',
              'family_loss',
            ],
          },
          expectedDate: { type: Date },
          accommodationNeeded: { type: String, maxlength: 500 },
        },
      ],
    },

    // ── Language / dialect ─────────────────────────────────────────────
    language: {
      primaryLanguage: { type: String, default: 'ar', maxlength: 10 },
      arabicDialect: {
        type: String,
        enum: ['najdi', 'hejazi', 'eastern', 'southern', 'bedouin', 'msa', 'mixed', 'unspecified'],
        default: 'najdi', // Saudi default
      },
      preferredCommunicationLanguage: {
        type: String,
        enum: ['ar', 'en', 'both'],
        default: 'ar',
      },
      familyMembersSpeakingEnglish: { type: Boolean, default: false },
    },

    // ── Communication preferences ──────────────────────────────────────
    communication: {
      // Some Saudi families prefer NOT to use WhatsApp for privacy reasons
      whatsappAccepted: { type: Boolean, default: true },
      preferredChannel: {
        type: String,
        enum: ['phone', 'sms', 'whatsapp', 'email', 'app_notification', 'in_person'],
        default: 'phone',
      },
      // Female caregiver may need calls to route through male family member
      callRoutingThroughMaleGuardian: { type: Boolean, default: false },
      acceptableContactHours: {
        startHour: { type: Number, min: 0, max: 23, default: 8 },
        endHour: { type: Number, min: 0, max: 23, default: 20 },
      },
    },

    // ── Stigma sensitivity ─────────────────────────────────────────────
    stigma: {
      shareWithExtendedFamily: { type: Boolean, default: false },
      sharePhotosPublicly: { type: Boolean, default: false },
      anonymousResearchParticipation: { type: Boolean, default: true },
      // Marriage-prospect protection — older siblings' privacy concerns
      protectSiblingPrivacy: { type: Boolean, default: false },
    },

    // Metadata
    capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    capturedByRole: {
      type: String,
      enum: ['cultural_officer', 'social_worker', 'case_manager', 'family_self_report'],
      default: 'social_worker',
    },
    lastReviewedAt: { type: Date },
    nextReviewDue: { type: Date },
    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'cultural_profiles',
  }
);

CulturalProfileSchema.index({ branchId: 1, 'language.arabicDialect': 1 });
CulturalProfileSchema.index({ branchId: 1, 'genderPreferences.therapistGenderPreference': 1 });

// W475 Wave-18 invariants
CulturalProfileSchema.pre('save', function (next) {
  // Mahram required → mahramRelationship must be filled
  if (this.genderPreferences?.mahramRequired && !this.genderPreferences.mahramRelationship) {
    return next(
      new Error('CulturalProfile: mahramRequired=true requires mahramRelationship to be specified')
    );
  }

  // Medical fasting exemption requires details ≥10 chars
  const obs = this.religiousObservance;
  if (
    obs?.hasMedicalExemptionFromFasting &&
    (!obs.medicalExemptionDetails || obs.medicalExemptionDetails.trim().length < 10)
  ) {
    return next(
      new Error(
        'CulturalProfile: hasMedicalExemptionFromFasting=true requires medicalExemptionDetails (≥10 chars)'
      )
    );
  }

  // Acceptable contact hours: startHour < endHour
  if (this.communication?.acceptableContactHours) {
    const { startHour, endHour } = this.communication.acceptableContactHours;
    if (typeof startHour === 'number' && typeof endHour === 'number' && startHour >= endHour) {
      return next(
        new Error(
          'CulturalProfile: communication.acceptableContactHours.startHour must be < endHour'
        )
      );
    }
  }

  next();
});

module.exports =
  mongoose.models.CulturalProfile || mongoose.model('CulturalProfile', CulturalProfileSchema);
