'use strict';

/**
 * NotificationDigestItem.model.js — Phase 16 Commit 8 (4.0.73).
 *
 * One row per deferred notification waiting to be flushed in the
 * next digest window for a given user. The dispatch service
 * appends here when a low/normal-priority event arrives and the
 * user has digest enabled; the digest sweeper drains + bundles +
 * emails.
 *
 * Why a dedicated collection instead of a Redis queue: digests
 * must survive restarts, tolerate multi-instance dispatchers
 * without duplicates, and be auditable in the same
 * admin surface as the rest of the notification log. Mongo fits.
 *
 * States:
 *   pending  — queued, not yet sent
 *   sent     — successfully emailed out in a digest
 *   expired  — older than retention (not sent; user opted out)
 */

const mongoose = require('mongoose');

const DIGEST_ITEM_STATUSES = Object.freeze(['pending', 'sent', 'expired']);

const notificationDigestItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    policyId: { type: String, required: true },
    eventName: { type: String, required: true },
    priority: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    body: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: DIGEST_ITEM_STATUSES,
      default: 'pending',
      index: true,
    },
    queuedAt: { type: Date, default: Date.now, index: true },
    sentAt: { type: Date, default: null },
    sentDigestId: { type: String, default: null }, // groups items sent together
  },
  { timestamps: false, collection: 'notification_digest_items' }
);

notificationDigestItemSchema.index({ userId: 1, status: 1, queuedAt: 1 });

const NotificationDigestItem =
  mongoose.models.NotificationDigestItem ||
  mongoose.model('NotificationDigestItem', notificationDigestItemSchema);

module.exports = NotificationDigestItem;
module.exports.DIGEST_ITEM_STATUSES = DIGEST_ITEM_STATUSES;
