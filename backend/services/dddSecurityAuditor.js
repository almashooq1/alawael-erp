'use strict';

/**
 * DDD Security Auditor
 * ═══════════════════════════════════════════════════════════════════════
 * Security scanning, vulnerability detection, threat monitoring,
 * security policy enforcement, and compliance reporting.
 *
 * Features:
 *  - Security event logging & classification
 *  - Brute-force / suspicious activity detection
 *  - IP reputation tracking
 *  - Security policy definitions & enforcement
 *  - OWASP-aligned vulnerability checks
 *  - Security posture dashboard
 *  - Incident response workflow
 *
 * @module dddSecurityAuditor
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Security Event ── */
const securityEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'login-success',
        'login-failure',
        'login-blocked',
        'password-change',
        'password-reset',
        'token-issued',
        'token-revoked',
        'token-expired',
        'access-denied',
        'privilege-escalation',
        'suspicious-activity',
        'brute-force',
        'ip-blocked',
        'ip-whitelisted',
        'data-export',
        'data-access',
        'data-modification',
        'config-change',
        'role-change',
        'injection-attempt',
        'xss-attempt',
        'csrf-attempt',
        'rate-limit-exceeded',
        'api-key-misuse',
        'session-hijack',
        'concurrent-session',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'info',
    },
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    ip: String,
    userAgent: String,
    route: String,
    method: String,
    description: String,
    descriptionAr: String,
    details: mongoose.Schema.Types.Mixed,

    /* Threat intel */
    threatScore: { type: Number, default: 0, min: 0, max: 100 },
    blocked: { type: Boolean, default: false },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId },
    resolvedAt: Date,
    resolution: String,

    branchId: { type: mongoose.Schema.Types.ObjectId },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

