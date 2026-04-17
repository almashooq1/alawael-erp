/**
 * NewsletterSubscription — emails captured from the landing newsletter form.
 *
 * Minimal schema on purpose: the form only asks for email + optional name.
 * Unsubscribe is a per-row status change (no token-based magic-link flow yet).
 */

'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'بريد إلكتروني غير صالح'],
    },
    name: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ['active', 'unsubscribed', 'bounced'],
      default: 'active',
      index: true,
    },
    source: { type: String, enum: ['landing', 'booking', 'import', 'manual'], default: 'landing' },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    locale: { type: String, enum: ['ar', 'en'], default: 'ar' },
    unsubscribedAt: { type: Date },
    ipHash: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.NewsletterSubscription || mongoose.model('NewsletterSubscription', schema);
