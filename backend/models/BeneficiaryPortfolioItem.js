'use strict';

/**
 * BeneficiaryPortfolioItem — Wave 199b.
 *
 * "بورتفوليو الطفل" — visual/document evidence of progress over time.
 * Photos, videos, artwork, achievements, milestone reports.
 *
 * Phase 1 (this wave): URL-based — caller provides a hosted URL.
 * Phase 2 (deferred): actual file upload via S3 / local store, with
 * thumbnail generation. The `url` + `thumbnailUrl` fields already
 * accommodate either approach.
 *
 * Visibility model: parents see their child's portfolio by default.
 * Staff can flag items as 'staff_only' for sensitive clinical photos
 * (e.g., injury documentation) so parents don't see them in the portal.
 */

const mongoose = require('mongoose');

const TYPES = ['photo', 'video', 'artwork', 'achievement', 'report'];
const VISIBILITIES = ['parent_and_staff', 'staff_only', 'parent_only'];

const PortfolioItemSchema = new mongoose.Schema(
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },

    type: { type: String, enum: TYPES, required: true, index: true },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 1000 },

    // Phase 1: caller-provided URL. Phase 2: written by upload pipeline.
    url: { type: String, required: true, maxlength: 1000 },
    thumbnailUrl: { type: String, default: '', maxlength: 1000 },
    mimeType: { type: String, default: '', maxlength: 100 },
    sizeBytes: { type: Number, default: null, min: 0 },

    // The date the achievement/photo represents (NOT createdAt).
    achievementDate: { type: Date, required: true, index: true },

    tags: { type: [String], default: () => [], index: true },
    visibility: { type: String, enum: VISIBILITIES, default: 'parent_and_staff', index: true },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedByName: { type: String, default: '', maxlength: 100 },

    // Used to highlight key portfolio items in beneficiary-360
    isMilestone: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: 'beneficiary_portfolio_items' }
);

PortfolioItemSchema.index({ beneficiaryId: 1, achievementDate: -1 });
PortfolioItemSchema.index({ beneficiaryId: 1, type: 1, achievementDate: -1 });
PortfolioItemSchema.index({ tags: 1, achievementDate: -1 });

module.exports =
  mongoose.models.BeneficiaryPortfolioItem ||
  mongoose.model('BeneficiaryPortfolioItem', PortfolioItemSchema);

module.exports.TYPES = TYPES;
module.exports.VISIBILITIES = VISIBILITIES;
