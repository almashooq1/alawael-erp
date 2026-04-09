'use strict';

/**
 * DDD Error Tracker
 * ═══════════════════════════════════════════════════════════════════════
 * Centralized error tracking, classification, deduplication, alerting,
 * and analytics for the entire DDD platform.
 *
 * Features:
 *  - Error fingerprinting & deduplication
 *  - Category & severity classification
 *  - Domain-aware error tracking
 *  - Express error-handling middleware
 *  - Error trend analytics
 *  - Acknowledgement / resolution workflow
 *  - Alert threshold monitoring
 *  - Error dashboard
 *
 * @module dddErrorTracker
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Error Log Model
   ═══════════════════════════════════════════════════════════════════════ */
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

function classifyError(err) {
  for (const rule of CATEGORY_RULES) {
    try {
      if (rule.test(err)) return rule.category;
    } catch {
      /* rule error */
    }
  }
  return 'unknown';
}

function classifySeverity(err, statusCode) {
  if (statusCode >= 500 || err.name === 'MongoError') return 'critical';
  if (err.code === 'ECONNREFUSED') return 'critical';
  if (statusCode === 429) return 'warning';
  if (statusCode >= 400 && statusCode < 500) return 'warning';
  if (err.name === 'ValidationError') return 'info';
  return 'error';
}

/* ═══════════════════════════════════════════════════════════════════════
   3. Error Fingerprinting
   ═══════════════════════════════════════════════════════════════════════ */
