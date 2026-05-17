'use strict';

/**
 * Watchlist — Wave 27.
 *
 * Personal entity-watchlist per user. Surfaces in the morning briefing
 * and as a dedicated `/me/watchlists` page. See Wave 25 design §3.4.
 *
 * Indexes:
 *   • (ownerUserId, updatedAt DESC) — primary read path
 *   • entityIds — reverse lookup ("which user watches this beneficiary?")
 */

const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerRole: { type: String, default: null, maxlength: 100 },
    nameAr: { type: String, default: null, maxlength: 200 },
    nameEn: { type: String, default: null, maxlength: 200 },
    entityType: {
      type: String,
      enum: ['Beneficiary', 'Employee', 'Invoice', 'Complaint', 'Incident'],
      required: true,
    },
    entityIds: {
      type: [String],
      default: [],
      // Dedupe on the way in — the setter runs whenever entityIds is
      // assigned, so a `new Watchlist({ entityIds: ['a','b','a'] })`
      // construction produces `['a','b']` immediately.
      set: arr => (Array.isArray(arr) ? [...new Set(arr.map(String))] : arr),
    },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false, collection: 'productivity_watchlists' }
);

// Primary read path: list a user's watchlists by recency
WatchlistSchema.index({ ownerUserId: 1, updatedAt: -1 });
// Reverse lookup (rare, but handy for "who watches X")
WatchlistSchema.index({ entityIds: 1 });

// Dedupe is now handled by the path setter on `entityIds`. We only
// need to enforce the "name required" invariant.
WatchlistSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});
WatchlistSchema.path('__invariants').validate(function () {
  if (!this.nameAr && !this.nameEn) {
    this.invalidate('nameAr', 'Watchlist requires nameAr or nameEn');
    return false;
  }
  return true;
});

module.exports =
  mongoose.models.ProductivityWatchlist || mongoose.model('ProductivityWatchlist', WatchlistSchema);

module.exports.WatchlistSchema = WatchlistSchema;
