/**
 * WhatsAppCampaign — حملة واتساب مجدوَلة ومُتتبَّعة
 * ═══════════════════════════════════════════════════════════════════════════
 * A persisted, trackable wrapper over the existing on-demand contact-group
 * broadcast (POST /contact-groups/:id/broadcast). Adds: a saved audience
 * (a WhatsAppContactGroup), a template + args, an optional schedule, lifecycle
 * status, and per-run metrics — so awareness campaigns (workshops, programs,
 * parent education) are no longer fire-and-forget.
 *
 * The actual send still flows through the hardened primitives
 * (WhatsAppConsent.canMessage filter + rate-limit + whatsappTemplates.sendTemplate);
 * this model only owns the campaign state + outcome counters.
 *
 * Branch-isolated (W1407/W1412): branchId is the tenant key.
 *
 * @module models/WhatsAppCampaign
 */

'use strict';

const mongoose = require('mongoose');

const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed'];

const metricsSchema = new mongoose.Schema(
  {
    targeted: { type: Number, default: 0, min: 0 }, // total members in the group
    eligible: { type: Number, default: 0, min: 0 }, // passed consent filter
    blocked: { type: Number, default: 0, min: 0 }, // failed consent (opted-out / no window)
    sent: { type: Number, default: 0, min: 0 },
    queued: { type: Number, default: 0, min: 0 }, // rate-limited → not sent this run
    failed: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const whatsappCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: 'draft',
      index: true,
    },

    // Audience: a saved contact group (consent filtering happens at run time).
    contactGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppContactGroup',
      required: true,
    },

    // Content: a template key from whatsappTemplates registry + its args.
    templateKey: { type: String, required: true, trim: true },
    templateArgs: { type: [String], default: [] },

    // Schedule (optional). A future scheduler picks up status='scheduled' rows
    // whose scheduledAt <= now; until then they can be run manually.
    scheduledAt: { type: Date, index: true },
    startedAt: Date,
    completedAt: Date,

    metrics: { type: metricsSchema, default: () => ({}) },
    lastError: { type: String, maxlength: 2000 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: 'whatsapp_campaigns',
  }
);

whatsappCampaignSchema.index({ branchId: 1, status: 1, scheduledAt: 1 });
whatsappCampaignSchema.index({ status: 1, scheduledAt: 1 }); // scheduler sweep

// ─── Statics (pure, branch-isolation helpers — mirror WhatsAppConversation) ──

// By-id filter that also enforces BRANCH isolation (W1407 doctrine): a foreign
// branch id yields a clean 404, never an existence leak. Pure + testable.
function scopedFilter(id, branchScope) {
  const filter = { _id: id, isDeleted: false };
  if (branchScope) filter.branchId = branchScope;
  return filter;
}

// List filter with optional status. Pure + testable.
function listFilter(branchScope, opts = {}) {
  const filter = { isDeleted: false };
  if (branchScope) filter.branchId = branchScope;
  if (opts.status) filter.status = opts.status;
  return filter;
}

// A campaign may only be launched from a not-yet-sent state. Pure + testable.
const RUNNABLE_STATUSES = ['draft', 'scheduled'];
function isRunnable(status) {
  return RUNNABLE_STATUSES.includes(status);
}

// A campaign may only be cancelled before it completes. Pure + testable.
const CANCELLABLE_STATUSES = ['draft', 'scheduled', 'running'];
function isCancellable(status) {
  return CANCELLABLE_STATUSES.includes(status);
}

whatsappCampaignSchema.statics.scopedFilter = scopedFilter;
whatsappCampaignSchema.statics.listFilter = listFilter;
whatsappCampaignSchema.statics.isRunnable = isRunnable;
whatsappCampaignSchema.statics.isCancellable = isCancellable;

module.exports =
  mongoose.models.WhatsAppCampaign ||
  mongoose.model('WhatsAppCampaign', whatsappCampaignSchema);

// Exported for the drift guard (pure helpers must stay testable).
module.exports.CAMPAIGN_STATUSES = CAMPAIGN_STATUSES;
module.exports.scopedFilter = scopedFilter;
module.exports.listFilter = listFilter;
module.exports.isRunnable = isRunnable;
module.exports.isCancellable = isCancellable;
