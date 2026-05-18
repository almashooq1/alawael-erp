'use strict';

/**
 * HikvisionFaceLibrary — Wave 97 Phase 2.
 *
 * Logical container for face templates. A library has:
 *   • a unique libraryCode
 *   • a primary branchId (where it logically belongs)
 *   • a syncStrategy (branch-only / multi-branch / global)
 *   • a list of subscribed Hikvision devices (face-capable terminals
 *     and primary/secondary cameras) — the sync worker (Phase 2 later
 *     wave) pushes the library's templates to these devices.
 *   • an `integrityHash` — sha256 over (templateId, templateChecksum)
 *     pairs sorted by templateId. The sync worker recomputes after
 *     every successful push and compares against the stored value to
 *     detect drift between DB state and on-device state.
 *
 * `usedSlots` is denormalised — kept consistent by the enrollment
 * service (`+1` on activate, `-1` on suspend/delete). NEVER rely on
 * this for security gating; it exists for fast UI counts. The capacity
 * gate in the service re-counts active templates as the source of truth.
 *
 * Cross-field invariants (Wave-18 virtual-path validator):
 *   • capacity ≤ TEMPLATE_DEFAULTS.MAX_LIBRARY_CAPACITY
 *   • multi-branch requires allowedBranchIds.length ≥ 2
 *   • global has no allowedBranchIds (must be empty)
 *   • archived libraries reject mutations (enforced at service layer)
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionFaceLibrarySchema = new mongoose.Schema(
  {
    libraryCode: {
      type: String,
      required: true,
      unique: true,
      maxlength: 64,
      index: true,
      trim: true,
    },
    name: { type: String, required: true, maxlength: 200, trim: true },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    syncStrategy: {
      type: String,
      enum: reg.SYNC_STRATEGIES,
      default: reg.SYNC_STRATEGY.BRANCH_ONLY,
    },
    allowedBranchIds: {
      // Only populated when syncStrategy = multi-branch
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      default: () => [],
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: reg.TEMPLATE_DEFAULTS.MAX_LIBRARY_CAPACITY,
    },
    usedSlots: { type: Number, default: 0, min: 0 },

    devicesSubscribed: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HikvisionDevice' }],
      default: () => [],
    },

    status: {
      type: String,
      enum: reg.LIBRARY_STATUSES,
      default: reg.LIBRARY_STATUS.ACTIVE,
      index: true,
    },

    integrityHash: { type: String, default: null, maxlength: 128 },
    lastFullSyncAt: { type: Date, default: null },
    lastFullSyncError: { type: String, default: null, maxlength: 500 },

    notes: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hikvision_face_libraries' }
);

HikvisionFaceLibrarySchema.index({ branchId: 1, status: 1 });
HikvisionFaceLibrarySchema.index({ status: 1, lastFullSyncAt: -1 });

// ─── Wave-18 invariants ───────────────────────────────────────────
HikvisionFaceLibrarySchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionFaceLibrarySchema.path('__invariants').validate(function () {
  let ok = true;

  if (this.syncStrategy === reg.SYNC_STRATEGY.MULTI_BRANCH) {
    // multi-branch needs the primary branch + at least one other
    if (!Array.isArray(this.allowedBranchIds) || this.allowedBranchIds.length < 2) {
      this.invalidate(
        'allowedBranchIds',
        'multi-branch strategy requires at least 2 allowed branches'
      );
      ok = false;
    }
  }

  if (this.syncStrategy === reg.SYNC_STRATEGY.GLOBAL) {
    if (Array.isArray(this.allowedBranchIds) && this.allowedBranchIds.length > 0) {
      this.invalidate('allowedBranchIds', 'global strategy must have no allowedBranchIds');
      ok = false;
    }
  }

  if (this.usedSlots > this.capacity) {
    this.invalidate('usedSlots', `usedSlots (${this.usedSlots}) > capacity (${this.capacity})`);
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionFaceLibrary ||
  mongoose.model('HikvisionFaceLibrary', HikvisionFaceLibrarySchema);

module.exports.HikvisionFaceLibrarySchema = HikvisionFaceLibrarySchema;
