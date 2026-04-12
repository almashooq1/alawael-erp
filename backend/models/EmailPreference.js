'use strict';

/**
 * EmailPreference Model — تفضيلات البريد الإلكتروني للمستخدمين
 *
 * Stores per-user email notification preferences:
 * - Category-level opt-in/out (auth, hr, finance, system, marketing)
 * - Delivery frequency (instant, daily digest, weekly digest, off)
 * - Quiet hours (no emails between start–end hours)
 * - Unsubscribe tokens for GDPR-compliant one-click unsubscribe
 * - Bounce/complaint tracking to auto-suppress dead addresses
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const emailPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // ─── Global toggle ───────────────────────────────────────────────
    globalEnabled: {
      type: Boolean,
      default: true,
    },

    // ─── Category preferences ────────────────────────────────────────
    categories: {
      // Auth notifications: welcome, login alerts, password changes, 2FA
      auth: {
        enabled: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest', 'off'],
          default: 'instant',
        },
      },

      // HR notifications: leaves, attendance, salary, performance
      hr: {
        enabled: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest', 'off'],
          default: 'instant',
        },
      },

      // Finance notifications: invoices, payments, expenses, approvals
      finance: {
        enabled: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest', 'off'],
          default: 'instant',
        },
      },

      // System notifications: errors, maintenance, updates
      system: {
        enabled: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest', 'off'],
          default: 'instant',
        },
      },

      // Marketing: promotions, newsletters
      marketing: {
        enabled: { type: Boolean, default: false },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest', 'off'],
          default: 'weekly_digest',
        },
      },

      // Appointments & schedules
      appointments: {
        enabled: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest', 'off'],
          default: 'instant',
        },
      },
    },

    // ─── Quiet hours ─────────────────────────────────────────────────
    quietHours: {
      enabled: { type: Boolean, default: false },
      startHour: { type: Number, min: 0, max: 23, default: 22 },
      endHour: { type: Number, min: 0, max: 23, default: 7 },
      timezone: { type: String, default: 'Asia/Riyadh' },
    },

    // ─── Unsubscribe token ───────────────────────────────────────────
    unsubscribeToken: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ─── Delivery health ─────────────────────────────────────────────
    deliveryHealth: {
      bounceCount: { type: Number, default: 0 },
      lastBounceAt: { type: Date },
      lastBounceType: { type: String, enum: ['soft', 'hard', ''], default: '' },
      complaintCount: { type: Number, default: 0 },
      lastComplaintAt: { type: Date },
      suppressed: { type: Boolean, default: false },
      suppressedAt: { type: Date },
      suppressReason: { type: String, default: '' },
    },

    // ─── Stats ───────────────────────────────────────────────────────
    stats: {
      totalReceived: { type: Number, default: 0 },
      totalOpened: { type: Number, default: 0 },
      lastEmailAt: { type: Date },
      lastOpenedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    collection: 'email_preferences',
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────
emailPreferenceSchema.index({ email: 1 });
emailPreferenceSchema.index({ unsubscribeToken: 1 });
emailPreferenceSchema.index({ 'deliveryHealth.suppressed': 1 });

// ─── Pre-save: Generate unsubscribe token ──────────────────────────────
emailPreferenceSchema.pre('save', function (next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// ─── Static: Find or create preferences for a user ─────────────────────
emailPreferenceSchema.statics.findOrCreateForUser = async function (userId, email) {
  let prefs = await this.findOne({ userId });
  if (!prefs) {
    prefs = await this.create({ userId, email });
  }
  return prefs;
};

// ─── Static: Check if email should be sent ─────────────────────────────
emailPreferenceSchema.statics.shouldSendEmail = async function (userId, category) {
  const prefs = await this.findOne({ userId }).lean();

  // No preferences → default is to send
  if (!prefs) return { send: true, reason: 'no_preferences' };

  // Globally disabled
  if (!prefs.globalEnabled) return { send: false, reason: 'globally_disabled' };

  // Suppressed due to bounces/complaints
  if (prefs.deliveryHealth?.suppressed) {
    return { send: false, reason: 'suppressed', detail: prefs.deliveryHealth.suppressReason };
  }

  // Category disabled
  const catPrefs = prefs.categories?.[category];
  if (catPrefs && !catPrefs.enabled) {
    return { send: false, reason: 'category_disabled', category };
  }

  // Category set to off
  if (catPrefs?.frequency === 'off') {
    return { send: false, reason: 'frequency_off', category };
  }

  // Quiet hours
  if (prefs.quietHours?.enabled) {
    const now = new Date();
    const hour = now.getHours(); // simplified — real impl needs timezone
    const { startHour, endHour } = prefs.quietHours;
    const inQuiet =
      startHour < endHour
        ? hour >= startHour && hour < endHour
        : hour >= startHour || hour < endHour;
    if (inQuiet && catPrefs?.frequency !== 'instant') {
      return { send: false, reason: 'quiet_hours', resumesAt: endHour };
    }
  }

  // Digest mode — queue for digest instead of immediate send
  if (catPrefs?.frequency === 'daily_digest' || catPrefs?.frequency === 'weekly_digest') {
    return { send: false, reason: 'digest_queued', frequency: catPrefs.frequency };
  }

  return { send: true, reason: 'allowed' };
};

// ─── Static: Record bounce ─────────────────────────────────────────────
emailPreferenceSchema.statics.recordBounce = async function (email, bounceType) {
  const prefs = await this.findOne({ email });
  if (!prefs) return;

  prefs.deliveryHealth.bounceCount += 1;
  prefs.deliveryHealth.lastBounceAt = new Date();
  prefs.deliveryHealth.lastBounceType = bounceType;

  // Auto-suppress after 3 hard bounces or 10 soft bounces
  if (
    (bounceType === 'hard' && prefs.deliveryHealth.bounceCount >= 3) ||
    (bounceType === 'soft' && prefs.deliveryHealth.bounceCount >= 10)
  ) {
    prefs.deliveryHealth.suppressed = true;
    prefs.deliveryHealth.suppressedAt = new Date();
    prefs.deliveryHealth.suppressReason = `Auto-suppressed: ${prefs.deliveryHealth.bounceCount} ${bounceType} bounces`;
  }

  await prefs.save();
};

// ─── Static: Record complaint ──────────────────────────────────────────
emailPreferenceSchema.statics.recordComplaint = async function (email) {
  const prefs = await this.findOne({ email });
  if (!prefs) return;

  prefs.deliveryHealth.complaintCount += 1;
  prefs.deliveryHealth.lastComplaintAt = new Date();

  // Immediate suppress on any complaint (CAN-SPAM / GDPR compliance)
  prefs.deliveryHealth.suppressed = true;
  prefs.deliveryHealth.suppressedAt = new Date();
  prefs.deliveryHealth.suppressReason = 'User reported email as spam';

  await prefs.save();
};

// ─── Static: Unsubscribe by token ──────────────────────────────────────
emailPreferenceSchema.statics.unsubscribeByToken = async function (token, category) {
  const prefs = await this.findOne({ unsubscribeToken: token });
  if (!prefs) return null;

  if (category && prefs.categories[category]) {
    // Category-specific unsubscribe
    prefs.categories[category].enabled = false;
    prefs.categories[category].frequency = 'off';
  } else {
    // Global unsubscribe
    prefs.globalEnabled = false;
  }

  await prefs.save();
  return prefs;
};

// ─── Instance: Update stats after send ─────────────────────────────────
emailPreferenceSchema.methods.recordEmailSent = async function () {
  this.stats.totalReceived += 1;
  this.stats.lastEmailAt = new Date();
  await this.save();
};

// ─── Instance: Record email open ───────────────────────────────────────
emailPreferenceSchema.methods.recordEmailOpened = async function () {
  this.stats.totalOpened += 1;
  this.stats.lastOpenedAt = new Date();
  await this.save();
};

module.exports = mongoose.models.EmailPreference || mongoose.model('EmailPreference', emailPreferenceSchema);
