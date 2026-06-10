'use strict';

/**
 * StoryBook — W480 (Phase F: Story Architecture).
 *
 * Persistent quarterly story book composed from beneficiary's quarterly
 * data via W479 story-builder.lib. Each StoryBook can spawn multiple
 * SurfaceVariant records (W482) — one for each audience (family / sibling /
 * beneficiary / extended_family / clinical / regulatory).
 *
 * Per v3 §6 Innovation 7. Stories are the engagement layer that
 * transforms "Goal Achievement Rate 73%" data into "your child went
 * from X to Y" narratives.
 */

const mongoose = require('mongoose');

const StoryBookSchema = new mongoose.Schema(
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

    // Period this story covers
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    periodType: {
      type: String,
      enum: ['quarterly', 'annual', 'milestone', 'ad-hoc'],
      default: 'quarterly',
      required: true,
    },

    // Composition metadata
    composedAt: { type: Date, default: Date.now, index: true },
    composedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    composedByMethod: {
      type: String,
      enum: ['template_only', 'llm_assisted', 'manual', 'hybrid'],
      default: 'template_only',
    },

    // Sections (per W479 STORY_SECTIONS)
    sections: [
      {
        section: { type: String, required: true, maxlength: 100 },
        title: { type: String, maxlength: 300 },
        content: { type: mongoose.Schema.Types.Mixed }, // shape varies per section
        hasData: { type: Boolean, default: true },
      },
    ],

    // Source data references (so we can regenerate)
    sources: {
      gasSnapshotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GasScoreSnapshot' }],
      icfAssessmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ICFAssessment' }],
      voiceLogIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryVoiceLog' }],
      wbciSnapshotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyWellbeingSnapshot' }],
      prideMomentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PrideMoment' }],
    },

    // Quality + confidence
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    coverage: { type: Number, min: 0, max: 100 }, // % of data sources present

    // Surface variants spawned from this book (W482)
    surfaceVariants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StorySurfaceVariant' }],

    // Lifecycle
    status: {
      type: String,
      enum: ['draft', 'reviewed', 'published', 'shared_with_family', 'archived'],
      default: 'draft',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    publishedAt: { type: Date },
    sharedWithFamilyAt: { type: Date },

    // Family-facing access
    familyAccessGranted: { type: Boolean, default: false },
    familyViewCount: { type: Number, default: 0, min: 0 },
    lastViewedAt: { type: Date },

    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'story_books',
  }
);

StoryBookSchema.index({ beneficiaryId: 1, periodStart: -1 });
StoryBookSchema.index({ branchId: 1, periodType: 1, status: 1 });

// Wave-18 invariants
StoryBookSchema.pre('save', async function () {
  if (this.periodStart && this.periodEnd && this.periodStart >= this.periodEnd) {
    throw new Error('StoryBook: periodStart must be before periodEnd');
  }
  // Status transitions
  if (this.status === 'reviewed' && !this.reviewedAt) this.reviewedAt = new Date();
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  if (this.status === 'shared_with_family' && !this.sharedWithFamilyAt) {
    this.sharedWithFamilyAt = new Date();
  }
  // published requires reviewedBy
  if (['published', 'shared_with_family'].includes(this.status) && !this.reviewedBy) {
    throw new Error(`StoryBook: status="${this.status}" requires reviewedBy`);
  }
});

// ── Unified-core producer (W1100): emit on quarterly story book publication ──
StoryBookSchema.pre('save', function flagStoryBookPublished() {
  this.$__storyBookPublished = this.isModified('status') && this.status === 'published';
});

StoryBookSchema.post('save', function emitStoryBookPublished(doc) {
  if (!doc.$__storyBookPublished) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('story-book', 'story_book.published', {
      storyBookId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      periodType: doc.periodType,
      coverage: doc.coverage,
      publishedAt: doc.publishedAt || new Date(),
    });
  } catch (_err) {
    /* non-blocking: timeline linkage must never break a save */
  }
});

module.exports = mongoose.models.StoryBook || mongoose.model('StoryBook', StoryBookSchema);
