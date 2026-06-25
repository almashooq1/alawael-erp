/**
 * WhatsAppEventBinding — ربط حدث نواة ← رسالة واتساب (قابل للتهيئة من الإدارة)
 * ═══════════════════════════════════════════════════════════════════════════
 * The configurable layer behind the M5 "automation builder": instead of a
 * hardcoded, env-gated subscriber per event (W1511 post-session, W1513
 * complaint), an admin defines a binding — "when EVENT fires, message the
 * guardian with TITLE/BODY" — and toggles it on/off without a deploy.
 *
 * The generic dispatcher (whatsappEventBindingDispatcher) reads enabled bindings
 * at dispatch time and sends through the same consent-gated path.
 *
 * Branch-isolated: a binding with a branchId fires only for that branch's
 * beneficiaries; a null branchId fires for all branches.
 *
 * @module models/WhatsAppEventBinding
 */

'use strict';

const mongoose = require('mongoose');

// The curated set of LIVE producer events a binding may target (each carries a
// beneficiaryId in its payload — verified in the producer catalogue, W1513).
const BINDABLE_EVENTS = [
  'sessions.session.completed',
  'complaint.complaint.resolved',
  'invoices.invoice.paid',
  'appointments.appointment.booked',
  'appointments.appointment.cancelled',
  'generated-report.generated_report.completed',
  'risk-snapshot.risk_snapshot.escalated',
];

const whatsappEventBindingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    event: { type: String, required: true, enum: BINDABLE_EVENTS, index: true },
    enabled: { type: Boolean, default: true, index: true },

    // Message — title + body. Body supports the {beneficiaryName} placeholder.
    title: { type: String, required: true, trim: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, maxlength: 1024 },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: 'whatsapp_event_bindings' }
);

whatsappEventBindingSchema.index({ event: 1, enabled: 1, isDeleted: 1 }); // dispatch lookup
whatsappEventBindingSchema.index({ branchId: 1, isDeleted: 1, updatedAt: -1 }); // admin list

// ─── Pure statics (branch isolation — mirror WhatsAppCampaign) ───────────────
function scopedFilter(id, branchScope) {
  const filter = { _id: id, isDeleted: false };
  if (branchScope) filter.branchId = branchScope;
  return filter;
}

function listFilter(branchScope, opts = {}) {
  const filter = { isDeleted: false };
  if (branchScope) filter.branchId = branchScope;
  if (opts.event) filter.event = opts.event;
  return filter;
}

// Dispatch-time filter: enabled bindings for `event` that apply to the payload's
// branch (binding.branchId null = all branches; else must match). Pure + testable.
function dispatchFilter(event, branchId) {
  const filter = { event, enabled: true, isDeleted: false };
  if (branchId) filter.$or = [{ branchId: null }, { branchId }, { branchId: { $exists: false } }];
  else filter.$or = [{ branchId: null }, { branchId: { $exists: false } }];
  return filter;
}

whatsappEventBindingSchema.statics.scopedFilter = scopedFilter;
whatsappEventBindingSchema.statics.listFilter = listFilter;
whatsappEventBindingSchema.statics.dispatchFilter = dispatchFilter;

module.exports =
  mongoose.models.WhatsAppEventBinding ||
  mongoose.model('WhatsAppEventBinding', whatsappEventBindingSchema);

module.exports.BINDABLE_EVENTS = BINDABLE_EVENTS;
module.exports.scopedFilter = scopedFilter;
module.exports.listFilter = listFilter;
module.exports.dispatchFilter = dispatchFilter;
