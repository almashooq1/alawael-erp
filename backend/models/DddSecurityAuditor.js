'use strict';
/**
 * DddSecurityAuditor Model
 * Auto-extracted from services/dddSecurityAuditor.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDSecurityEvent,
  DDDSecurityPolicy,
};
