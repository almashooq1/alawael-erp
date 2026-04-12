'use strict';
/**
 * DddErrorTracker Model
 * Auto-extracted from services/dddErrorTracker.js
 */
const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema(
  {
    /* Error identity */
    fingerprint: { type: String, required: true, index: true },
    message: { type: String, required: true },
    stack: String,
    code: String,

    /* Classification */
    category: {
      type: String,
      enum: [
        'validation',
        'authentication',
        'authorization',
        'database',
        'network',
        'business-logic',
        'integration',
        'configuration',
        'runtime',
        'timeout',
        'rate-limit',
        'unknown',
      ],
      default: 'unknown',
    },
    severity: {
      type: String,
      enum: ['debug', 'info', 'warning', 'error', 'critical', 'fatal'],
      default: 'error',
    },

    /* Context */
    domain: String,
    route: String,
    method: String,
    statusCode: Number,
    userId: { type: mongoose.Schema.Types.ObjectId },
    branchId: { type: mongoose.Schema.Types.ObjectId },
    requestId: String,
    userAgent: String,
    ip: String,

    /* Dedup tracking */
    occurrences: { type: Number, default: 1 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },

    /* Resolution */
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'investigating', 'resolved', 'ignored'],
      default: 'new',
    },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId },
    acknowledgedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId },
    resolvedAt: Date,
    resolution: String,

    /* Extra */
    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

errorLogSchema.index({ fingerprint: 1 }, { unique: true });
errorLogSchema.index({ category: 1, severity: 1, lastSeen: -1 });
errorLogSchema.index({ domain: 1, lastSeen: -1 });
errorLogSchema.index({ status: 1, lastSeen: -1 });
errorLogSchema.index({ lastSeen: -1 });

const DDDErrorLog = mongoose.models.DDDErrorLog || mongoose.model('DDDErrorLog', errorLogSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Error Categories & Classification Rules
   ═══════════════════════════════════════════════════════════════════════ */
const ERROR_CATEGORIES = [
  'validation',
  'authentication',
  'authorization',
  'database',
  'network',
  'business-logic',
  'integration',
  'configuration',
  'runtime',
  'timeout',
  'rate-limit',
  'unknown',
];

const CATEGORY_RULES = [
  {
    test: err => err.name === 'ValidationError' || err.name === 'CastError',
    category: 'validation',
  },
  {
    test: err => err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError',
    category: 'authentication',
  },
  {
    test: err => err.statusCode === 401 || err.message?.includes('unauthorized'),
    category: 'authentication',
  },
  {
    test: err => err.statusCode === 403 || err.message?.includes('forbidden'),
    category: 'authorization',
  },
  {
    test: err => err.name === 'MongoError' || err.name === 'MongoServerError',
    category: 'database',
  },
  { test: err => err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND', category: 'network' },
  {
    test: err => err.code === 'ETIMEDOUT' || err.message?.includes('timeout'),
    category: 'timeout',
  },
  { test: err => err.statusCode === 429, category: 'rate-limit' },
  {
    test: err => err.message?.includes('config') || err.message?.includes('environment'),
    category: 'configuration',
  },
  { test: err => err.isAxiosError || err.message?.includes('ECONNRESET'), category: 'integration' },
];

module.exports = {
  DDDErrorLog,
};
