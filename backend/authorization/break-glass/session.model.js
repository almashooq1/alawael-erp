/**
 * BreakGlassSession — persistent emergency-access record.
 *
 * Retention aligned to ADR-009 break-glass tier (10 years).
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../../config/constants');
const { ALLOWED_SCOPES } = require('./engine');

const ActionSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    op: { type: String },
    resource: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const BreakGlassSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scope: { type: String, enum: [...ALLOWED_SCOPES], required: true },
    purpose: { type: String, required: true, minlength: 10 },
    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    resourceHint: { type: String },

    activatedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true, index: true },
    coSignRequiredBy: { type: Date, required: true, index: true },

    coSignedAt: { type: Date, default: null },
    coSignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    coSignNote: { type: String },

    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closeReason: { type: String },

    flaggedForReview: { type: Boolean, default: false, index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    actions: { type: [ActionSchema], default: [] },
  },
  { timestamps: true, collection: 'break_glass_sessions' }
);

BreakGlassSessionSchema.index({ userId: 1, activatedAt: -1 });
BreakGlassSessionSchema.index({ coSignedAt: 1, expiresAt: 1 });

BreakGlassSessionSchema.methods.isLive = function (now = new Date()) {
  return !this.closedAt && this.expiresAt > now;
};

module.exports = {
  BreakGlassSessionSchema,
  get model() {
    return (
      mongoose.models.BreakGlassSession ||
      mongoose.model('BreakGlassSession', BreakGlassSessionSchema)
    );
  },
};
