'use strict';

/**
 * StorySurfaceVariant — W480 (Phase F).
 *
 * Audience-specific variant of a StoryBook. Each StoryBook can spawn
 * 1-7 variants (one per SURFACE_TYPES from W479): family / sibling /
 * beneficiary / extended_family / clinical / regulatory.
 *
 * Each variant carries its own narrative rendering (e.g., simpler
 * language + symbols for sibling_friendly_story; clinical jargon for
 * clinical_narrative; ICF codes only for regulatory_outcome_report).
 *
 * Per v3 §5 Engagement Architecture — 7 surfaces, same data, different
 * lens.
 */

const mongoose = require('mongoose');

const StorySurfaceVariantSchema = new mongoose.Schema(
  {
    storyBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoryBook',
      required: true,
      index: true,
    },
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

    // Variant type — one of W479 SURFACE_TYPES
    surfaceType: {
      type: String,
      enum: [
        'family_quarterly_storybook',
        'family_annual_chronicle',
        'beneficiary_personal_story',
        'sibling_friendly_story',
        'extended_family_summary',
        'clinical_narrative',
        'regulatory_outcome_report',
      ],
      required: true,
      index: true,
    },

    // Language of this variant
    lang: { type: String, enum: ['ar', 'en'], default: 'ar' },

    // Reading-level tuning (e.g., sibling variant grade 4, family grade 8)
    targetReadingGrade: { type: Number, min: 1, max: 16, default: 8 },

    // The narrative content — sections as rendered for this audience
    sections: [
      {
        section: { type: String, required: true, maxlength: 100 },
        title: { type: String, maxlength: 300 },
        body: { type: String, maxlength: 10000 },
        visualHint: {
          type: String,
          enum: ['none', 'photo', 'chart_line', 'chart_bar', 'icon', 'illustration', 'video'],
          default: 'none',
        },
      },
    ],

    // For visual variants (family + beneficiary): URLs to images/charts
    visualAssets: [
      {
        kind: {
          type: String,
          enum: ['photo', 'chart_image', 'illustration', 'video_thumb'],
        },
        url: { type: String, maxlength: 500 },
        caption: { type: String, maxlength: 500 },
        consentVerified: { type: Boolean, default: false },
      },
    ],

    // Generation metadata
    generatedBy: {
      type: String,
      enum: ['template', 'llm', 'manual', 'translation_of_other_variant'],
      required: true,
    },
    generatedAt: { type: Date, default: Date.now },
    sourceLlmModel: { type: String, maxlength: 100 }, // e.g. 'claude-opus-4.7'
    citations: [{ type: String, maxlength: 200 }], // RAG citations for LLM-generated

    // Lifecycle
    status: {
      type: String,
      enum: ['draft', 'approved', 'published', 'retracted'],
      default: 'draft',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    retractedAt: { type: Date },
    retractionReason: { type: String, maxlength: 1000 },

    // PDPL — sibling-friendly + beneficiary-facing variants are sensitive
    isSensitive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'story_surface_variants',
  }
);

StorySurfaceVariantSchema.index({ storyBookId: 1, surfaceType: 1 }, { unique: true });
StorySurfaceVariantSchema.index({ beneficiaryId: 1, surfaceType: 1, status: 1 });

// Wave-18 invariants
StorySurfaceVariantSchema.pre('save', async function () {
  // Sibling/beneficiary variants are sensitive by default — apply BEFORE
  // the status checks so the auto-flag persists even on save failures.
  if (
    ['sibling_friendly_story', 'beneficiary_personal_story'].includes(this.surfaceType) &&
    this.isSensitive === false
  ) {
    this.isSensitive = true;
  }
  // Status: approved requires approvedBy
  if (['approved', 'published'].includes(this.status) && !this.approvedBy) {
    throw new Error(`StorySurfaceVariant: status="${this.status}" requires approvedBy`);
  }
  // Retracted requires reason
  if (this.status === 'retracted' && (!this.retractionReason || this.retractionReason.length < 5)) {
    throw new Error('StorySurfaceVariant: retracted status requires retractionReason ≥5 chars');
  }
  // Auto-fill timestamps
  if (this.status === 'approved' && !this.approvedAt) this.approvedAt = new Date();
  if (this.status === 'retracted' && !this.retractedAt) this.retractedAt = new Date();

  // Visual assets with photos require consentVerified=true before publish
  if (['approved', 'published'].includes(this.status)) {
    for (const asset of this.visualAssets || []) {
      if (asset.kind === 'photo' && asset.consentVerified !== true) {
        throw new Error(
          'StorySurfaceVariant: photo visualAssets require consentVerified=true before approval/publish'
        );
      }
    }
  }
});

module.exports =
  mongoose.models.StorySurfaceVariant ||
  mongoose.model('StorySurfaceVariant', StorySurfaceVariantSchema);
