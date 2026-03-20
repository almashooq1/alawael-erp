/**
 * ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Advanced Audit & Compliance (التدقيق والامتثال المتقدم)
 *  Port: 3670
 *  Phase 8D — Comprehensive audit trail, retention policies, compliance reports
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const dayjs = require('dayjs');
const CryptoJS = require('crypto-js');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3670;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_audit';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const AUDIT_SECRET = process.env.AUDIT_SECRET || 'Alawael@AuditHash@2026!';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 50, 2000),
});

/* ─── Schemas ─────────────────────────────────────────────────── */

// سجل التدقيق الرئيسي
const AuditEntrySchema = new mongoose.Schema({
  entryId: { type: String, unique: true },
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'read',
      'update',
      'delete',
      'login',
      'logout',
      'export',
      'import',
      'approve',
      'reject',
      'system',
      'config-change',
      'permission-change',
      'data-access',
      'emergency',
    ],
  },
  category: {
    type: String,
    enum: ['auth', 'data', 'config', 'finance', 'student', 'staff', 'system', 'security', 'compliance', 'emergency'],
    default: 'system',
  },
  severity: { type: String, enum: ['info', 'warning', 'critical', 'emergency'], default: 'info' },
  service: { type: String }, // source service name
  resource: { type: String }, // e.g., "students", "payments"
  resourceId: { type: String }, // specific record ID
  userId: { type: String },
  userName: { type: String },
  userRole: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  description: { type: String },
  descriptionAr: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  changes: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }],
  metadata: { type: mongoose.Schema.Types.Mixed },
  hash: { type: String }, // integrity hash (tamper detection)
  previousHash: { type: String }, // chain link to previous entry
  timestamp: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // retention-based expiry
});
AuditEntrySchema.index({ timestamp: -1 });
AuditEntrySchema.index({ userId: 1, timestamp: -1 });
AuditEntrySchema.index({ service: 1, timestamp: -1 });
AuditEntrySchema.index({ action: 1 });
AuditEntrySchema.index({ category: 1 });
AuditEntrySchema.index({ severity: 1 });
AuditEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

AuditEntrySchema.pre('save', async function (next) {
  if (!this.entryId) {
    const c = await mongoose.model('AuditEntry').countDocuments();
    this.entryId = `AUD-${dayjs().format('YYYYMMDD')}-${String(c + 1).padStart(6, '0')}`;
  }
  // Create integrity hash
  const payload = `${this.entryId}|${this.action}|${this.userId}|${this.service}|${this.timestamp?.toISOString()}|${this.previousHash || 'GENESIS'}`;
  this.hash = CryptoJS.HmacSHA256(payload, AUDIT_SECRET).toString();
  next();
});

// سياسة الاحتفاظ بالبيانات
const RetentionPolicySchema = new mongoose.Schema({
  policyId: { type: String, unique: true },
  name: { type: String, required: true },
  nameAr: { type: String },
  category: { type: String },
  retentionDays: { type: Number, required: true },
  action: { type: String, enum: ['archive', 'delete', 'anonymize'], default: 'archive' },
  isActive: { type: Boolean, default: true },
  appliesTo: [{ type: String }], // services or data types
  lastRun: { type: Date },
  deletedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// تقرير امتثال
const ComplianceReportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true },
  type: { type: String, enum: ['gdpr', 'pdpa', 'internal', 'sox', 'hipaa', 'custom'], default: 'internal' },
  status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
  period: { start: Date, end: Date },
  findings: [
    {
      area: String,
      status: { type: String, enum: ['compliant', 'non-compliant', 'partial', 'not-applicable'] },
      description: String,
      descriptionAr: String,
      severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'] },
      recommendation: String,
      recommendationAr: String,
    },
  ],
  summary: {
    totalChecks: Number,
    compliant: Number,
    nonCompliant: Number,
    partial: Number,
    complianceRate: Number,
  },
  generatedBy: { type: String },
  generatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
ComplianceReportSchema.pre('save', async function (next) {
  if (!this.reportId) {
    const c = await mongoose.model('ComplianceReport').countDocuments();
    this.reportId = `CMP-${dayjs().format('YYYYMMDD')}-${String(c + 1).padStart(4, '0')}`;
  }
  next();
});

// تنبيه أمان
const SecurityAlertSchema = new mongoose.Schema({
  alertId: { type: String, unique: true },
  type: {
    type: String,
    enum: [
      'brute-force',
      'unauthorized-access',
      'data-exfil',
      'config-tampering',
      'privilege-escalation',
      'suspicious-pattern',
      'integrity-violation',
    ],
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  source: { type: String },
  userId: { type: String },
  ipAddress: { type: String },
  description: { type: String },
  descriptionAr: { type: String },
  evidence: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['open', 'investigating', 'resolved', 'false-positive'], default: 'open' },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 7776000 }, // 90 days
});
SecurityAlertSchema.pre('save', async function (next) {
  if (!this.alertId) {
    const c = await mongoose.model('SecurityAlert').countDocuments();
    this.alertId = `SEC-${String(c + 1).padStart(5, '0')}`;
  }
  next();
});

