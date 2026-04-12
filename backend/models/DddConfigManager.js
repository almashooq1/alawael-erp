'use strict';
/**
 * DddConfigManager Model
 * Auto-extracted from services/dddConfigManager.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDConfig,
  DDDConfigVersion,
};
