'use strict';

/**
 * DDD Feature Flags Service
 * ═══════════════════════════════════════════════════════════════════════
 * Persistent, DDD-aware feature flag management with per-domain,
 * per-branch, per-role, and per-user toggles. MongoDB-backed.
 *
 * Features:
 *  - Persistent flag storage (MongoDB)
 *  - Per-domain module toggles
 *  - Per-branch (tenant) overrides
 *  - Per-role and per-user targeting
 *  - Percentage rollout support
 *  - A/B experiment variants
 *  - Flag evaluation with inheritance (global → branch → role → user)
 *  - Audit log of flag changes
 *  - Dashboard & analytics
 *
 * @module dddFeatureFlags
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Feature Flag Model
   ═══════════════════════════════════════════════════════════════════════ */
const flagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ['domain', 'feature', 'experiment', 'operational', 'ui', 'integration'],
      default: 'feature',
    },

    /* Global state */
    enabled: { type: Boolean, default: false },
    percentage: { type: Number, min: 0, max: 100, default: 100 },

    /* Targeting */
    targeting: {
      domains: [String], // DDD domain names
      branches: [{ type: mongoose.Schema.Types.ObjectId }], // specific branches
      roles: [String], // user roles
      users: [{ type: mongoose.Schema.Types.ObjectId }], // specific users
      excludeUsers: [{ type: mongoose.Schema.Types.ObjectId }],
    },

    /* Variants (A/B testing) */
    variants: [
      {
        key: { type: String, required: true },
        name: String,
        weight: { type: Number, default: 50 },
        config: mongoose.Schema.Types.Mixed,
      },
    ],

    /* Lifecycle */
    startDate: Date,
    endDate: Date,
    owner: String,
    tags: [String],

    /* Default value for complex flags */
    defaultValue: mongoose.Schema.Types.Mixed,

    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

flagSchema.index({ key: 1 }, { unique: true });
flagSchema.index({ category: 1, enabled: 1 });
flagSchema.index({ 'targeting.domains': 1 });
flagSchema.index({ 'targeting.branches': 1 });