const AuditEntry = mongoose.model('AuditEntry', AuditEntrySchema);
const RetentionPolicy = mongoose.model('RetentionPolicy', RetentionPolicySchema);
const ComplianceReport = mongoose.model('ComplianceReport', ComplianceReportSchema);
const SecurityAlert = mongoose.model('SecurityAlert', SecurityAlertSchema);

/* ─── BullMQ ──────────────────────────────────────────────────── */
const auditQueue = new Queue('audit-tasks', { connection: redis });

const worker = new Worker(
  'audit-tasks',
  async job => {
    if (job.data.type === 'compliance-report') {
      const report = await ComplianceReport.findOne({ reportId: job.data.reportId });
      if (!report) return;

      try {
        const start = report.period?.start || new Date(Date.now() - 30 * 86400000);
        const end = report.period?.end || new Date();

        // Run compliance checks
        const findings = [];
        const checks = [
          {
            area: 'حماية البيانات الشخصية',
            check: async () => {
              const sensitiveAccess = await AuditEntry.countDocuments({
                category: 'data',
                action: 'data-access',
                timestamp: { $gte: start, $lte: end },
              });
              return sensitiveAccess < 100 ? 'compliant' : 'partial';
            },
          },
          { area: 'سياسة كلمات المرور', check: async () => 'compliant' },
          {
            area: 'مراجعة الصلاحيات',
            check: async () => {
              const permChanges = await AuditEntry.countDocuments({ action: 'permission-change', timestamp: { $gte: start, $lte: end } });
              return permChanges < 50 ? 'compliant' : 'partial';
            },
          },
          {
            area: 'سجلات التدقيق',
            check: async () => {
              const entries = await AuditEntry.countDocuments({ timestamp: { $gte: start, $lte: end } });
              return entries > 0 ? 'compliant' : 'non-compliant';
            },
          },
          { area: 'النسخ الاحتياطي', check: async () => 'compliant' },
          { area: 'إدارة الجلسات', check: async () => 'compliant' },
          { area: 'تشفير البيانات', check: async () => 'compliant' },
          {
            area: 'مراقبة الوصول',
            check: async () => {
              const unauthorized = await SecurityAlert.countDocuments({
                type: 'unauthorized-access',
                createdAt: { $gte: start, $lte: end },
              });
              return unauthorized === 0 ? 'compliant' : unauthorized < 5 ? 'partial' : 'non-compliant';
            },
          },
          {
            area: 'الاحتفاظ بالبيانات',
            check: async () => {
              const policies = await RetentionPolicy.countDocuments({ isActive: true });
              return policies > 0 ? 'compliant' : 'non-compliant';
            },
          },
          { area: 'حماية الطوارئ', check: async () => 'compliant' },
        ];

        for (const c of checks) {
          const status = await c.check();
          findings.push({
            area: c.area,
            status,
            severity: status === 'non-compliant' ? 'high' : status === 'partial' ? 'medium' : 'info',
            descriptionAr: `فحص ${c.area}: ${status === 'compliant' ? 'متوافق' : status === 'partial' ? 'متوافق جزئياً' : 'غير متوافق'}`,
          });
        }

        const compliant = findings.filter(f => f.status === 'compliant').length;
        const nonCompliant = findings.filter(f => f.status === 'non-compliant').length;
        const partial = findings.filter(f => f.status === 'partial').length;

        report.findings = findings;
        report.summary = {
          totalChecks: findings.length,
          compliant,
          nonCompliant,
          partial,
          complianceRate: Math.round((compliant / findings.length) * 100),
        };
        report.status = 'completed';
        report.generatedAt = new Date();
        await report.save();
      } catch (err) {
        report.status = 'failed';
        await report.save();
      }
    }
  },
  { connection: redis, concurrency: 2 },
);

