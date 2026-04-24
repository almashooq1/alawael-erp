'use strict';

/**
 * HrWebhookSubscription — Phase 11 Commit 35 (4.0.52).
 *
 * Registry of external URLs that want HR events pushed to them.
 * Each subscription names a target URL + HMAC secret + the set of
 * event types it cares about. The dispatcher (hrWebhookDispatcher)
 * reads this collection, filters by event type, and POSTs.
 *
 * Shape:
 *   name             label for ops
 *   target_url       https URL receiving the POST
 *   hmac_secret      shared secret signing the payload (X-HR-Signature)
 *   event_types      array of event type strings subscribed to
 *                    (e.g. 'hr.anomaly.flagged', 'hr.change_request.pending')
 *                    Empty/absent → subscribe to ALL hr.* events.
 *   is_active        toggle for pausing without deleting
 *   created_by       ops user who created it
 *   last_fired_at    most recent dispatch attempt
 *   last_status      'success' | 'failed' | null
 *   last_error       short error string from the last failed attempt
 *   fire_count       lifetime count of dispatch attempts
 *   failure_count    lifetime count of failed attempts
 *   deleted_at       soft-delete (consistent with other HR models)
 */

const mongoose = require('mongoose');

const hrWebhookSubscriptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    target_url: { type: String, required: true, maxlength: 2000 },
    hmac_secret: { type: String, required: true, maxlength: 200 },
    event_types: { type: [String], default: [] },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_fired_at: { type: Date, default: null },
    last_status: { type: String, enum: ['success', 'failed', null], default: null },
    last_error: { type: String, default: null, maxlength: 500 },
    fire_count: { type: Number, default: 0 },
    failure_count: { type: Number, default: 0 },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

hrWebhookSubscriptionSchema.index({ is_active: 1, deleted_at: 1 });
hrWebhookSubscriptionSchema.index({ event_types: 1 });

module.exports =
  mongoose.models.HrWebhookSubscription ||
  mongoose.model('HrWebhookSubscription', hrWebhookSubscriptionSchema);
