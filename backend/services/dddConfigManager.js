'use strict';

/**
 * DDD Config Manager
 * ═══════════════════════════════════════════════════════════════════════
 * Centralized, versioned, environment-aware configuration management
 * for all DDD platform modules. MongoDB-backed with audit trail.
 *
 * Features:
 *  - Hierarchical config: system → branch → domain → user
 *  - Version history for every change
 *  - Environment-aware (development, staging, production)
 *  - Bulk config import/export
 *  - Config validation with schema
 *  - Encrypted secrets storage
 *  - Per-domain default configurations
 *  - Config diff & rollback
 *
 * @module dddConfigManager
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Router } = require('express');

const ENV = process.env.NODE_ENV || 'development';
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'ddd-platform-config-key-32chars!';

/* ═══════════════════════════════════════════════════════════════════════
   1. Config Entry Model
   ═══════════════════════════════════════════════════════════════════════ */
const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    scope: {
      type: String,
      enum: ['system', 'branch', 'domain', 'user'],
      default: 'system',
    },
    scopeId: { type: String, default: null }, // branchId, domain name, or userId
    environment: {
      type: String,
      enum: ['all', 'development', 'staging', 'production'],
      default: 'all',
    },

    /* Value */
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json', 'encrypted'],
      default: 'string',
    },

    /* Metadata */
    description: String,
    category: {
      type: String,
      enum: [
        'general',
        'clinical',
        'scheduling',
        'notifications',
        'integrations',
        'security',
        'ui',
        'reporting',
        'compliance',
      ],
      default: 'general',
    },
    tags: [String],
    isSecret: { type: Boolean, default: false },
    validation: {
      min: Number,
      max: Number,
      pattern: String,
      allowedValues: [mongoose.Schema.Types.Mixed],
    },

    /* Version */
    version: { type: Number, default: 1 },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

configSchema.index({ key: 1, scope: 1, scopeId: 1, environment: 1 }, { unique: true });
configSchema.index({ scope: 1, category: 1 });
configSchema.index({ tags: 1 });