function generateFingerprint(err, context = {}) {
  const parts = [
    err.name || 'Error',
    err.message?.slice(0, 200) || '',
    context.route || '',
    context.method || '',
    /* Use first meaningful stack frame for uniqueness */
    (err.stack || '')
      .split('\n')
      .slice(1, 3)
      .join('')
      .replace(/:\d+:\d+/g, ''),
  ];
  return crypto.createHash('md5').update(parts.join('|')).digest('hex');
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Core Error Tracking
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Track an error — deduplicate by fingerprint, increment count on repeat.
 *
 * @param {Error} err - The error object
 * @param {Object} context - { route, method, statusCode, userId, branchId, domain, requestId, userAgent, ip }
 * @returns {Object} The error log entry
 */
async function trackError(err, context = {}) {
  const fingerprint = generateFingerprint(err, context);
  const category = context.category || classifyError(err);
  const severity = context.severity || classifySeverity(err, context.statusCode);

  /* Domain detection from route */
  let domain = context.domain;
  if (!domain && context.route) {
    const match = context.route.match(/\/api\/ddd-platform\/([a-z-]+)/);
    if (match) domain = match[1];
  }

  try {
    const existing = await DDDErrorLog.findOne({ fingerprint });

    if (existing) {
      existing.occurrences += 1;
      existing.lastSeen = new Date();
      if (severity === 'critical' || severity === 'fatal') existing.severity = severity;
      if (context.userId) existing.userId = context.userId;
      await existing.save();
      return existing.toObject();
    }

    const entry = await DDDErrorLog.create({
      fingerprint,
      message: err.message || 'Unknown error',
      stack: err.stack?.slice(0, 5000),
      code: err.code || err.statusCode?.toString(),
      category,
      severity,
      domain,
      route: context.route,
      method: context.method,
      statusCode: context.statusCode,
      userId: context.userId,
      branchId: context.branchId,
      requestId: context.requestId,
      userAgent: context.userAgent,
      ip: context.ip,
      metadata: context.metadata,
      tags: context.tags || [],
    });

    return entry.toObject();
  } catch {
    /* If tracking itself fails, don't crash the app */
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Express Error Middleware
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Express error-handling middleware.
 * Place AFTER all routes: app.use(errorMiddleware())
 */
function errorMiddleware(options = {}) {
  const { includeStack = false, trackAll = true } = options;

  return async (err, req, res, _next) => {
    const statusCode = err.statusCode || err.status || 500;

    if (trackAll || statusCode >= 500) {
      await trackError(err, {
        route: req.originalUrl || req.path,
        method: req.method,
        statusCode,
        userId: req.user?._id,
        branchId: req.tenantScope?.branchId || req.headers?.['x-branch-id'],
        requestId: req.headers?.['x-request-id'],
        userAgent: req.headers?.['user-agent'],
        ip: req.ip,
      });
    }

    res.status(statusCode).json({
      success: false,
      error: err.message || 'Internal server error',
      code: err.code,
      ...(includeStack && process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    });
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Error Resolution
   ═══════════════════════════════════════════════════════════════════════ */
async function acknowledgeError(errorId, userId) {
  return DDDErrorLog.findByIdAndUpdate(
    errorId,
    { $set: { status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() } },
    { new: true }
  ).lean();
}

async function resolveError(errorId, userId, resolution) {
  return DDDErrorLog.findByIdAndUpdate(
    errorId,
    { $set: { status: 'resolved', resolvedBy: userId, resolvedAt: new Date(), resolution } },
    { new: true }
  ).lean();
}

async function ignoreError(errorId) {
  return DDDErrorLog.findByIdAndUpdate(
    errorId,
    { $set: { status: 'ignored' } },
    { new: true }
  ).lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Error Dashboard & Analytics
   ═══════════════════════════════════════════════════════════════════════ */
async function getErrorDashboard() {
  const now = new Date();
  const oneHourAgo = new Date(now - 3600000);
  const oneDayAgo = new Date(now - 86400000);

  const [
    totalErrors,
    unresolvedErrors,
    byCategory,
    bySeverity,
    byDomain,
    lastHourCount,
    last24hCount,
    topErrors,
    recentErrors,
  ] = await Promise.all([
    DDDErrorLog.countDocuments({ isDeleted: { $ne: true } }),
    DDDErrorLog.countDocuments({
      isDeleted: { $ne: true },
      status: { $in: ['new', 'acknowledged', 'investigating'] },
    }),
    DDDErrorLog.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalOccurrences: { $sum: '$occurrences' },
        },
      },
    ]),
    DDDErrorLog.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    DDDErrorLog.aggregate([
      { $match: { isDeleted: { $ne: true }, domain: { $ne: null } } },
      {
        $group: { _id: '$domain', count: { $sum: 1 }, totalOccurrences: { $sum: '$occurrences' } },
      },
      { $sort: { totalOccurrences: -1 } },
    ]),
    DDDErrorLog.countDocuments({ isDeleted: { $ne: true }, lastSeen: { $gte: oneHourAgo } }),
    DDDErrorLog.countDocuments({ isDeleted: { $ne: true }, lastSeen: { $gte: oneDayAgo } }),
    DDDErrorLog.find({ isDeleted: { $ne: true } })
      .sort({ occurrences: -1 })
      .limit(10)
      .select('fingerprint message category severity occurrences lastSeen domain route')
      .lean(),
    DDDErrorLog.find({ isDeleted: { $ne: true } })
      .sort({ lastSeen: -1 })
      .limit(10)
      .select('fingerprint message category severity occurrences lastSeen domain route status')
      .lean(),
  ]);

  return {
    totalErrors,
    unresolvedErrors,
    lastHourCount,
    last24hCount,
    byCategory: byCategory.reduce(
      (m, r) => ({ ...m, [r._id]: { unique: r.count, total: r.totalOccurrences } }),
      {}
    ),
    bySeverity: bySeverity.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    byDomain: byDomain.reduce(
      (m, r) => ({ ...m, [r._id]: { unique: r.count, total: r.totalOccurrences } }),
      {}
    ),
    topErrors,
    recentErrors,
    categories: ERROR_CATEGORIES,
  };
}

async function getErrorTrend(hours = 24) {
  const since = new Date(Date.now() - hours * 3600000);
  return DDDErrorLog.aggregate([
    { $match: { isDeleted: { $ne: true }, lastSeen: { $gte: since } } },
    {
      $group: {
        _id: {
          hour: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$lastSeen' } },
          severity: '$severity',
        },
        count: { $sum: 1 },
        totalOccurrences: { $sum: '$occurrences' },
      },
    },
    { $sort: { '_id.hour': 1 } },
  ]);
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createErrorTrackerRouter() {
  const router = Router();

  /* Dashboard */
  router.get('/errors/dashboard', async (_req, res) => {
    try {
      const dashboard = await getErrorDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* List errors */
  router.get('/errors', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.category) query.category = req.query.category;
      if (req.query.severity) query.severity = req.query.severity;
      if (req.query.status) query.status = req.query.status;
      if (req.query.domain) query.domain = req.query.domain;

      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const errors = await DDDErrorLog.find(query).sort({ lastSeen: -1 }).limit(limit).lean();
      res.json({ success: true, count: errors.length, errors });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Get single error */
  router.get('/errors/:id', async (req, res) => {
    try {
      const error = await DDDErrorLog.findById(req.params.id).lean();
      if (!error) return res.status(404).json({ success: false, error: 'Error not found' });
      res.json({ success: true, error });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Acknowledge */
  router.post('/errors/:id/acknowledge', async (req, res) => {
    try {
      const result = await acknowledgeError(req.params.id, req.user?._id);
      res.json({ success: true, error: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Resolve */
  router.post('/errors/:id/resolve', async (req, res) => {
    try {
      const result = await resolveError(req.params.id, req.user?._id, req.body.resolution);
      res.json({ success: true, error: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Ignore */
  router.post('/errors/:id/ignore', async (req, res) => {
    try {
      const result = await ignoreError(req.params.id);
      res.json({ success: true, error: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Trend */
  router.get('/errors/analytics/trend', async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const trend = await getErrorTrend(hours);
      res.json({ success: true, count: trend.length, trend });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Track error manually */
  router.post('/errors/track', async (req, res) => {
    try {
      const err = new Error(req.body.message);
      err.name = req.body.name || 'Error';
      err.code = req.body.code;
      const result = await trackError(err, req.body);
      res.json({ success: true, error: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Categories */
  router.get('/errors/meta/categories', (_req, res) => {
    res.json({ success: true, categories: ERROR_CATEGORIES });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDErrorLog,
  ERROR_CATEGORIES,
  CATEGORY_RULES,
  classifyError,
  classifySeverity,
  generateFingerprint,
  trackError,
  errorMiddleware,
  acknowledgeError,
  resolveError,
  ignoreError,
  getErrorDashboard,
  getErrorTrend,
  createErrorTrackerRouter,
};
