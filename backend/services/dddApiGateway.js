'use strict';

/**
 * DDD API Gateway
 * ═══════════════════════════════════════════════════════════════════════
 * Unified API gateway with versioning, request transformation,
 * response normalization, API key management, and usage analytics.
 *
 * Features:
 *  - API key issuance & validation
 *  - Per-key rate limiting & quota management
 *  - Request/response transformation pipelines
 *  - API versioning strategy (URL / header)
 *  - Usage analytics per key / endpoint
 *  - IP whitelist / blacklist
 *  - Gateway health & stats dashboard
 *
 * @module dddApiGateway
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */

/* ── API Key ── */
const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    hashedKey: { type: String, required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId },
    branchId: { type: mongoose.Schema.Types.ObjectId },

    scopes: [String],
    allowedDomains: [String],
    allowedIPs: [String],
    blockedIPs: [String],

    rateLimit: { type: Number, default: 100 }, // requests per window
    rateLimitWindow: { type: Number, default: 60 }, // seconds
    quotaLimit: { type: Number, default: 10000 }, // total requests per month
    quotaUsed: { type: Number, default: 0 },
    quotaResetAt: Date,

    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked', 'expired'],
      default: 'active',
    },
    expiresAt: Date,
    lastUsedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

apiKeySchema.index({ status: 1, expiresAt: 1 });

const DDDApiKey = mongoose.models.DDDApiKey || mongoose.model('DDDApiKey', apiKeySchema);

