/**
 * Region model — Phase 7 regional governance.
 *
 * A region is a group of branches under a `regional_director`. Regions
 * are authoritative for:
 *   • approval chains with `branchScope: 'region'` (e.g. cross-branch
 *     transfers, region-wide quality audits)
 *   • regional_director + regional_quality scope expansion
 *   • reporting roll-ups (branch KPIs → region → group)
 *
 * Regions are a soft concept — a branch can change regions, and a
 * region can be dissolved. The authoritative link is
 * `Branch.regionId`. The legacy `Branch.location.region` string enum
 * stays as a display fallback and doesn't replace this.
 */

'use strict';

const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      // e.g. CENTRAL, WEST, EAST, NORTH, SOUTH
    },
    name_ar: { type: String, required: true, trim: true },
    name_en: { type: String, required: true, trim: true },

    // Primary branch (HQ for the region). Optional — some regions may
    // be administrative-only without a physical HQ.
    primaryBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },

    // The regional_director user assigned as owner of this region.
    // Soft link — changes when leadership rotates.
    directorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'dissolved'],
      default: 'active',
      index: true,
    },

    // Free-form operational metadata (target branch count, expansion
    // plan, etc.) — intentionally unstructured.
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

regionSchema.index({ status: 1, code: 1 });

module.exports = mongoose.models.Region || mongoose.model('Region', regionSchema);