const DDDFeatureFlag =
  mongoose.models.DDDFeatureFlag || mongoose.model('DDDFeatureFlag', flagSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Flag Change Audit Log
   ═══════════════════════════════════════════════════════════════════════ */
const flagAuditSchema = new mongoose.Schema(
  {
    flagKey: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'enabled',
        'disabled',
        'deleted',
        'rollout-changed',
        'targeting-changed',
      ],
      required: true,
    },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: { type: mongoose.Schema.Types.ObjectId },
    reason: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

flagAuditSchema.index({ flagKey: 1, createdAt: -1 });

const DDDFlagAudit =
  mongoose.models.DDDFlagAudit || mongoose.model('DDDFlagAudit', flagAuditSchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. Default DDD Feature Flags
   ═══════════════════════════════════════════════════════════════════════ */
const DEFAULT_FLAGS = [
  {
    key: 'ddd.telerehab.enabled',
    name: 'Tele-Rehabilitation Module',
    category: 'domain',
    enabled: true,
    targeting: { domains: ['tele-rehab'] },
  },
  {
    key: 'ddd.arvr.enabled',
    name: 'AR/VR Rehabilitation Module',
    category: 'domain',
    enabled: false,
    targeting: { domains: ['ar-vr'] },
  },
  {
    key: 'ddd.ai-recommendations.enabled',
    name: 'AI Recommendations',
    category: 'domain',
    enabled: true,
    targeting: { domains: ['ai-recommendations'] },
  },
  {
    key: 'ddd.clinical-engine.enabled',
    name: 'Clinical Decision Engine',
    category: 'feature',
    enabled: true,
  },
  {
    key: 'ddd.risk-stratification.enabled',
    name: 'Risk Stratification',
    category: 'feature',
    enabled: true,
  },
  {
    key: 'ddd.smart-scheduler.enabled',
    name: 'Smart Scheduling',
    category: 'feature',
    enabled: true,
  },
  {
    key: 'ddd.consent-management.enabled',
    name: 'Consent Management',
    category: 'feature',
    enabled: true,
  },
  {
    key: 'ddd.fhir-interop.enabled',
    name: 'FHIR Interoperability',
    category: 'integration',
    enabled: false,
  },
  {
    key: 'ddd.webhook-dispatching.enabled',
    name: 'Webhook Dispatching',
    category: 'integration',
    enabled: true,
  },
  {
    key: 'ddd.bulk-export.enabled',
    name: 'Bulk Data Export',
    category: 'operational',
    enabled: true,
  },
  {
    key: 'ddd.data-quality-monitoring.enabled',
    name: 'Data Quality Monitoring',
    category: 'operational',
    enabled: true,
  },
  {
    key: 'ddd.advanced-analytics.enabled',
    name: 'Advanced Analytics Pipelines',
    category: 'feature',
    enabled: true,
  },
  {
    key: 'ddd.group-therapy.video.enabled',
    name: 'Group Therapy Video Sessions',
    category: 'feature',
    enabled: false,
    percentage: 25,
  },
  {
    key: 'ddd.research.export.enabled',
    name: 'Research Data Export',
    category: 'domain',
    enabled: true,
    targeting: { domains: ['research'] },
  },
  {
    key: 'ddd.behavior.realtime-alerts.enabled',
    name: 'Real-time Behavior Alerts',
    category: 'feature',
    enabled: true,
    targeting: { domains: ['behavior'] },
  },
  {
    key: 'ddd.family-portal.enabled',
    name: 'Family Self-Service Portal',
    category: 'ui',
    enabled: false,
    percentage: 10,
  },
  {
    key: 'ddd.outcome-tracking.gas.enabled',
    name: 'GAS Outcome Tracking',
    category: 'feature',
    enabled: true,
  },
  {
    key: 'ddd.notifications.sms.enabled',
    name: 'SMS Notifications',
    category: 'integration',
    enabled: false,
  },
  {
    key: 'ddd.notifications.push.enabled',
    name: 'Push Notifications',
    category: 'integration',
    enabled: false,
  },
  {
    key: 'ddd.compliance.auto-assessment.enabled',
    name: 'Auto Compliance Assessment',
    category: 'operational',
    enabled: true,
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. Flag Operations
   ═══════════════════════════════════════════════════════════════════════ */
async function seedDefaultFlags() {
  let created = 0;
  for (const def of DEFAULT_FLAGS) {
    const exists = await DDDFeatureFlag.findOne({ key: def.key });
    if (!exists) {
      await DDDFeatureFlag.create(def);
      created++;
    }
  }
  return { created, total: DEFAULT_FLAGS.length };
}

async function createFlag(data, changedBy) {
  const flag = await DDDFeatureFlag.create(data);
  await DDDFlagAudit.create({ flagKey: flag.key, action: 'created', newValue: data, changedBy });
  return flag.toObject();
}

async function updateFlag(key, updates, changedBy, reason) {
  const prev = await DDDFeatureFlag.findOne({ key }).lean();
  if (!prev) throw new Error(`Flag not found: ${key}`);

  const flag = await DDDFeatureFlag.findOneAndUpdate(
    { key },
    { $set: updates },
    { new: true }
  ).lean();

  const action =
    'enabled' in updates
      ? updates.enabled
        ? 'enabled'
        : 'disabled'
      : 'percentage' in updates
        ? 'rollout-changed'
        : 'targeting' in updates
          ? 'targeting-changed'
          : 'updated';

  await DDDFlagAudit.create({
    flagKey: key,
    action,
    previousValue: prev,
    newValue: updates,
    changedBy,
    reason,
  });
  return flag;
}

async function deleteFlag(key, changedBy) {
  await DDDFeatureFlag.findOneAndUpdate({ key }, { $set: { isDeleted: true } });
  await DDDFlagAudit.create({ flagKey: key, action: 'deleted', changedBy });
}

async function getFlag(key) {
  return DDDFeatureFlag.findOne({ key, isDeleted: { $ne: true } }).lean();
}

async function listFlags(filter = {}) {
  const query = { isDeleted: { $ne: true } };
  if (filter.category) query.category = filter.category;
  if (filter.enabled !== undefined) query.enabled = filter.enabled;
  if (filter.domain) query['targeting.domains'] = filter.domain;
  return DDDFeatureFlag.find(query).sort({ key: 1 }).lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Flag Evaluation Engine
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Hash-based deterministic percentage check.
 */
function hashPercentage(flagKey, userId) {
  let hash = 0;
  const str = `${flagKey}:${userId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Evaluate whether a flag is enabled for a given context.
 *
 * @param {string} key - Flag key
 * @param {Object} context - { userId, branchId, role, domain }
 * @returns {{ enabled: boolean, variant?: string, value?: any }}
 */
async function evaluateFlag(key, context = {}) {
  const flag = await DDDFeatureFlag.findOne({ key, isDeleted: { $ne: true } }).lean();
  if (!flag) return { enabled: false, reason: 'flag-not-found' };

  /* Date constraints */
  const now = new Date();
  if (flag.startDate && now < new Date(flag.startDate))
    return { enabled: false, reason: 'not-started' };
  if (flag.endDate && now > new Date(flag.endDate)) return { enabled: false, reason: 'expired' };

  /* Global kill switch */
  if (!flag.enabled) return { enabled: false, reason: 'globally-disabled' };

  /* Exclude list */
  if (context.userId && flag.targeting?.excludeUsers?.length) {
    if (flag.targeting.excludeUsers.some(u => String(u) === String(context.userId))) {
      return { enabled: false, reason: 'user-excluded' };
    }
  }

  /* Targeting: user allow-list */
  if (flag.targeting?.users?.length) {
    if (!context.userId || !flag.targeting.users.some(u => String(u) === String(context.userId))) {
      /* Not in user list — but check other targeting */
    } else {
      return resolveVariant(flag, context);
    }
  }

  /* Targeting: domain */
  if (flag.targeting?.domains?.length && context.domain) {
    if (!flag.targeting.domains.includes(context.domain)) {
      return { enabled: false, reason: 'domain-not-targeted' };
    }
  }

  /* Targeting: branch */
  if (flag.targeting?.branches?.length && context.branchId) {
    if (!flag.targeting.branches.some(b => String(b) === String(context.branchId))) {
      return { enabled: false, reason: 'branch-not-targeted' };
    }
  }

  /* Targeting: role */
  if (flag.targeting?.roles?.length && context.role) {
    if (!flag.targeting.roles.includes(context.role)) {
      return { enabled: false, reason: 'role-not-targeted' };
    }
  }

  /* Percentage rollout */
  if (flag.percentage < 100 && context.userId) {
    const bucket = hashPercentage(key, context.userId);
    if (bucket >= flag.percentage) {
      return { enabled: false, reason: 'percentage-excluded' };
    }
  }

  return resolveVariant(flag, context);
}

function resolveVariant(flag, context) {
  if (!flag.variants || flag.variants.length === 0) {
    return { enabled: true, value: flag.defaultValue };
  }

  /* Deterministic variant assignment */
  const bucket = hashPercentage(`${flag.key}:variant`, context.userId || 'anon');
  let cumulative = 0;
  for (const v of flag.variants) {
    cumulative += v.weight;
    if (bucket < cumulative) {
      return { enabled: true, variant: v.key, value: v.config };
    }
  }
  return { enabled: true, variant: flag.variants[0].key, value: flag.variants[0].config };
}

/**
 * Quick boolean check — convenience wrapper.
 */
async function isEnabled(key, context = {}) {
  const result = await evaluateFlag(key, context);
  return result.enabled;
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Flag Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getFlagDashboard() {
  const [flags, recentChanges] = await Promise.all([
    DDDFeatureFlag.find({ isDeleted: { $ne: true } }).lean(),
    DDDFlagAudit.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const byCategory = {};
  let enabledCount = 0;
  for (const f of flags) {
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    if (f.enabled) enabledCount++;
  }

  return {
    totalFlags: flags.length,
    enabledFlags: enabledCount,
    disabledFlags: flags.length - enabledCount,
    byCategory,
    recentChanges: recentChanges.slice(0, 10),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createFeatureFlagRouter() {
  const router = Router();

  /* List flags */
  router.get('/feature-flags', async (req, res) => {
    try {
      const flags = await listFlags(req.query);
      res.json({ success: true, count: flags.length, flags });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Create flag */
  router.post('/feature-flags', async (req, res) => {
    try {
      const flag = await createFlag(req.body, req.user?._id);
      res.status(201).json({ success: true, flag });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Get single flag */
  router.get('/feature-flags/:key', async (req, res) => {
    try {
      const flag = await getFlag(req.params.key);
      if (!flag) return res.status(404).json({ success: false, error: 'Flag not found' });
      res.json({ success: true, flag });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Update flag */
  router.put('/feature-flags/:key', async (req, res) => {
    try {
      const flag = await updateFlag(req.params.key, req.body, req.user?._id, req.body.reason);
      res.json({ success: true, flag });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Delete flag */
  router.delete('/feature-flags/:key', async (req, res) => {
    try {
      await deleteFlag(req.params.key, req.user?._id);
      res.json({ success: true, message: 'Flag deleted' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Evaluate flag */
  router.post('/feature-flags/:key/evaluate', async (req, res) => {
    try {
      const result = await evaluateFlag(req.params.key, req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Seed defaults */
  router.post('/feature-flags/seed', async (_req, res) => {
    try {
      const result = await seedDefaultFlags();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Dashboard */
  router.get('/feature-flags-dashboard', async (_req, res) => {
    try {
      const dashboard = await getFlagDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Audit log */
  router.get('/feature-flags/:key/audit', async (req, res) => {
    try {
      const logs = await DDDFlagAudit.find({ flagKey: req.params.key, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json({ success: true, count: logs.length, logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDFeatureFlag,
  DDDFlagAudit,
  DEFAULT_FLAGS,
  seedDefaultFlags,
  createFlag,
  updateFlag,
  deleteFlag,
  getFlag,
  listFlags,
  evaluateFlag,
  isEnabled,
  hashPercentage,
  getFlagDashboard,
  createFeatureFlagRouter,
};