const DDDConfig = mongoose.models.DDDConfig || mongoose.model('DDDConfig', configSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Config Version History
   ═══════════════════════════════════════════════════════════════════════ */
const configVersionSchema = new mongoose.Schema(
  {
    configId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDConfig',
      required: true,
      index: true,
    },
    key: { type: String, required: true },
    version: { type: Number, required: true },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: { type: mongoose.Schema.Types.ObjectId },
    reason: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

configVersionSchema.index({ configId: 1, version: -1 });

const DDDConfigVersion =
  mongoose.models.DDDConfigVersion || mongoose.model('DDDConfigVersion', configVersionSchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. Default DDD Configurations
   ═══════════════════════════════════════════════════════════════════════ */
const DEFAULT_CONFIGS = [
  /* Clinical */
  {
    key: 'clinical.session.defaultDurationMinutes',
    value: 45,
    valueType: 'number',
    category: 'clinical',
    description: 'Default therapy session duration (minutes)',
  },
  {
    key: 'clinical.session.maxDailyPerTherapist',
    value: 8,
    valueType: 'number',
    category: 'clinical',
    description: 'Max sessions per therapist per day',
  },
  {
    key: 'clinical.assessment.reassessmentIntervalDays',
    value: 90,
    valueType: 'number',
    category: 'clinical',
    description: 'Default reassessment interval (days)',
  },
  {
    key: 'clinical.goals.maxActivePerBeneficiary',
    value: 10,
    valueType: 'number',
    category: 'clinical',
    description: 'Max active goals per beneficiary',
  },
  {
    key: 'clinical.risk.highRiskThreshold',
    value: 75,
    valueType: 'number',
    category: 'clinical',
    description: 'Risk score threshold for high-risk classification',
  },
  {
    key: 'clinical.noshow.maxConsecutive',
    value: 3,
    valueType: 'number',
    category: 'clinical',
    description: 'Max consecutive no-shows before alert',
  },
  {
    key: 'clinical.discharge.readinessThreshold',
    value: 80,
    valueType: 'number',
    category: 'clinical',
    description: 'Percentage threshold for discharge readiness',
  },

  /* Scheduling */
  {
    key: 'scheduling.workingDays',
    value: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
    valueType: 'json',
    category: 'scheduling',
    description: 'Default working days',
  },
  {
    key: 'scheduling.workingHoursStart',
    value: '08:00',
    valueType: 'string',
    category: 'scheduling',
    description: 'Working hours start time',
  },
  {
    key: 'scheduling.workingHoursEnd',
    value: '16:00',
    valueType: 'string',
    category: 'scheduling',
    description: 'Working hours end time',
  },
  {
    key: 'scheduling.bufferMinutes',
    value: 15,
    valueType: 'number',
    category: 'scheduling',
    description: 'Buffer between sessions (minutes)',
  },

  /* Notifications */
  {
    key: 'notifications.email.enabled',
    value: true,
    valueType: 'boolean',
    category: 'notifications',
    description: 'Enable email notifications',
  },
  {
    key: 'notifications.sms.enabled',
    value: false,
    valueType: 'boolean',
    category: 'notifications',
    description: 'Enable SMS notifications',
  },
  {
    key: 'notifications.push.enabled',
    value: false,
    valueType: 'boolean',
    category: 'notifications',
    description: 'Enable push notifications',
  },
  {
    key: 'notifications.reminderHoursBefore',
    value: 24,
    valueType: 'number',
    category: 'notifications',
    description: 'Hours before appointment to send reminder',
  },

  /* Security */
  {
    key: 'security.session.timeoutMinutes',
    value: 30,
    valueType: 'number',
    category: 'security',
    description: 'Session timeout (minutes)',
  },
  {
    key: 'security.password.minLength',
    value: 8,
    valueType: 'number',
    category: 'security',
    description: 'Minimum password length',
  },
  {
    key: 'security.mfa.required',
    value: false,
    valueType: 'boolean',
    category: 'security',
    description: 'Require multi-factor authentication',
  },
  {
    key: 'security.audit.retentionDays',
    value: 365,
    valueType: 'number',
    category: 'security',
    description: 'Audit log retention (days)',
  },

  /* Compliance */
  {
    key: 'compliance.consent.requiredForAssessment',
    value: true,
    valueType: 'boolean',
    category: 'compliance',
    description: 'Require consent before clinical assessment',
  },
  {
    key: 'compliance.dataRetention.defaultDays',
    value: 2555,
    valueType: 'number',
    category: 'compliance',
    description: 'Default data retention (7 years)',
  },
  {
    key: 'compliance.anonymization.enableAutoAnon',
    value: false,
    valueType: 'boolean',
    category: 'compliance',
    description: 'Auto-anonymize expired records',
  },

  /* Reporting */
  {
    key: 'reporting.defaultFormat',
    value: 'pdf',
    valueType: 'string',
    category: 'reporting',
    description: 'Default report export format',
  },
  {
    key: 'reporting.maxExportRows',
    value: 10000,
    valueType: 'number',
    category: 'reporting',
    description: 'Max rows in a single export',
  },
  {
    key: 'reporting.kpi.refreshIntervalMinutes',
    value: 60,
    valueType: 'number',
    category: 'reporting',
    description: 'KPI dashboard refresh interval',
  },

  /* UI */
  {
    key: 'ui.defaultLocale',
    value: 'ar-SA',
    valueType: 'string',
    category: 'ui',
    description: 'Default UI locale',
  },
  {
    key: 'ui.theme',
    value: 'light',
    valueType: 'string',
    category: 'ui',
    description: 'Default UI theme (light/dark)',
  },
  {
    key: 'ui.pageSize',
    value: 25,
    valueType: 'number',
    category: 'ui',
    description: 'Default items per page',
  },
  {
    key: 'ui.dateFormat',
    value: 'DD/MM/YYYY',
    valueType: 'string',
    category: 'ui',
    description: 'Default date format',
  },
  {
    key: 'ui.rtl',
    value: true,
    valueType: 'boolean',
    category: 'ui',
    description: 'Right-to-left layout',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. Encryption helpers
   ═══════════════════════════════════════════════════════════════════════ */
function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText) {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Config Operations
   ═══════════════════════════════════════════════════════════════════════ */
async function seedDefaults() {
  let created = 0;
  for (const def of DEFAULT_CONFIGS) {
    const exists = await DDDConfig.findOne({ key: def.key, scope: 'system', environment: 'all' });
    if (!exists) {
      await DDDConfig.create({ ...def, scope: 'system', environment: 'all' });
      created++;
    }
  }
  return { created, total: DEFAULT_CONFIGS.length };
}

async function setConfig(key, value, options = {}) {
  const scope = options.scope || 'system';
  const scopeId = options.scopeId || null;
  const environment = options.environment || 'all';

  const existing = await DDDConfig.findOne({
    key,
    scope,
    scopeId,
    environment,
    isDeleted: { $ne: true },
  });

  let finalValue = value;
  if (options.isSecret) {
    finalValue = encrypt(JSON.stringify(value));
  }

  if (existing) {
    /* Create version */
    await DDDConfigVersion.create({
      configId: existing._id,
      key,
      version: existing.version,
      previousValue: existing.isSecret ? '[ENCRYPTED]' : existing.value,
      newValue: options.isSecret ? '[ENCRYPTED]' : value,
      changedBy: options.changedBy,
      reason: options.reason,
    });

    const updated = await DDDConfig.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          value: finalValue,
          valueType: options.valueType || existing.valueType,
          isSecret: options.isSecret ?? existing.isSecret,
          lastModifiedBy: options.changedBy,
          description: options.description || existing.description,
          category: options.category || existing.category,
        },
        $inc: { version: 1 },
      },
      { new: true }
    ).lean();
    return updated;
  }

  return DDDConfig.create({
    key,
    value: finalValue,
    scope,
    scopeId,
    environment,
    valueType: options.valueType || 'string',
    isSecret: options.isSecret || false,
    description: options.description,
    category: options.category || 'general',
    tags: options.tags,
    lastModifiedBy: options.changedBy,
  });
}

/**
 * Get a config value with hierarchical resolution:
 * user → branch → domain → system (environment-specific → all)
 */
async function getConfig(key, context = {}) {
  const scopes = [];

  if (context.userId) scopes.push({ scope: 'user', scopeId: String(context.userId) });
  if (context.branchId) scopes.push({ scope: 'branch', scopeId: String(context.branchId) });
  if (context.domain) scopes.push({ scope: 'domain', scopeId: context.domain });
  scopes.push({ scope: 'system', scopeId: null });

  for (const s of scopes) {
    /* Try environment-specific first, then 'all' */
    for (const env of [ENV, 'all']) {
      const config = await DDDConfig.findOne({
        key,
        scope: s.scope,
        scopeId: s.scopeId,
        environment: env,
        isDeleted: { $ne: true },
      }).lean();

      if (config) {
        if (config.isSecret && config.valueType === 'encrypted') {
          const decrypted = decrypt(config.value);
          return decrypted ? JSON.parse(decrypted) : config.value;
        }
        return config.value;
      }
    }
  }

  return undefined;
}

async function getConfigFull(key, context = {}) {
  const value = await getConfig(key, context);
  const config = await DDDConfig.findOne({ key, isDeleted: { $ne: true } }).lean();
  return config ? { ...config, resolvedValue: value } : null;
}

async function listConfigs(filter = {}) {
  const query = { isDeleted: { $ne: true } };
  if (filter.scope) query.scope = filter.scope;
  if (filter.category) query.category = filter.category;
  if (filter.environment) query.environment = filter.environment;
  if (filter.scopeId) query.scopeId = filter.scopeId;

  const configs = await DDDConfig.find(query).sort({ key: 1 }).lean();
  return configs.map(c => ({
    ...c,
    value: c.isSecret ? '[ENCRYPTED]' : c.value,
  }));
}

async function getConfigVersions(key) {
  const config = await DDDConfig.findOne({ key, isDeleted: { $ne: true } }).lean();
  if (!config) return [];
  return DDDConfigVersion.find({ configId: config._id, isDeleted: { $ne: true } })
    .sort({ version: -1 })
    .limit(50)
    .lean();
}

async function rollbackConfig(key, targetVersion, changedBy) {
  const config = await DDDConfig.findOne({ key, isDeleted: { $ne: true } });
  if (!config) throw new Error(`Config not found: ${key}`);

  const versionDoc = await DDDConfigVersion.findOne({
    configId: config._id,
    version: targetVersion,
  });
  if (!versionDoc) throw new Error(`Version ${targetVersion} not found for ${key}`);

  return setConfig(key, versionDoc.previousValue, {
    scope: config.scope,
    scopeId: config.scopeId,
    environment: config.environment,
    changedBy,
    reason: `Rollback to version ${targetVersion}`,
  });
}

async function deleteConfig(key, scope = 'system', scopeId = null) {
  return DDDConfig.findOneAndUpdate(
    { key, scope, scopeId, isDeleted: { $ne: true } },
    { $set: { isDeleted: true } }
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Bulk Operations
   ═══════════════════════════════════════════════════════════════════════ */
async function exportConfigs(scope = 'system') {
  const configs = await DDDConfig.find({ scope, isDeleted: { $ne: true } }).lean();
  return configs.map(c => ({
    key: c.key,
    value: c.isSecret ? '[ENCRYPTED]' : c.value,
    valueType: c.valueType,
    category: c.category,
    description: c.description,
    environment: c.environment,
    isSecret: c.isSecret,
  }));
}

async function importConfigs(configs, options = {}) {
  let imported = 0;
  for (const c of configs) {
    if (c.isSecret && c.value === '[ENCRYPTED]') continue; // skip encrypted
    await setConfig(c.key, c.value, {
      scope: options.scope || 'system',
      scopeId: options.scopeId,
      environment: c.environment || 'all',
      valueType: c.valueType,
      category: c.category,
      description: c.description,
      changedBy: options.changedBy,
      reason: 'Bulk import',
    });
    imported++;
  }
  return { imported, total: configs.length };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Config Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getConfigDashboard() {
  const [configs, versions] = await Promise.all([
    DDDConfig.find({ isDeleted: { $ne: true } }).lean(),
    DDDConfigVersion.countDocuments({ isDeleted: { $ne: true } }),
  ]);

  const byScope = {};
  const byCategory = {};
  for (const c of configs) {
    byScope[c.scope] = (byScope[c.scope] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }

  return {
    totalConfigs: configs.length,
    totalVersions: versions,
    byScope,
    byCategory,
    secretCount: configs.filter(c => c.isSecret).length,
    defaultCount: DEFAULT_CONFIGS.length,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createConfigRouter() {
  const router = Router();

  /* List configs */
  router.get('/configs', async (req, res) => {
    try {
      const configs = await listConfigs(req.query);
      res.json({ success: true, count: configs.length, configs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Get single config (with hierarchical resolution) */
  router.get('/configs/:key(*)', async (req, res) => {
    try {
      const config = await getConfigFull(req.params.key, {
        userId: req.user?._id,
        branchId: req.headers['x-branch-id'],
        domain: req.query.domain,
      });
      if (!config) return res.status(404).json({ success: false, error: 'Config not found' });
      res.json({ success: true, config });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Set config */
  router.put('/configs/:key(*)', async (req, res) => {
    try {
      const config = await setConfig(req.params.key, req.body.value, {
        ...req.body,
        changedBy: req.user?._id,
      });
      res.json({ success: true, config });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Delete config */
  router.delete('/configs/:key(*)', async (req, res) => {
    try {
      await deleteConfig(req.params.key, req.query.scope, req.query.scopeId);
      res.json({ success: true, message: 'Config deleted' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Version history */
  router.get('/configs/:key(*)/versions', async (req, res) => {
    try {
      const versions = await getConfigVersions(req.params.key);
      res.json({ success: true, count: versions.length, versions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Rollback */
  router.post('/configs/:key(*)/rollback', async (req, res) => {
    try {
      const config = await rollbackConfig(req.params.key, req.body.targetVersion, req.user?._id);
      res.json({ success: true, config });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Seed defaults */
  router.post('/configs-seed', async (_req, res) => {
    try {
      const result = await seedDefaults();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Bulk export */
  router.get('/configs-export', async (req, res) => {
    try {
      const data = await exportConfigs(req.query.scope);
      res.json({ success: true, count: data.length, configs: data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Bulk import */
  router.post('/configs-import', async (req, res) => {
    try {
      const result = await importConfigs(req.body.configs, {
        changedBy: req.user?._id,
        scope: req.body.scope,
        scopeId: req.body.scopeId,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Dashboard */
  router.get('/configs-dashboard', async (_req, res) => {
    try {
      const dashboard = await getConfigDashboard();
      res.json({ success: true, ...dashboard });
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
  DDDConfig,
  DDDConfigVersion,
  DEFAULT_CONFIGS,
  seedDefaults,
  setConfig,
  getConfig,
  getConfigFull,
  listConfigs,
  getConfigVersions,
  rollbackConfig,
  deleteConfig,
  exportConfigs,
  importConfigs,
  getConfigDashboard,
  encrypt,
  decrypt,
  createConfigRouter,
};