securityEventSchema.index({ eventType: 1, createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
securityEventSchema.index({ ip: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, eventType: 1 });

const DDDSecurityEvent =
  mongoose.models.DDDSecurityEvent || mongoose.model('DDDSecurityEvent', securityEventSchema);

/* ── Security Policy ── */
const securityPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    nameAr: String,
    category: {
      type: String,
      enum: [
        'authentication',
        'authorization',
        'data-protection',
        'network',
        'session',
        'api',
        'compliance',
      ],
      required: true,
    },
    rules: mongoose.Schema.Types.Mixed,
    enabled: { type: Boolean, default: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: String,
    descriptionAr: String,
    lastCheckedAt: Date,
    lastStatus: { type: String, enum: ['pass', 'fail', 'warning', 'skipped'], default: 'skipped' },
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DDDSecurityPolicy =
  mongoose.models.DDDSecurityPolicy || mongoose.model('DDDSecurityPolicy', securityPolicySchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Security Policies (Builtin)
   ═══════════════════════════════════════════════════════════════════════ */
const BUILTIN_POLICIES = [
  {
    name: 'password-complexity',
    nameAr: 'تعقيد كلمة المرور',
    category: 'authentication',
    severity: 'high',
    rules: {
      minLength: 10,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: true,
    },
  },
  {
    name: 'max-login-attempts',
    nameAr: 'محاولات تسجيل الدخول',
    category: 'authentication',
    severity: 'high',
    rules: { maxAttempts: 5, lockoutMinutes: 30 },
  },
  {
    name: 'session-timeout',
    nameAr: 'مهلة الجلسة',
    category: 'session',
    severity: 'medium',
    rules: { idleTimeoutMinutes: 30, absoluteTimeoutHours: 12 },
  },
  {
    name: 'concurrent-sessions',
    nameAr: 'جلسات متزامنة',
    category: 'session',
    severity: 'medium',
    rules: { maxConcurrent: 3, alertOnExceed: true },
  },
  {
    name: 'api-rate-limiting',
    nameAr: 'تحديد معدل API',
    category: 'api',
    severity: 'medium',
    rules: { requestsPerMinute: 100, burstLimit: 200 },
  },
  {
    name: 'ip-whitelist',
    nameAr: 'قائمة IP المعتمدة',
    category: 'network',
    severity: 'high',
    rules: { enabled: false, allowedCIDRs: [] },
  },
  {
    name: 'data-encryption-at-rest',
    nameAr: 'تشفير البيانات',
    category: 'data-protection',
    severity: 'critical',
    rules: { algorithm: 'aes-256-gcm', keyRotationDays: 90 },
  },
  {
    name: 'pii-masking',
    nameAr: 'إخفاء البيانات الشخصية',
    category: 'data-protection',
    severity: 'high',
    rules: { maskFields: ['nationalId', 'phone', 'email'], maskPattern: '***' },
  },
  {
    name: 'audit-trail-retention',
    nameAr: 'الاحتفاظ بسجل التدقيق',
    category: 'compliance',
    severity: 'high',
    rules: { retentionDays: 365, immutable: true },
  },
  {
    name: 'jwt-expiry',
    nameAr: 'انتهاء التوكن',
    category: 'authentication',
    severity: 'high',
    rules: { accessTokenMinutes: 30, refreshTokenDays: 7 },
  },
  {
    name: 'cors-policy',
    nameAr: 'سياسة CORS',
    category: 'network',
    severity: 'medium',
    rules: { allowCredentials: true, maxAge: 86400 },
  },
  {
    name: 'content-security-policy',
    nameAr: 'سياسة أمان المحتوى',
    category: 'network',
    severity: 'high',
    rules: { directives: { defaultSrc: "'self'", scriptSrc: "'self'" } },
  },
  {
    name: 'sql-injection-protection',
    nameAr: 'حماية حقن SQL',
    category: 'data-protection',
    severity: 'critical',
    rules: { sanitizeInputs: true, parameterizedQueries: true },
  },
  {
    name: 'xss-protection',
    nameAr: 'حماية XSS',
    category: 'data-protection',
    severity: 'critical',
    rules: { escapeOutput: true, httpOnly: true, secure: true },
  },
  {
    name: 'role-separation',
    nameAr: 'فصل الأدوار',
    category: 'authorization',
    severity: 'high',
    rules: { enforceRBAC: true, requireMFA: ['admin', 'superadmin'] },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   3. Threat Detection
   ═══════════════════════════════════════════════════════════════════════ */
const THREAT_PATTERNS = [
  {
    pattern: /(\b(union|select|insert|update|delete|drop|alter)\b.*\b(from|into|table|where)\b)/i,
    type: 'injection-attempt',
    severity: 'critical',
  },
  { pattern: /<script[\s>]|javascript:|on\w+\s*=/i, type: 'xss-attempt', severity: 'critical' },
  { pattern: /\.\.\//g, type: 'suspicious-activity', severity: 'high' },
  { pattern: /\0|%00/g, type: 'suspicious-activity', severity: 'high' },
];

function detectThreats(input) {
  if (!input || typeof input !== 'string') return [];
  const threats = [];
  for (const { pattern, type, severity } of THREAT_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({ type, severity, matched: input.slice(0, 200) });
    }
  }
  return threats;
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Core Security Functions
   ═══════════════════════════════════════════════════════════════════════ */
async function logSecurityEvent(data) {
  return DDDSecurityEvent.create({
    eventType: data.eventType,
    severity: data.severity || 'info',
    userId: data.userId,
    ip: data.ip,
    userAgent: data.userAgent,
    route: data.route,
    method: data.method,
    description: data.description,
    descriptionAr: data.descriptionAr,
    details: data.details,
    threatScore: data.threatScore || 0,
    blocked: data.blocked || false,
    branchId: data.branchId,
  });
}

async function checkBruteForce(ip, userId, windowMinutes = 15, maxAttempts = 5) {
  const since = new Date(Date.now() - windowMinutes * 60000);
  const query = {
    eventType: 'login-failure',
    createdAt: { $gte: since },
    isDeleted: { $ne: true },
  };
  if (ip) query.ip = ip;
  if (userId) query.userId = userId;

  const count = await DDDSecurityEvent.countDocuments(query);
  return {
    detected: count >= maxAttempts,
    attempts: count,
    threshold: maxAttempts,
    window: windowMinutes,
  };
}

async function getIPReputation(ip) {
  const since30d = new Date(Date.now() - 30 * 86400000);
  const [totalEvents, failedLogins, blocked, suspiciousCount] = await Promise.all([
    DDDSecurityEvent.countDocuments({ ip, createdAt: { $gte: since30d } }),
    DDDSecurityEvent.countDocuments({
      ip,
      eventType: 'login-failure',
      createdAt: { $gte: since30d },
    }),
    DDDSecurityEvent.countDocuments({ ip, blocked: true, createdAt: { $gte: since30d } }),
    DDDSecurityEvent.countDocuments({
      ip,
      severity: { $in: ['high', 'critical'] },
      createdAt: { $gte: since30d },
    }),
  ]);

  let score = 100;
  score -= Math.min(failedLogins * 5, 30);
  score -= blocked * 20;
  score -= suspiciousCount * 10;

  return {
    ip,
    reputationScore: Math.max(0, score),
    totalEvents,
    failedLogins,
    blockedCount: blocked,
    suspiciousCount,
    risk: score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high',
  };
}

async function resolveSecurityEvent(eventId, userId, resolution) {
  return DDDSecurityEvent.findByIdAndUpdate(
    eventId,
    { $set: { resolved: true, resolvedBy: userId, resolvedAt: new Date(), resolution } },
    { new: true }
  ).lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Security Middleware
   ═══════════════════════════════════════════════════════════════════════ */
function securityScanMiddleware(options = {}) {
  const { scanBody = true, scanQuery = true, blockThreats = false } = options;

  return async (req, res, next) => {
    const threats = [];
    if (scanQuery && req.originalUrl) threats.push(...detectThreats(req.originalUrl));
    if (scanBody && req.body) {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      threats.push(...detectThreats(bodyStr));
    }

    if (threats.length > 0) {
      const maxSeverity = threats.some(t => t.severity === 'critical') ? 'critical' : 'high';

      await logSecurityEvent({
        eventType: threats[0].type,
        severity: maxSeverity,
        userId: req.user?._id,
        ip: req.ip,
        userAgent: req.headers?.['user-agent'],
        route: req.originalUrl,
        method: req.method,
        description: `Threat detected: ${threats.map(t => t.type).join(', ')}`,
        details: { threats },
        threatScore: maxSeverity === 'critical' ? 90 : 60,
        blocked: blockThreats,
      });

      if (blockThreats) {
        return res
          .status(403)
          .json({ success: false, error: 'Request blocked by security policy' });
      }
    }

    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Security Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getSecurityDashboard() {
  const now = new Date();
  const oneDayAgo = new Date(now - 86400000);
  const oneWeekAgo = new Date(now - 7 * 86400000);

  const [
    total,
    last24h,
    bySeverity,
    byType,
    unresolvedCritical,
    topIPs,
    recentEvents,
    policyCount,
  ] = await Promise.all([
    DDDSecurityEvent.countDocuments({ isDeleted: { $ne: true } }),
    DDDSecurityEvent.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: oneDayAgo } }),
    DDDSecurityEvent.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: oneWeekAgo } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    DDDSecurityEvent.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: oneWeekAgo } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    DDDSecurityEvent.countDocuments({
      isDeleted: { $ne: true },
      severity: 'critical',
      resolved: { $ne: true },
    }),
    DDDSecurityEvent.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: '$ip',
          count: { $sum: 1 },
          blocked: { $sum: { $cond: ['$blocked', 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    DDDSecurityEvent.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(15)
      .select('eventType severity ip userId route blocked createdAt')
      .lean(),
    DDDSecurityPolicy.countDocuments({ isDeleted: { $ne: true } }),
  ]);

  return {
    total,
    last24h,
    unresolvedCritical,
    bySeverity: bySeverity.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    topEventTypes: byType,
    topIPs,
    recentEvents,
    policyCount,
    builtinPolicies: BUILTIN_POLICIES.length,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createSecurityAuditorRouter() {
  const router = Router();

  router.get('/security/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getSecurityDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/security/events', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.type) query.eventType = req.query.type;
      if (req.query.severity) query.severity = req.query.severity;
      if (req.query.ip) query.ip = req.query.ip;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const events = await DDDSecurityEvent.find(query).sort({ createdAt: -1 }).limit(limit).lean();
      res.json({ success: true, count: events.length, events });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/security/events/:id', async (req, res) => {
    try {
      const event = await DDDSecurityEvent.findById(req.params.id).lean();
      if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
      res.json({ success: true, event });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/security/events/:id/resolve', async (req, res) => {
    try {
      const result = await resolveSecurityEvent(req.params.id, req.user?._id, req.body.resolution);
      res.json({ success: true, event: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/security/ip/:ip/reputation', async (req, res) => {
    try {
      res.json({ success: true, ...(await getIPReputation(req.params.ip)) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/security/check-brute-force', async (req, res) => {
    try {
      res.json({ success: true, ...(await checkBruteForce(req.body.ip, req.body.userId)) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/security/policies', async (_req, res) => {
    try {
      const policies = await DDDSecurityPolicy.find({ isDeleted: { $ne: true } }).lean();
      res.json({
        success: true,
        count: policies.length,
        policies,
        builtinCount: BUILTIN_POLICIES.length,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/security/policies/builtin', (_req, res) => {
    res.json({ success: true, count: BUILTIN_POLICIES.length, policies: BUILTIN_POLICIES });
  });

  router.get('/security/threats/patterns', (_req, res) => {
    res.json({
      success: true,
      count: THREAT_PATTERNS.length,
      patterns: THREAT_PATTERNS.map(p => ({ type: p.type, severity: p.severity })),
    });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDSecurityEvent,
  DDDSecurityPolicy,
  BUILTIN_POLICIES,
  THREAT_PATTERNS,
  detectThreats,
  logSecurityEvent,
  checkBruteForce,
  getIPReputation,
  resolveSecurityEvent,
  securityScanMiddleware,
  getSecurityDashboard,
  createSecurityAuditorRouter,
};
