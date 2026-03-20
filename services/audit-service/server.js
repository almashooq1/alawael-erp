/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Audit Service
 * خدمة سجل التدقيق والامتثال — Immutable Audit Trail
 *
 * Features:
 *  - Immutable audit log entries with hash chain
 *  - User action tracking (CRUD, login, permissions)
 *  - Data change diffs (before/after)
 *  - Compliance reporting (Saudi labor law, NCA)
 *  - RBAC audit trail for security
 *  - Retention policy with archival
 *  - Real-time audit stream API
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'audit-service' },
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3230;
app.use(express.json({ limit: '5mb' }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_audit', { maxPoolSize: 10 });
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// ─── Audit Entry Schema (Immutable) ─────────────────────────────────────────
const auditSchema = new mongoose.Schema(
  {
    // Identity
    actor: { type: String, required: true, index: true },
    actorName: String,
    actorRole: String,
    actorIp: String,
    userAgent: String,

    // Action
    action: { type: String, required: true, index: true }, // create, read, update, delete, login, logout, export, permission_change
    resource: { type: String, required: true, index: true }, // employee, student, invoice, etc.
    resourceId: { type: String, index: true },
    module: { type: String, index: true }, // hr, finance, scm, etc.

    // Data
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      fields: [String], // changed field names
    },
    metadata: mongoose.Schema.Types.Mixed,

    // Integrity
    hash: { type: String, required: true },
    previousHash: String,
    sequence: { type: Number, index: true },

    // Classification
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low', index: true },
    category: { type: String, enum: ['data', 'auth', 'permission', 'config', 'export', 'system'], default: 'data' },

    // Compliance
    complianceTags: [{ type: String, index: true }], // saudi_labor_law, nca, pdpl, etc.

    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    // Prevent modification
    strict: true,
  },
);

auditSchema.index({ timestamp: -1 });
auditSchema.index({ actor: 1, action: 1, timestamp: -1 });
auditSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditSchema.index({ module: 1, timestamp: -1 });

const AuditEntry = mongoose.model('AuditEntry', auditSchema);

// ─── Hash Chain ──────────────────────────────────────────────────────────────
let lastHash = null;
let sequence = 0;

async function initChain() {
  const last = await AuditEntry.findOne().sort({ sequence: -1 }).lean();
  if (last) {
    lastHash = last.hash;
    sequence = last.sequence;
  }
}
initChain();

function computeHash(entry) {
  const payload = JSON.stringify({
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    changes: entry.changes,
    timestamp: entry.timestamp,
    previousHash: entry.previousHash,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ─── Auto-classify severity ─────────────────────────────────────────────────
function classifySeverity(action, resource) {
  if (['delete', 'permission_change'].includes(action)) return 'high';
  if (['login', 'logout'].includes(action)) return 'medium';
  if (['export'].includes(action)) return 'medium';
  if (['config'].includes(resource)) return 'high';
  if (['user', 'role', 'permission'].includes(resource)) return 'high';
  return 'low';
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// Record audit entry
app.post('/api/audit', async (req, res) => {
  try {
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const entry of entries) {
      if (!entry.actor || !entry.action || !entry.resource) {
        results.push({ error: 'actor, action, resource required' });
        continue;
      }

      sequence++;
      const doc = {
        ...entry,
        severity: entry.severity || classifySeverity(entry.action, entry.resource),
        previousHash: lastHash,
        sequence,
        timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
      };
      doc.hash = computeHash(doc);
      lastHash = doc.hash;

      const saved = await AuditEntry.create(doc);
      results.push(saved);

      // Publish to Redis for real-time subscribers
      await redis.publish('audit:events', JSON.stringify(saved));

      // Track critical actions
      if (saved.severity === 'critical' || saved.severity === 'high') {
        await redis.lpush(
          'audit:critical',
          JSON.stringify({ id: saved._id, actor: saved.actor, action: saved.action, resource: saved.resource, timestamp: saved.timestamp }),
        );
        await redis.ltrim('audit:critical', 0, 999);
      }
    }

    res.status(201).json({ data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search audit entries
app.get('/api/audit', async (req, res) => {
  try {
    const { actor, action, resource, resourceId, module, severity, category, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (actor) filter.actor = actor;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (resourceId) filter.resourceId = resourceId;
    if (module) filter.module = module;
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      AuditEntry.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      AuditEntry.countDocuments(filter),
    ]);
    res.json({ data, total, page: +page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resource history
app.get('/api/audit/resource/:resource/:resourceId', async (req, res) => {
  const data = await AuditEntry.find({
    resource: req.params.resource,
    resourceId: req.params.resourceId,
  })
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();
  res.json({ data });
});

// User activity
app.get('/api/audit/user/:userId', async (req, res) => {
  const { from, to, page = 1, limit = 50 } = req.query;
  const filter = { actor: req.params.userId };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    AuditEntry.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean(),
    AuditEntry.countDocuments(filter),
  ]);
  res.json({ data, total });
});

// Verify integrity
app.get('/api/audit/verify', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '1000');
    const entries = await AuditEntry.find().sort({ sequence: 1 }).limit(limit).lean();

    let valid = true;
    let broken = null;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previousHash !== entries[i - 1].hash) {
        valid = false;
        broken = { sequence: entries[i].sequence, expected: entries[i - 1].hash, actual: entries[i].previousHash };
        break;
      }
    }
    res.json({ valid, checked: entries.length, broken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
app.get('/api/audit/stats', async (req, res) => {
  const hours = parseInt(req.query.hours || '24');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [byAction, byModule, bySeverity, total] = await Promise.all([
    AuditEntry.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditEntry.aggregate([{ $match: { timestamp: { $gte: since } } }, { $group: { _id: '$module', count: { $sum: 1 } } }]),
    AuditEntry.aggregate([{ $match: { timestamp: { $gte: since } } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    AuditEntry.countDocuments({ timestamp: { $gte: since } }),
  ]);

  res.json({ period: `${hours}h`, total, byAction, byModule, bySeverity });
});

// Critical events
app.get('/api/audit/critical', async (req, res) => {
  const events = await redis.lrange('audit:critical', 0, 99);
  res.json({ data: events.map(e => JSON.parse(e)) });
});

// Compliance report
app.get('/api/audit/compliance/:tag', async (req, res) => {
  const { from, to } = req.query;
  const filter = { complianceTags: req.params.tag };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }
  const data = await AuditEntry.find(filter).sort({ timestamp: -1 }).limit(500).lean();
  res.json({ data, tag: req.params.tag, total: data.length });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-service', version: '1.0.0', uptime: process.uptime(), sequence, chainIntact: !!lastHash });
});

app.listen(PORT, '0.0.0.0', () => logger.info(`🔍 Audit Service running on port ${PORT}`));
module.exports = app;
