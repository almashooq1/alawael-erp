'use strict';
/**
 * DddFeatureFlags Model
 * Auto-extracted from services/dddFeatureFlags.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDFeatureFlag,
  DDDFlagAudit,
};
