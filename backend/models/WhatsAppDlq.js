'use strict';

/**
 * WhatsApp Dead-Letter Queue — قائمة الرسائل الفاشلة
 * ═══════════════════════════════════════════════════════════════════════════
 * Persisted record of an outbound send that exhausted in-process retries
 * (3 attempts with exponential backoff) due to Meta returning 429 / 5xx
 * or network failures.
 *
 * Lifecycle:
 *   pending → retrying → (replayed | exhausted | abandoned)
 *
 * - pending:    queued; nextRetryAt scheduled
 * - retrying:   worker picked it up (advisory lock via `lockedUntil`)
 * - replayed:   resend succeeded; providerMessageId populated, doc kept
 *               for audit (TTL 30 days, aligned with PDPL retention)
 * - exhausted:  reached maxAttempts without success
 * - abandoned:  manually marked by an admin (e.g. opted-out, wrong number)
 *
 * The PII fields (text, phone) get the same 30-day TTL as the rest of the
 * platform — see CLAUDE.md's "TTL fields" convention.
 *
 * Indexes:
 *   - { status, nextRetryAt }  — worker sweep query
 *   - { phone }                — admin filter
 *   - { createdAt, status }    — analytics & TTL
 *
 * @module models/WhatsAppDlq
 */

const mongoose = require('mongoose');

const DLQ_STATUSES = ['pending', 'retrying', 'replayed', 'exhausted', 'abandoned'];

const WhatsAppDlqSchema = new mongoose.Schema(
  {
    // ─── Target ────────────────────────────────────────────────────────────
    phone: { type: String, required: true, index: true },

    // ─── Send payload (replayable) ─────────────────────────────────────────
    sendType: {
      type: String,
      enum: ['text', 'template', 'document', 'image', 'interactive', 'otp', 'notification'],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },

    // ─── Lineage ───────────────────────────────────────────────────────────
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, default: null },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    idempotencyKey: { type: String, default: null, index: true },

    // ─── Error state ──────────────────────────────────────────────────────
    lastError: {
      message: { type: String, default: '' },
      statusCode: { type: Number, default: null },
      metaError: { type: mongoose.Schema.Types.Mixed, default: null },
      occurredAt: { type: Date, default: null },
    },
    attempts: { type: Number, default: 1 }, // initial failed send counts as 1
    maxAttempts: { type: Number, default: 5 },

    // ─── Worker scheduling ────────────────────────────────────────────────
    status: {
      type: String,
      enum: DLQ_STATUSES,
      default: 'pending',
      index: true,
    },
    nextRetryAt: { type: Date, default: () => new Date(Date.now() + 60_000), index: true },
    lockedUntil: { type: Date, default: null }, // advisory lock to prevent double-replay

    // ─── Outcome (when status=replayed) ───────────────────────────────────
    providerMessageId: { type: String, default: null },
    replayedAt: { type: Date, default: null },

    // ─── Audit ─────────────────────────────────────────────────────────────
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { collection: 'whatsapp_dlq' }
);

// W956 — async (Mongoose-9 native); no longer depends on the legacy-hook shim.
WhatsAppDlqSchema.pre('save', async function preSave() {
  this.updatedAt = new Date();
});

WhatsAppDlqSchema.index({ status: 1, nextRetryAt: 1 });
// PII TTL — aligns with platform-wide 30-day policy for outbound communications.
WhatsAppDlqSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

// ─── Statics ──────────────────────────────────────────────────────────────

/**
 * Enqueue a failed send. Idempotent: if a doc already exists for the same
 * idempotencyKey + sendType + phone, returns it without duplicating.
 */
