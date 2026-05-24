'use strict';

/**
 * CommunicationAidProfile — Wave 358.
 *
 * "ملف التواصل البديل/المعزّز" — Augmentative & Alternative Communication
 * (AAC) profile per beneficiary. One profile per beneficiary, versioned via
 * a history block. Captures the tools/symbol sets/vocabulary level that
 * the beneficiary uses to communicate.
 *
 * Targeted population is broad:
 *   • Autism spectrum (non-verbal or minimally verbal)
 *   • Cerebral palsy with dysarthria
 *   • Childhood apraxia of speech
 *   • Post-stroke/TBI aphasia
 *   • Down syndrome (often delayed expressive language)
 *   • Rett, Angelman, Phelan-McDermid syndromes
 *
 * Distinct from CarePlanVersion goals — AAC is a HOW (the communication
 * modality) not a what (the goal). Goals around expanding vocabulary live
 * on the care plan; the profile tells therapists what tool the beneficiary
 * is currently using to express those goals.
 *
 * Distinct from IndividualEducationPlan goals — same logic; IEP captures
 * educational targets, AAC profile captures communication modality.
 *
 * Three modality tiers (ASHA-aligned):
 *   • Unaided — body-based (sign language, gesture, vocalization)
 *   • Low-tech aided — paper/print (PECS, communication boards, books)
 *   • High-tech aided — electronic (SGD apps like Proloquo2Go, TouchChat,
 *     LAMP Words for Life, TD Snap; dedicated devices)
 *
 * Wave-18 invariants:
 *   • At least one of activeModalities[] required (otherwise it's not
 *     really a profile — use lifecycleStatus='retired' instead)
 *   • vocabularyLevel ∈ { pre-symbolic, single_word, multi_word, sentence,
 *     conversational }
 *   • Each tool in activeTools[] must have name + tier + introducedAt
 *   • lifecycleStatus=active → primaryModality required
 *   • assessedBy + assessedAt required on every profile update (the
 *     evaluating SLP/therapist is the audit anchor)
 */

const mongoose = require('mongoose');

// ASHA-aligned modality tiers
const MODALITY_TIERS = ['unaided', 'low_tech_aided', 'high_tech_aided'];

// Per-tier modality set (canonical labels for UI dropdowns)
const MODALITIES = [
  // Unaided
  'speech',
  'gestures',
  'facial_expression',
  'body_language',
  'vocalizations',
  'sign_language_asl',
  'sign_language_arabic',
  // Low-tech aided
  'pecs', // Picture Exchange Communication System
  'communication_board',
  'communication_book',
  'choice_cards',
  'object_symbols',
  // High-tech aided
  'sgd_dedicated', // Tobii Dynavox, NovaChat
  'sgd_tablet_app', // Proloquo2Go, TouchChat, LAMP, TD Snap
  'eye_gaze',
  'switch_scanning',
  'text_to_speech',
];

const SYMBOL_SETS = [
  'pcs', // Picture Communication Symbols (Boardmaker)
  'symbolstix',
  'widgit',
  'mayer_johnson',
  'arasaac', // Open-license set used by Spanish-speaking world
  'photographs',
  'custom',
  'none',
];

const VOCABULARY_LEVELS = [
  'pre_symbolic', // gesture / vocalization only
  'single_word',
  'multi_word', // 2-3 word combinations
  'sentence',
  'conversational',
];

const INDEPENDENCE_LEVELS = [
  'full_physical_prompt',
  'partial_physical_prompt',
  'gestural_prompt',
  'verbal_prompt',
  'independent',
];

const LIFECYCLE_STATUSES = ['draft', 'active', 'paused', 'retired'];

// Per-tool subdocument
const AacToolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 150 },
    tier: { type: String, enum: MODALITY_TIERS, required: true },
    modalityKey: { type: String, enum: MODALITIES, required: true },
    symbolSet: { type: String, enum: SYMBOL_SETS, default: 'none' },
    deviceModel: { type: String, default: '', maxlength: 100 },
    appVersion: { type: String, default: '', maxlength: 50 },
    introducedAt: { type: Date, required: true },
    independenceLevel: { type: String, enum: INDEPENDENCE_LEVELS, default: 'verbal_prompt' },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