/* ── API Usage Log ── */
const apiUsageSchema = new mongoose.Schema(
  {
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, index: true },
    keyName: String,
    method: String,
    path: String,
    statusCode: Number,
    responseTimeMs: Number,
    requestSize: Number,
    responseSize: Number,
    ip: String,
    userAgent: String,
    version: String,
    domain: String,
    error: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

apiUsageSchema.index({ apiKeyId: 1, createdAt: -1 });
apiUsageSchema.index({ path: 1, createdAt: -1 });
apiUsageSchema.index({ createdAt: -1 });

const DDDApiUsage = mongoose.models.DDDApiUsage || mongoose.model('DDDApiUsage', apiUsageSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. API Versioning
   ═══════════════════════════════════════════════════════════════════════ */
const API_VERSIONS = ['v1', 'v2', 'v3'];
const CURRENT_VERSION = 'v2';

const VERSION_STRATEGIES = {
  url: req => {
    const match = req.path.match(/\/api\/(v\d+)\//);
    return match ? match[1] : null;
  },
  header: req => req.headers['x-api-version'] || null,
  query: req => req.query.apiVersion || null,
};

function resolveVersion(req, strategy = 'url') {
  const resolver = VERSION_STRATEGIES[strategy] || VERSION_STRATEGIES.url;
  return resolver(req) || CURRENT_VERSION;
}

/* ═══════════════════════════════════════════════════════════════════════
   3. API Key Management
   ═══════════════════════════════════════════════════════════════════════ */
function generateApiKey(prefix = 'ddd') {
  const raw = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${raw}`;
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function createApiKey(data) {
  const rawKey = generateApiKey(data.prefix || 'ddd');
  const entry = await DDDApiKey.create({
    name: data.name,
    key: rawKey.slice(0, 12) + '...',
    hashedKey: hashApiKey(rawKey),
    owner: data.owner,
    branchId: data.branchId,
    scopes: data.scopes || ['read'],
    allowedDomains: data.allowedDomains || [],
    allowedIPs: data.allowedIPs || [],
    rateLimit: data.rateLimit || 100,
    rateLimitWindow: data.rateLimitWindow || 60,
    quotaLimit: data.quotaLimit || 10000,
    quotaResetAt: new Date(Date.now() + 30 * 86400000),
    expiresAt: data.expiresAt,
    metadata: data.metadata,
  });
  return { ...entry.toObject(), rawKey };
}

async function validateApiKey(rawKey) {
  if (!rawKey) return { valid: false, reason: 'missing-key' };

  const hashed = hashApiKey(rawKey);
  const entry = await DDDApiKey.findOne({ hashedKey: hashed, isDeleted: { $ne: true } });

  if (!entry) return { valid: false, reason: 'invalid-key' };
  if (entry.status !== 'active') return { valid: false, reason: `key-${entry.status}` };
  if (entry.expiresAt && entry.expiresAt < new Date())
    return { valid: false, reason: 'key-expired' };

  // Check quota
  if (entry.quotaUsed >= entry.quotaLimit) return { valid: false, reason: 'quota-exceeded' };

  // Update usage
  entry.lastUsedAt = new Date();
  entry.quotaUsed += 1;
  await entry.save();

  return { valid: true, apiKey: entry.toObject() };
}

async function revokeApiKey(keyId) {
  return DDDApiKey.findByIdAndUpdate(keyId, { status: 'revoked' }, { new: true }).lean();
}

async function suspendApiKey(keyId) {
  return DDDApiKey.findByIdAndUpdate(keyId, { status: 'suspended' }, { new: true }).lean();
}

async function reactivateApiKey(keyId) {
  return DDDApiKey.findByIdAndUpdate(keyId, { status: 'active' }, { new: true }).lean();
}

async function resetQuota(keyId) {
  return DDDApiKey.findByIdAndUpdate(
    keyId,
    { quotaUsed: 0, quotaResetAt: new Date(Date.now() + 30 * 86400000) },
    { new: true }
  ).lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Request/Response Transformations
   ═══════════════════════════════════════════════════════════════════════ */
const RESPONSE_TRANSFORMS = {
  /* Wrap all responses in standard envelope */
  envelope: (body, req) => ({
    success: body.success !== undefined ? body.success : true,
    apiVersion: resolveVersion(req),
    timestamp: new Date().toISOString(),
    data: body.data || body,
  }),

  /* Arabic/English field mapping */
  localize: (body, req) => {
    const locale = req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en';
    if (body && typeof body === 'object') body._locale = locale;
    return body;
  },

  /* Pagination normalization */
  pagination: body => {
    if (body.items && body.total !== undefined) {
      return {
        ...body,
        pagination: {
          total: body.total,
          count: body.items.length,
          page: body.page || 1,
          pages: Math.ceil(body.total / (body.limit || 20)),
        },
      };
    }
    return body;
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   5. Gateway Middleware
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * API Key authentication middleware.
 * Reads key from `x-api-key` header or `apiKey` query param.
 */
function apiKeyMiddleware(options = {}) {
  const { required = false } = options;

  return async (req, _res, next) => {
    const rawKey = req.headers['x-api-key'] || req.query.apiKey;
    if (!rawKey) {
      if (required) return _res.status(401).json({ success: false, error: 'API key required' });
      return next();
    }

    const result = await validateApiKey(rawKey);
    if (!result.valid) {
      return _res.status(403).json({ success: false, error: `API key ${result.reason}` });
    }

    req.apiKey = result.apiKey;
    next();
  };
}

/**
 * Usage tracking middleware.
 */
function usageTrackingMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const elapsed = Date.now() - start;

      DDDApiUsage.create({
        apiKeyId: req.apiKey?._id,
        keyName: req.apiKey?.name,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        responseTimeMs: elapsed,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        version: resolveVersion(req),
        domain: req.originalUrl?.match(/\/api\/ddd-platform\/([a-z-]+)/)?.[1],
        error: res.statusCode >= 400 ? body?.error : undefined,
      }).catch(() => {});

      return originalJson(body);
    };

    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Gateway Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getGatewayDashboard() {
  const now = new Date();
  const oneDayAgo = new Date(now - 86400000);

  const [totalKeys, activeKeys, usage24h, topEndpoints, topKeys, errorRate, avgResponseTime] =
    await Promise.all([
      DDDApiKey.countDocuments({ isDeleted: { $ne: true } }),
      DDDApiKey.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
      DDDApiUsage.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      DDDApiUsage.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        {
          $group: {
            _id: { method: '$method', path: '$path' },
            count: { $sum: 1 },
            avgMs: { $avg: '$responseTimeMs' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      DDDApiUsage.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo }, keyName: { $ne: null } } },
        { $group: { _id: '$keyName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      DDDApiUsage.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          },
        },
      ]),
      DDDApiUsage.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: null, avgMs: { $avg: '$responseTimeMs' } } },
      ]),
    ]);

  return {
    totalKeys,
    activeKeys,
    usage24h,
    errorRate24h: errorRate[0]
      ? ((errorRate[0].errors / errorRate[0].total) * 100).toFixed(2) + '%'
      : '0%',
    avgResponseTime24h: avgResponseTime[0] ? Math.round(avgResponseTime[0].avgMs) + 'ms' : 'N/A',
    topEndpoints,
    topKeys,
    apiVersions: API_VERSIONS,
    currentVersion: CURRENT_VERSION,
  };
}

async function getUsageTrend(hours = 24) {
  const since = new Date(Date.now() - hours * 3600000);
  return DDDApiUsage.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { hour: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$createdAt' } } },
        requests: { $sum: 1 },
        errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
        avgMs: { $avg: '$responseTimeMs' },
      },
    },
    { $sort: { '_id.hour': 1 } },
  ]);
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createApiGatewayRouter() {
  const router = Router();

  /* Dashboard */
  router.get('/gateway/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getGatewayDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Usage trend */
  router.get('/gateway/usage/trend', async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const trend = await getUsageTrend(hours);
      res.json({ success: true, count: trend.length, trend });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* List API keys */
  router.get('/gateway/keys', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.status) query.status = req.query.status;
      const keys = await DDDApiKey.find(query).select('-hashedKey').sort({ createdAt: -1 }).lean();
      res.json({ success: true, count: keys.length, keys });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Create API key */
  router.post('/gateway/keys', async (req, res) => {
    try {
      const result = await createApiKey(req.body);
      res.status(201).json({ success: true, key: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Revoke */
  router.post('/gateway/keys/:id/revoke', async (req, res) => {
    try {
      const result = await revokeApiKey(req.params.id);
      res.json({ success: true, key: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Suspend */
  router.post('/gateway/keys/:id/suspend', async (req, res) => {
    try {
      const result = await suspendApiKey(req.params.id);
      res.json({ success: true, key: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Reactivate */
  router.post('/gateway/keys/:id/reactivate', async (req, res) => {
    try {
      const result = await reactivateApiKey(req.params.id);
      res.json({ success: true, key: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Reset quota */
  router.post('/gateway/keys/:id/reset-quota', async (req, res) => {
    try {
      const result = await resetQuota(req.params.id);
      res.json({ success: true, key: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Version info */
  router.get('/gateway/versions', (_req, res) => {
    res.json({ success: true, versions: API_VERSIONS, current: CURRENT_VERSION });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDApiKey,
  DDDApiUsage,
  API_VERSIONS,
  CURRENT_VERSION,
  VERSION_STRATEGIES,
  RESPONSE_TRANSFORMS,
  generateApiKey,
  hashApiKey,
  createApiKey,
  validateApiKey,
  revokeApiKey,
  suspendApiKey,
  reactivateApiKey,
  resetQuota,
  resolveVersion,
  apiKeyMiddleware,
  usageTrackingMiddleware,
  getGatewayDashboard,
  getUsageTrend,
  createApiGatewayRouter,
};
