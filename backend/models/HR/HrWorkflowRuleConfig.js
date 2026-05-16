'use strict';

/**
 * HrWorkflowRuleConfig.js — Phase 30 follow-up.
 *
 * Per-rule overrides for the HR Workflow Engine. The engine ships with
 * sensible defaults in code (BUILT_IN_RULES). Admins can override two
 * things at runtime, persisted here:
 *
 *   • enabled    — kill switch to silence a rule without code change
 *   • params     — sparse object that merges OVER the rule's default
 *                  params (e.g. tighten thresholdHours from 48 → 24)
 *
 * The engine reads this collection at boot + (cheaply) on every run.
 * One document per ruleId. Missing documents = use defaults.
 *
 * Out of scope (deliberate):
 *   • Composite rules / DSL
 *   • Per-branch overrides
 *   • Conditional schedules (e.g. only weekdays)
 * Add them when the operational need is concrete.
 */

const mongoose = require('mongoose');

const HrWorkflowRuleConfigSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      required: true,
      unique: true,
      // The engine validates this against BUILT_IN_RULES; we keep the
      // model permissive so a future rule rename doesn't lock historical
      // overrides out of the system.
      trim: true,
      maxlength: 80,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Audit fields
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByName: { type: String, default: null },
    notes: { type: String, maxlength: 500, default: null },
  },
  {
    timestamps: true,
    collection: 'hr_workflow_rule_configs',
  }
);

// Static: load everything into a Map<ruleId, {enabled, params}> for the engine.
HrWorkflowRuleConfigSchema.statics.loadAsConfigMap = async function loadAsConfigMap() {
  const rows = await this.find({}).lean();
  const out = {};
  for (const r of rows) {
    out[r.ruleId] = {
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
      params: r.params || {},
    };
  }
  return out;
};

module.exports =
  mongoose.models.HrWorkflowRuleConfig ||
  mongoose.model('HrWorkflowRuleConfig', HrWorkflowRuleConfigSchema);