// Profile-history entry (snapshot at every meaningful update)
const ProfileHistorySchema = new mongoose.Schema(
  {
    snapshotAt: { type: Date, default: Date.now },
    snapshotByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    snapshotByName: { type: String, default: '', maxlength: 100 },
    activeModalitiesCount: { type: Number, default: 0 },
    vocabularyLevel: { type: String, default: '' },
    summary: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const CommunicationAidProfileSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true, // one profile per beneficiary
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    // ── Current state ──────────────────────────────────────────────
    primaryModality: { type: String, enum: MODALITIES.concat([null]), default: null },
    activeModalities: { type: [String], default: () => [] }, // values from MODALITIES
    activeTools: { type: [AacToolSchema], default: () => [] },
    vocabularyLevel: { type: String, enum: VOCABULARY_LEVELS, default: 'pre_symbolic' },
    estimatedActiveVocabularyCount: { type: Number, default: null, min: 0, max: 50000 },
    receptiveLevelDescription: { type: String, default: '', maxlength: 500 },
    expressiveLevelDescription: { type: String, default: '', maxlength: 500 },

    // ── Communication partners (who's trained on this beneficiary's AAC) ─
    trainedPartners: { type: [String], default: () => [] },
    partnerTrainingNotes: { type: String, default: '', maxlength: 1000 },

    // ── Goals + barriers ────────────────────────────────────────────
    nextStepGoals: { type: String, default: '', maxlength: 1000 },
    barriers: { type: [String], default: () => [] },

    // ── Family / home use ───────────────────────────────────────────
    usedAtHome: { type: Boolean, default: false },
    homeUseNotes: { type: String, default: '', maxlength: 500 },

    // ── Assessment audit ───────────────────────────────────────────
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },
    assessedByDiscipline: { type: String, default: '', maxlength: 50 }, // SLP, OT, BCBA
    assessedAt: { type: Date, default: null },
    nextReassessmentDue: { type: Date, default: null },

    lifecycleStatus: {
      type: String,
      enum: LIFECYCLE_STATUSES,
      default: 'draft',
      index: true,
    },
    history: { type: [ProfileHistorySchema], default: () => [] },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'communication_aid_profiles' }
);

CommunicationAidProfileSchema.index({ branchId: 1, lifecycleStatus: 1 });
CommunicationAidProfileSchema.index({ assessedBy: 1, assessedAt: -1 });

CommunicationAidProfileSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

CommunicationAidProfileSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!LIFECYCLE_STATUSES.includes(this.lifecycleStatus)) {
    this.invalidate('lifecycleStatus', `must be one of ${LIFECYCLE_STATUSES.join(',')}`);
    ok = false;
  }

  if (this.lifecycleStatus === 'active') {
    if (!this.primaryModality) {
      this.invalidate('primaryModality', 'primaryModality required when active');
      ok = false;
    }
    if (!Array.isArray(this.activeModalities) || this.activeModalities.length === 0) {
      this.invalidate('activeModalities', 'at least one active modality required when active');
      ok = false;
    }
  }

  if (!VOCABULARY_LEVELS.includes(this.vocabularyLevel)) {
    this.invalidate('vocabularyLevel', `must be one of ${VOCABULARY_LEVELS.join(',')}`);
    ok = false;
  }

  // primaryModality must appear in activeModalities[]
  if (
    this.primaryModality &&
    Array.isArray(this.activeModalities) &&
    !this.activeModalities.includes(this.primaryModality)
  ) {
    this.invalidate('primaryModality', 'primaryModality must appear in activeModalities[]');
    ok = false;
  }

  // Tool integrity — each tool requires name + tier + introducedAt
  if (Array.isArray(this.activeTools)) {
    for (let i = 0; i < this.activeTools.length; i++) {
      const t = this.activeTools[i];
      if (!String(t.name || '').trim()) {
        this.invalidate(`activeTools.${i}.name`, 'tool name required');
        ok = false;
      }
      if (!MODALITY_TIERS.includes(t.tier)) {
        this.invalidate(`activeTools.${i}.tier`, 'tool tier required');
        ok = false;
      }
      if (!t.introducedAt) {
        this.invalidate(`activeTools.${i}.introducedAt`, 'introducedAt required');
        ok = false;
      }
    }
  }

  // Assessment audit required on every save (the evaluating SLP/OT/BCBA
  // is who certifies the profile)
  if (this.lifecycleStatus !== 'draft') {
    if (!this.assessedBy && !String(this.assessedByName || '').trim()) {
      this.invalidate('assessedBy', 'assessedBy required when not draft');
      ok = false;
    }
    if (!this.assessedAt) {
      this.invalidate('assessedAt', 'assessedAt required when not draft');
      ok = false;
    }
  }

  return ok;
});

CommunicationAidProfileSchema.virtual('hasHighTechTool').get(function () {
  return (
    Array.isArray(this.activeTools) && this.activeTools.some(t => t.tier === 'high_tech_aided')
  );
});

CommunicationAidProfileSchema.virtual('reassessmentOverdue').get(function () {
  return !!(this.nextReassessmentDue && new Date(this.nextReassessmentDue) < new Date());
});

CommunicationAidProfileSchema.set('toJSON', { virtuals: true });
CommunicationAidProfileSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.CommunicationAidProfile ||
  mongoose.model('CommunicationAidProfile', CommunicationAidProfileSchema);

module.exports.MODALITY_TIERS = MODALITY_TIERS;
module.exports.MODALITIES = MODALITIES;
module.exports.SYMBOL_SETS = SYMBOL_SETS;
module.exports.VOCABULARY_LEVELS = VOCABULARY_LEVELS;
module.exports.INDEPENDENCE_LEVELS = INDEPENDENCE_LEVELS;
module.exports.LIFECYCLE_STATUSES = LIFECYCLE_STATUSES;
