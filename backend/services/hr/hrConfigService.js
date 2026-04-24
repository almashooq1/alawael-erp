'use strict';

/**
 * hrConfigService.js — Phase 11 Commit 32 (4.0.49).
 *
 * Runtime inspector for the HR stack's effective configuration.
 * Surfaces every threshold / feature flag / env-derived knob so
 * ops can answer "what's actually running right now?" without
 * grepping env files or reading source.
 *
 * Covers:
 *
 *   anomaly detection (C19, C23)
 *   audit retention (C27, C31)
 *   health check thresholds (C30)
 *   scheduler bootstrap (C23)
 *   approval workflow gate (C11)
 *
 * Design decisions:
 *
 *   1. Single immutable snapshot. `getConfig()` returns a
 *      one-shot view; repeated calls re-evaluate env. Exactly
 *      what ops wants — restart the process to pick up env
 *      changes, and the new values show up on the next GET.
 *
 *   2. Each section declares `source: 'env' | 'default'` per
 *      knob. Ops can tell at a glance whether a value came
 *      from an explicit env var or a library default.
 *
 *   3. Never reads from the DB. Config is about the PROCESS's
 *      state, not the persisted state. Metrics endpoint (C26)
 *      already handles DB-state reporting.
 *
 *   4. Boolean feature flags use `FEATURE_FLAG !== 'false'` as
 *      the enable check — matches the convention from server.js
 *      (e.g. `REPORTING_PLATFORM_ENABLED`, `HR_ANOMALY_SCHEDULER_ENABLED`).
 *      Default-on: missing env var → enabled.
 */

function envOr(name, fallback, parse = v => v) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return { value: parse(fallback), source: 'default', raw: null };
  }
  try {
    return { value: parse(raw), source: 'env', raw };
  } catch {
    return { value: parse(fallback), source: 'default', raw };
  }
}

function parseInt10(v) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) throw new Error('not a number');
  return n;
}

function parseBoolFeatureFlag(v, defaultWhenAbsent = true) {
  const raw = process.env[v];
  if (raw === undefined || raw === '') {
    return { value: defaultWhenAbsent, source: 'default', raw: null };
  }
  return { value: raw !== 'false', source: 'env', raw };
}

function createHrConfigService(deps = {}) {
  // Phase-11 ships no config-only models; deps are optional info
  // channels for future extensions.
  const buildInfo = deps.buildInfo || {};

  function getAnomalyDetectionConfig() {
    return {
      scheduler_enabled: parseBoolFeatureFlag('HR_ANOMALY_SCHEDULER_ENABLED'),
      interval_ms: envOr('HR_ANOMALY_INTERVAL_MS', 15 * 60 * 1000, parseInt10),
      window_minutes: envOr('HR_ANOMALY_WINDOW_MINUTES', 60, parseInt10),
      reads_per_hour_threshold: envOr('HR_ANOMALY_READS_PER_HOUR', 100, parseInt10),
      exports_per_day_threshold: envOr('HR_ANOMALY_EXPORTS_PER_DAY', 5, parseInt10),
      cooldown_minutes: envOr('HR_ANOMALY_COOLDOWN_MINUTES', 60, parseInt10),
    };
  }

  function getRetentionConfig() {
    return {
      archive_after_days: envOr('HR_AUDIT_ARCHIVE_AFTER_DAYS', 365, parseInt10),
      purge_after_days: envOr('HR_AUDIT_PURGE_AFTER_DAYS', 1095, parseInt10),
      batch_size: envOr('HR_AUDIT_BATCH_SIZE', 1000, parseInt10),
      adaptive: {
        baseline_archive_after_days: 365,
        warning_threshold_rows: 500_000,
        ceiling_threshold_rows: 1_000_000,
        tighten_warning_factor: 0.8,
        tighten_ceiling_factor: 0.6,
        floor_days: 180,
        source: 'default',
      },
    };
  }

  function getHealthConfig() {
    return {
      scheduler_stale_after_ms: {
        value: 2 * 60 * 60 * 1000,
        source: 'default',
      },
      hot_log_ceiling_rows: { value: 1_000_000, source: 'default' },
      hot_log_warning_rows: { value: 500_000, source: 'default' },
      change_request_queue_warning: { value: 50, source: 'default' },
      change_request_queue_critical: { value: 200, source: 'default' },
      anomaly_queue_warning: { value: 20, source: 'default' },
      anomaly_queue_critical: { value: 100, source: 'default' },
    };
  }

  function getRetentionPoliciesConfig() {
    try {
      const {
        resolveActivePolicies,
        POLICIES: DEFAULT_POLICIES,
      } = require('../../config/hr-retention-policies');
      const active = resolveActivePolicies();
      return {
        source: active.source,
        fallback: active.fallback || null,
        policy_count: active.policies.length,
        default_policy_count: DEFAULT_POLICIES.length,
        policies: active.policies.map(p => ({
          tag: p.tag,
          label: p.label || null,
          archive_after_days: p.archiveAfterDays,
          purge_after_days: p.purgeAfterDays,
          priority: p.priority || 100,
        })),
      };
    } catch (err) {
      return { source: 'unavailable', error: err.message };
    }
  }

  function getApprovalConfig() {
    // Rules are code-level (hr-approval-rules.js); expose their ids
    // so ops can correlate with change_request.rules_triggered.
    try {
      const { RULES } = require('../../config/hr-approval-rules');
      return {
        rules_count: RULES.length,
        rule_ids: RULES.map(r => r.id),
        source: 'code',
      };
    } catch {
      return {
        rules_count: 0,
        rule_ids: [],
        source: 'unavailable',
      };
    }
  }

  function getConfig() {
    return {
      generated_at: new Date().toISOString(),
      build: {
        node_env: process.env.NODE_ENV || 'development',
        version: buildInfo.version || null,
        commit: buildInfo.commit || null,
      },
      sections: {
        anomaly_detection: getAnomalyDetectionConfig(),
        retention: getRetentionConfig(),
        retention_policies: getRetentionPoliciesConfig(),
        health: getHealthConfig(),
        approval: getApprovalConfig(),
      },
    };
  }

  return Object.freeze({ getConfig });
}

module.exports = { createHrConfigService };
