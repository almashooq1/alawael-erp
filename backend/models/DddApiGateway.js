'use strict';
/**
 * DddApiGateway Model
 * Auto-extracted from services/dddApiGateway.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDApiKey,
  DDDApiUsage,
};
