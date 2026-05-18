'use strict';

/**
 * HikvisionFaceTemplateLink — Wave 97 Phase 2.
 *
 * Bridges an employee to the Hikvision-side `personId` inside a face
 * library. One employee may have multiple templates across libraries
 * (e.g. one per branch they work in), but at most ONE non-deleted
 * template per (libraryId, employeeId) — enforced by partial unique
 * index below.
 *
 * Lifecycle:
 *   pending → confirmed by sync worker → active
 *   active  → suspend()         → suspended (kept in DB, excluded from matching)
 *   active  → reEnroll()        → new pending template, old one moves to suspended
 *   *       → deactivateOnExit  → deleted (tombstone — employee left)
 *   *       → archiveLibrary    → suspended (cascade)
 *
 * Phase 2 records the lifecycle. Actual ISAPI push/pull to the device
 * is performed by the sync-worker wave (Phase 2 extended) which marks
 * `lastSyncedAt` + `lastSyncError` per attempt.
 *
 * Cross-field invariants:
 *   • active templates require a non-null hikvisionPersonId
 *   • active templates require templateChecksum
 *   • suspended/deleted templates require a deactivationReason
 *   • enrollmentImages must include a front image (validated at the
 *     service layer via reg.validateEnrollmentImages, but the schema
 *     also enforces at least one image)
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const EnrollmentImageSchema = new mongoose.Schema(
  {
    angle: { type: String, enum: reg.IMAGE_ANGLES, required: true },
    quality: { type: Number, required: true, min: 0, max: 100 },
    ref: { type: String, required: true, maxlength: 500 }, // S3 key / file path
    capturedAt: { type: Date, default: Date.now },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const HikvisionFaceTemplateLinkSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionFaceLibrary',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // Assigned by Hikvision SDK when the template is pushed to a
    // device. NULL while the template is `pending`.
    hikvisionPersonId: { type: String, default: null, maxlength: 128 },

    enrollmentImages: {
      type: [EnrollmentImageSchema],
      required: true,
      validate: {
        validator: arr => Array.isArray(arr) && arr.length > 0,
        message: 'enrollmentImages must contain at least one image',
      },
    },

    templateChecksum: { type: String, default: null, maxlength: 128 },

    status: {
      type: String,
      enum: reg.TEMPLATE_STATUSES,
      default: reg.TEMPLATE_STATUS.PENDING,
      index: true,
    },

    // Audit / sync timestamps
    enrolledAt: { type: Date, default: Date.now },
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null, maxlength: 500 },

    deactivatedAt: { type: Date, default: null },
    deactivationReason: { type: String, default: null, maxlength: 500 },
    cascadeReason: {
      type: String,
      enum: reg.CASCADE_REASONS,
      default: null,
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // When the employee exit triggers this template's deletion, we
    // record the source so audit + reporting can attribute it.
    exitTriggeredAt: { type: Date, default: null },

    // Forward link to the next template if this one was superseded
    // by a reEnroll. NULL otherwise. Lets us walk the chain for audit.
    supersededByTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionFaceTemplateLink',
      default: null,
    },
  },
  { timestamps: true, collection: 'hikvision_face_template_links' }
);

// At most one NON-DELETED template per (library, employee).
// Partial filter expression keeps the index tight + lets deleted rows
// remain as tombstones without conflicting.
HikvisionFaceTemplateLinkSchema.index(
  { libraryId: 1, employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          reg.TEMPLATE_STATUS.PENDING,
          reg.TEMPLATE_STATUS.ACTIVE,
          reg.TEMPLATE_STATUS.SUSPENDED,
        ],
      },
    },
  }
);
HikvisionFaceTemplateLinkSchema.index({ employeeId: 1, status: 1 });
HikvisionFaceTemplateLinkSchema.index({ libraryId: 1, status: 1 });
HikvisionFaceTemplateLinkSchema.index({ status: 1, lastSyncedAt: 1 });
HikvisionFaceTemplateLinkSchema.index({ hikvisionPersonId: 1 }, { sparse: true });

// ─── Wave-18 invariants ───────────────────────────────────────────
HikvisionFaceTemplateLinkSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionFaceTemplateLinkSchema.path('__invariants').validate(function () {
  let ok = true;

  if (this.status === reg.TEMPLATE_STATUS.ACTIVE) {
    if (!this.hikvisionPersonId) {
      this.invalidate('hikvisionPersonId', 'active templates require hikvisionPersonId');
      ok = false;
    }
    if (!this.templateChecksum) {
      this.invalidate('templateChecksum', 'active templates require templateChecksum');
      ok = false;
    }
  }

  if (
    (this.status === reg.TEMPLATE_STATUS.SUSPENDED ||
      this.status === reg.TEMPLATE_STATUS.DELETED) &&
    !this.deactivationReason
  ) {
    this.invalidate('deactivationReason', `${this.status} templates require a deactivationReason`);
    ok = false;
  }

  // Front image — service layer should have already caught this, but
  // belt-and-braces.
  if (
    Array.isArray(this.enrollmentImages) &&
    !this.enrollmentImages.some(img => img.angle === reg.IMAGE_ANGLE.FRONT)
  ) {
    this.invalidate('enrollmentImages', 'at least one image must be angle="front"');
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionFaceTemplateLink ||
  mongoose.model('HikvisionFaceTemplateLink', HikvisionFaceTemplateLinkSchema);

module.exports.HikvisionFaceTemplateLinkSchema = HikvisionFaceTemplateLinkSchema;