WhatsAppDlqSchema.statics.enqueueFailure = async function enqueueFailure(payload, error, ctx = {}) {
  if (ctx.idempotencyKey) {
    const existing = await this.findOne({
      idempotencyKey: ctx.idempotencyKey,
      phone: ctx.phone,
      sendType: ctx.sendType,
    });
    if (existing) {
      existing.attempts = (existing.attempts || 0) + 1;
      existing.lastError = {
        message: error?.message || 'unknown',
        statusCode: error?.statusCode ?? null,
        metaError: error?.meta ?? null,
        occurredAt: new Date(),
      };
      await existing.save();
      return existing;
    }
  }

  const backoffMs = computeBackoffMs(1);
  return this.create({
    phone: ctx.phone,
    sendType: ctx.sendType,
    payload,
    initiatedBy: ctx.initiatedBy || null,
    organizationId: ctx.organizationId || null,
    beneficiaryId: ctx.beneficiaryId || null,
    idempotencyKey: ctx.idempotencyKey || null,
    lastError: {
      message: error?.message || 'unknown',
      statusCode: error?.statusCode ?? null,
      metaError: error?.meta ?? null,
      occurredAt: new Date(),
    },
    attempts: 1,
    status: 'pending',
    nextRetryAt: new Date(Date.now() + backoffMs),
  });
};

/**
 * Atomic claim: marks the next item due as `retrying` with a 30-second
 * advisory lock so a second worker instance won't pick it up. Returns null
 * if nothing due. Use `release()` (success or error) when done.
 */
WhatsAppDlqSchema.statics.claimNext = async function claimNext({ now = new Date() } = {}) {
  // Two-step atomic claim: find + update to avoid findOneAndUpdate+sort driver issues
  const doc = await this.findOne({
    status: 'pending',
    nextRetryAt: { $lte: now },
    $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
  }).sort({ nextRetryAt: 1 }).lean();

  if (!doc) return null;

  const updated = await this.findOneAndUpdate(
    { _id: doc._id, status: 'pending' },
    { $set: { status: 'retrying', lockedUntil: new Date(now.getTime() + 30_000) } },
    { returnDocument: 'after' }
  );

  return updated; // null if another worker claimed it first
};

WhatsAppDlqSchema.statics.markReplayed = async function markReplayed(id, providerMessageId) {
  return this.findByIdAndUpdate(
    id,
    {
      $set: {
        status: 'replayed',
        providerMessageId,
        replayedAt: new Date(),
        lockedUntil: null,
      },
    },
    { returnDocument: 'after' }
  );
};

WhatsAppDlqSchema.statics.markRetryFailure = async function markRetryFailure(id, error) {
  const doc = await this.findById(id);
  if (!doc) return null;
  doc.attempts = (doc.attempts || 0) + 1;
  doc.lastError = {
    message: error?.message || 'unknown',
    statusCode: error?.statusCode ?? null,
    metaError: error?.meta ?? null,
    occurredAt: new Date(),
  };
  doc.lockedUntil = null;
  if (doc.attempts >= doc.maxAttempts) {
    doc.status = 'exhausted';
  } else {
    doc.status = 'pending';
    doc.nextRetryAt = new Date(Date.now() + computeBackoffMs(doc.attempts));
  }
  await doc.save();
  return doc;
};

// Exponential backoff with jitter: 1m, 5m, 15m, 60m, 4h
// Returns milliseconds.
function computeBackoffMs(attempt) {
  const baseMin = [1, 5, 15, 60, 240][Math.min(attempt - 1, 4)] ?? 240;
  const jitter = Math.floor(Math.random() * 30); // up to 30s jitter
  return (baseMin * 60 + jitter) * 1000;
}

WhatsAppDlqSchema.statics.computeBackoffMs = computeBackoffMs;

const Model = mongoose.models.WhatsAppDlq || mongoose.model('WhatsAppDlq', WhatsAppDlqSchema);
// Ensure the helper is reachable even if `mongoose.models.WhatsAppDlq` was
// cached from a prior require where the statics block hadn't run yet
// (test reload, hot-reload in dev). Re-attaching is idempotent.
if (typeof Model.computeBackoffMs !== 'function') {
  Model.computeBackoffMs = computeBackoffMs;
}
Model.DLQ_STATUSES = DLQ_STATUSES;

module.exports = Model;