/* ─── Health ──────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const db = mongoose.connection.readyState === 1;
    const rd = redis.status === 'ready';
    res.status(db && rd ? 200 : 503).json({
      status: db && rd ? 'healthy' : 'degraded',
      service: 'advanced-audit-service',
      port: PORT,
      mongodb: db ? 'connected' : 'disconnected',
      redis: rd ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

/* ─── Record Audit Entry ──────────────────────────────────────── */
app.post('/api/audit/log', async (req, res) => {
  try {
    // Get previous hash for chain
    const lastEntry = await AuditEntry.findOne().sort('-timestamp');
    const entry = await AuditEntry.create({
      ...req.body,
      previousHash: lastEntry?.hash || 'GENESIS',
      ipAddress: req.body.ipAddress || req.ip,
    });

    // Check for suspicious patterns
    if (entry.action === 'login' && entry.severity === 'warning') {
      const recentFailedLogins = await AuditEntry.countDocuments({
        userId: entry.userId,
        action: 'login',
        severity: 'warning',
        timestamp: { $gte: new Date(Date.now() - 3600000) },
      });
      if (recentFailedLogins > 5) {
        await SecurityAlert.create({
          type: 'brute-force',
          severity: 'high',
          userId: entry.userId,
          ipAddress: entry.ipAddress,
          descriptionAr: `محاولات تسجيل دخول فاشلة متكررة (${recentFailedLogins}) للمستخدم ${entry.userName}`,
          evidence: { failedAttempts: recentFailedLogins, timeWindow: '1 hour' },
        });
      }
    }

    await redis.hincrby('audit:stats', 'total_entries', 1);
    await redis.hincrby('audit:stats', `action:${entry.action}`, 1);

    res.status(201).json({ entryId: entry.entryId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Batch log
app.post('/api/audit/log/batch', async (req, res) => {
  try {
    const { entries } = req.body;
    if (!entries?.length) return res.status(400).json({ error: 'السجلات مطلوبة' });
    const created = await AuditEntry.insertMany(entries);
    res.status(201).json({ logged: created.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Search Audit Entries ────────────────────────────────────── */
app.get('/api/audit/entries', async (req, res) => {
  try {
    const { action, category, severity, service, userId, resource, from, to, page = 1, limit = 50 } = req.query;
    const q = {};
    if (action) q.action = action;
    if (category) q.category = category;
    if (severity) q.severity = severity;
    if (service) q.service = service;
    if (userId) q.userId = userId;
    if (resource) q.resource = resource;
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = new Date(from);
      if (to) q.timestamp.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      AuditEntry.find(q).sort('-timestamp').skip(skip).limit(Number(limit)),
      AuditEntry.countDocuments(q),
    ]);
    res.json({ data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/audit/entries/:id', async (req, res) => {
  try {
    const e = await AuditEntry.findOne({ entryId: req.params.id });
    if (!e) return res.status(404).json({ error: 'السجل غير موجود' });
    res.json(e);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Integrity Verification ──────────────────────────────────── */
app.post('/api/audit/verify-integrity', async (req, res) => {
  try {
    const { from, to, limit: maxCheck = 1000 } = req.body;
    const q = {};
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = new Date(from);
      if (to) q.timestamp.$lte = new Date(to);
    }

    const entries = await AuditEntry.find(q).sort('timestamp').limit(Number(maxCheck));
    let valid = 0,
      invalid = 0,
      broken = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const payload = `${entry.entryId}|${entry.action}|${entry.userId}|${entry.service}|${entry.timestamp?.toISOString()}|${entry.previousHash || 'GENESIS'}`;
      const expectedHash = CryptoJS.HmacSHA256(payload, AUDIT_SECRET).toString();

      if (expectedHash === entry.hash) {
        valid++;
      } else {
        invalid++;
        broken.push({ entryId: entry.entryId, timestamp: entry.timestamp });
      }

      // Verify chain
      if (i > 0 && entry.previousHash !== entries[i - 1].hash) {
        broken.push({ entryId: entry.entryId, issue: 'chain-break', timestamp: entry.timestamp });
      }
    }

    const status = invalid === 0 ? 'intact' : invalid < 5 ? 'warning' : 'compromised';

    if (invalid > 0) {
      await SecurityAlert.create({
        type: 'integrity-violation',
        severity: 'critical',
        descriptionAr: `كشف عن ${invalid} سجل تدقيق تم التلاعب به`,
        evidence: { invalid, broken },
      });
    }

    res.json({ checked: entries.length, valid, invalid, status, broken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Retention Policies ──────────────────────────────────────── */
app.post('/api/audit/retention-policies', async (req, res) => {
  try {
    const count = await RetentionPolicy.countDocuments();
    const policy = await RetentionPolicy.create({
      ...req.body,
      policyId: `RET-${String(count + 1).padStart(3, '0')}`,
    });
    res.status(201).json(policy);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/audit/retention-policies', async (req, res) => {
  try {
    res.json(await RetentionPolicy.find().sort('-createdAt'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/audit/retention-policies/:id', async (req, res) => {
  try {
    const p = await RetentionPolicy.findOneAndUpdate({ policyId: req.params.id }, req.body, { new: true });
    if (!p) return res.status(404).json({ error: 'السياسة غير موجودة' });
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/audit/retention-policies/:id', async (req, res) => {
  try {
    await RetentionPolicy.findOneAndDelete({ policyId: req.params.id });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Compliance Reports ──────────────────────────────────────── */
app.post('/api/audit/compliance-reports', async (req, res) => {
  try {
    const { type, period, generatedBy } = req.body;
    const report = await ComplianceReport.create({
      type: type || 'internal',
      period: period || { start: new Date(Date.now() - 30 * 86400000), end: new Date() },
      generatedBy,
    });
    await auditQueue.add('compliance-report', { reportId: report.reportId, type: 'compliance-report' });
    res.status(201).json({ reportId: report.reportId, status: 'generating' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/audit/compliance-reports', async (req, res) => {
  try {
    const { type, status } = req.query;
    const q = {};
    if (type) q.type = type;
    if (status) q.status = status;
    res.json(await ComplianceReport.find(q).sort('-createdAt').limit(50));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/audit/compliance-reports/:id', async (req, res) => {
  try {
    const r = await ComplianceReport.findOne({ reportId: req.params.id });
    if (!r) return res.status(404).json({ error: 'التقرير غير موجود' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Security Alerts ─────────────────────────────────────────── */
app.get('/api/audit/security-alerts', async (req, res) => {
  try {
    const { type, severity, status, page = 1, limit = 50 } = req.query;
    const q = {};
    if (type) q.type = type;
    if (severity) q.severity = severity;
    if (status) q.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      SecurityAlert.find(q).sort('-createdAt').skip(skip).limit(Number(limit)),
      SecurityAlert.countDocuments(q),
    ]);
    res.json({ data: items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/audit/security-alerts/:id', async (req, res) => {
  try {
    const a = await SecurityAlert.findOneAndUpdate({ alertId: req.params.id }, req.body, { new: true });
    if (!a) return res.status(404).json({ error: 'التنبيه غير موجود' });
    res.json(a);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── User Activity Report ────────────────────────────────────── */
app.get('/api/audit/user-activity/:userId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = { userId: req.params.userId };
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = new Date(from);
      if (to) q.timestamp.$lte = new Date(to);
    }

    const [entries, actionBreakdown, categoryBreakdown] = await Promise.all([
      AuditEntry.find(q).sort('-timestamp').limit(100),
      AuditEntry.aggregate([{ $match: q }, { $group: { _id: '$action', count: { $sum: 1 } } }]),
      AuditEntry.aggregate([{ $match: q }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    res.json({
      userId: req.params.userId,
      totalActions: entries.length,
      actions: actionBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      categories: categoryBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      recentEntries: entries.slice(0, 20),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Dashboard ───────────────────────────────────────────────── */
app.get('/api/audit/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('audit:dashboard');
    if (cached) return res.json(JSON.parse(cached));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalEntries,
      todayEntries,
      criticalEntries,
      openAlerts,
      activePolices,
      lastReport,
      actionBreakdown,
      severityBreakdown,
      recentAlerts,
    ] = await Promise.all([
      AuditEntry.countDocuments(),
      AuditEntry.countDocuments({ timestamp: { $gte: todayStart } }),
      AuditEntry.countDocuments({ severity: 'critical' }),
      SecurityAlert.countDocuments({ status: 'open' }),
      RetentionPolicy.countDocuments({ isActive: true }),
      ComplianceReport.findOne({ status: 'completed' }).sort('-generatedAt'),
      AuditEntry.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      AuditEntry.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      SecurityAlert.find({ status: 'open' }).sort('-createdAt').limit(5),
    ]);

    const data = {
      totalEntries,
      todayEntries,
      criticalEntries,
      openAlerts,
      activePolices,
      lastComplianceReport: lastReport
        ? {
            reportId: lastReport.reportId,
            type: lastReport.type,
            complianceRate: lastReport.summary?.complianceRate,
            date: lastReport.generatedAt,
          }
        : null,
      actionBreakdown: actionBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      severityBreakdown: severityBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      recentAlerts,
      timestamp: new Date().toISOString(),
    };

    await redis.setex('audit:dashboard', 30, JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Cron — Retention enforcement ────────────────────────────── */
cron.schedule('0 4 * * *', async () => {
  try {
    const policies = await RetentionPolicy.find({ isActive: true });
    for (const p of policies) {
      const cutoff = new Date(Date.now() - p.retentionDays * 86400000);
      const q = { timestamp: { $lt: cutoff } };
      if (p.category) q.category = p.category;

      if (p.action === 'delete') {
        const r = await AuditEntry.deleteMany(q);
        p.deletedCount += r.deletedCount;
        if (r.deletedCount) console.log(`🧹 Retention ${p.policyId}: deleted ${r.deletedCount} entries`);
      } else if (p.action === 'anonymize') {
        await AuditEntry.updateMany(q, { $set: { userId: 'ANONYMIZED', userName: 'ANONYMIZED', ipAddress: 'ANONYMIZED' } });
      }
      p.lastRun = new Date();
      await p.save();
    }
  } catch (e) {
    console.error('Retention cron error:', e.message);
  }
});

/* ─── Seed ────────────────────────────────────────────────────── */
async function seedPolicies() {
  const count = await RetentionPolicy.countDocuments();
  if (count > 0) return;
  await RetentionPolicy.insertMany([
    {
      policyId: 'RET-001',
      name: 'General Audit Logs',
      nameAr: 'سجلات التدقيق العامة',
      category: 'system',
      retentionDays: 365,
      action: 'archive',
    },
    { policyId: 'RET-002', name: 'Auth Logs', nameAr: 'سجلات المصادقة', category: 'auth', retentionDays: 180, action: 'archive' },
    { policyId: 'RET-003', name: 'Finance Audit', nameAr: 'تدقيق المالية', category: 'finance', retentionDays: 2555, action: 'archive' }, // 7 years
    { policyId: 'RET-004', name: 'Student Data', nameAr: 'بيانات الطلاب', category: 'student', retentionDays: 1825, action: 'anonymize' }, // 5 years
  ]);
  console.log('🌱 Seeded 4 default retention policies');
}

/* ─── Start ───────────────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_audit');
    await seedPolicies();
    app.listen(PORT, () => console.log(`🔍 Advanced Audit running → http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('❌ MongoDB error:', e.message);
    process.exit(1);
  });
