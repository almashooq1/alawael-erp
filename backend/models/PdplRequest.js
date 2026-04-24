/**
 * PdplRequest.js — Personal Data Protection Law data-subject requests.
 *
 * Beneficiary-360 Commit 26. Powers
 * `compliance.pdpl.dsar.sla_breach`.
 *
 * Under Saudi PDPL (2021), data subjects have the right to request
 * access, correction, deletion, portability, or objection to
 * processing of their personal data. The controller has 30 days to
 * respond (extendable by an additional 30 days for complex
 * requests — `status: 'extended'` captures that path).
 *
 * Design decisions:
 *
 *   1. **Five request types** — `access`, `correction`, `deletion`,
 *      `portability`, `objection`. Mirror of the PDPL articles.
 *
 *   2. **Explicit status state machine** —
 *        received → in_progress → completed
 *        received → in_progress → rejected
 *        received → in_progress → extended → completed
 *      "Open" = received / in_progress / extended. The adapter
 *      counts days-open on those.
 *
 *   3. **`rejectionReason` required when rejecting**, enforced at
 *      the application layer (a pre-save hook would be fine too
 *      but adds surface; app-layer check keeps model pristine).
 *
 *   4. **`requestedAt` is the subject's timestamp**, not createdAt
 *      — if a request comes in via letter and is digitized later,
 *      the SLA clock starts at the original request date.
 */

'use strict';

const mongoose = require('mongoose');

const PDPL_REQUEST_TYPES = Object.freeze([
  'access',
  'correction',
  'deletion',
  'portability',
  'objection',
]);

const PDPL_REQUEST_STATUSES = Object.freeze([
  'received',
  'in_progress',
  'extended',
  'completed',
  'rejected',
]);

const OPEN_PDPL_STATUSES = Object.freeze(['received', 'in_progress', 'extended']);

const pdplRequestSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: PDPL_REQUEST_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: PDPL_REQUEST_STATUSES,
      default: 'received',
      index: true,
    },
    requestedAt: { type: Date, required: true, default: Date.now },
    respondedAt: { type: Date, default: null },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fulfillmentNotes: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'pdpl_requests' }
);

pdplRequestSchema.index({ beneficiaryId: 1, status: 1, requestedAt: -1 });

const PdplRequest = mongoose.models.PdplRequest || mongoose.model('PdplRequest', pdplRequestSchema);

module.exports = {
  PdplRequest,
  PDPL_REQUEST_TYPES,
  PDPL_REQUEST_STATUSES,
  OPEN_PDPL_STATUSES,
};
