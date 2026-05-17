'use strict';

/**
 * UserPreferences — Wave 27.
 *
 * One singleton document per user storing:
 *   • dashboardPresets — per-dashboard density / collapsed sections / date defaults
 *   • pinnedWidgets[]  — max 6 enforced at the service layer (Wave 25)
 *   • savedViews[]     — filter sets with optional team-share flag
 *
 * Indexes:
 *   • userId (unique) — singleton enforcement
 *   • savedViews.shareWithRole — to expose "team views" by role group
 */

const mongoose = require('mongoose');

const PinnedWidgetSchema = new mongoose.Schema(
  {
    dashboardKey: { type: String, required: true, maxlength: 100 },
    elementId: { type: String, required: true, maxlength: 200 },
    pinnedAt: { type: Date, default: Date.now, required: true },
    order: { type: Number, default: 0, min: 0, max: 5 }, // 0..5 (max 6 widgets)
  },
  { _id: false }
);

const SavedViewSchema = new mongoose.Schema(
  {
    viewId: { type: String, required: true, maxlength: 100 },
    dashboardKey: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, default: null, maxlength: 200 },
    nameEn: { type: String, default: null, maxlength: 200 },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, required: true },
    shareWithRole: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dashboardPresets: { type: mongoose.Schema.Types.Mixed, default: {} },
    pinnedWidgets: { type: [PinnedWidgetSchema], default: [] },
    savedViews: { type: [SavedViewSchema], default: [] },
    updatedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false, collection: 'productivity_user_preferences' }
);

// Surface "team views" for a role: anyone in the role group can read
// savedViews where shareWithRole=true authored by another member.
UserPreferencesSchema.index({ 'savedViews.shareWithRole': 1 });

UserPreferencesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  // Enforce pin limit at the DB layer as a backstop (service layer
  // already rejects with PIN_LIMIT_EXCEEDED, but if a bad caller
  // sneaks past, this catches it).
  if (Array.isArray(this.pinnedWidgets) && this.pinnedWidgets.length > 6) {
    return next(new Error('UserPreferences: pinnedWidgets exceeds max of 6'));
  }
  next();
});

module.exports =
  mongoose.models.ProductivityUserPreferences ||
  mongoose.model('ProductivityUserPreferences', UserPreferencesSchema);

module.exports.UserPreferencesSchema = UserPreferencesSchema;
