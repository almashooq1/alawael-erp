'use strict';

/**
 * hr-retention-policies.js — Phase 11 Commit 33 (4.0.50).
 *
 * Declarative retention policy per HR sub-tag. Covers the reality
 * that different HR event classes carry different regulatory +
 * forensic weight:
 *
 *   hr:anomaly         — security signals, CBAHI + external
 *                        auditors want 2 years before archive,
 *                        6 years before purge (long tail).
 *
 *   hr:change_request  — governance decisions, Saudi Labor Law
 *                        expects 1 year operational + 3 years
 *                        retained. Same as default (365/1095).
 *
 *   hr:dashboard       — operational reads, not audit-critical.
 *                        Tighter archive (180d) + standard 3y
 *                        purge. High-volume, low-evidence-weight.
 *
 *   hr:employee        — routine CRUD events. Default 365/1095.
 *
 *   hr:self_service    — `/me` DSAR reads. Default 365/1095 —
 *                        the subject has a PDPL-mandated right
 *                        to the full retention window.
 *
 * Design decisions:
 *
 *   1. Frozen config — ops who need different numbers fork the
 *      file or override via an env-driven loader in a future
 *      commit. Not runtime-mutable.
 *
 *   2. Policies are IN ADDITION to the existing baseline (`hr`
 *      tag alone). The baseline continues to run when --by-tag
 *      is not passed. Per-tag mode walks this map in order.
 *
 *   3. Every policy must have BOTH `archiveAfterDays` and
 *      `purgeAfterDays`, with purge > archive. Shape test
 *      enforces the invariant.
 *
 *   4. The `priority` field (optional, default 100) controls
 *      processing order when the CLI runs. Higher priority runs
 *      first — lets anomaly archival happen before generic
 *      access-log archival so storage-pressure situations clear
 *      the low-value backlog first.
 */

const POLICIES = Object.freeze([
  {
    tag: 'hr:anomaly',
    label: 'Security anomalies',
    archiveAfterDays: 730, // 2 years
    purgeAfterDays: 2190, // 6 years
    priority: 10,
    rationale: 'Security signals — CBAHI + auditor retention expectation is 2y+6y',
  },
  {
    tag: 'hr:change_request',
    label: 'Approval-workflow events',
    archiveAfterDays: 365,
    purgeAfterDays: 1095,
    priority: 20,
    rationale: 'Governance decisions — Saudi Labor Law expects 1y operational + 3y retention',
  },
  {
    tag: 'hr:employee',
    label: 'Employee CRUD events',
    archiveAfterDays: 365,
    purgeAfterDays: 1095,
    priority: 50,
    rationale: 'Routine employee record changes + PATCH events',
  },
  {
    tag: 'hr:dashboard',
    label: 'Dashboard read events',
    archiveAfterDays: 180,
    purgeAfterDays: 1095,
    priority: 90,
    rationale: 'High-volume operational reads; tighter archive',
  },
  {
    tag: 'hr:self_service',
    label: 'Employee self-service reads',
    archiveAfterDays: 365,
    purgeAfterDays: 1095,
    priority: 60,
    rationale: 'PDPL Art. 18 — subject has access to full retention window',
  },
]);

function byTag(tag) {
  return POLICIES.find(p => p.tag === tag) || null;
}

function sortedByPriority() {
  return [...POLICIES].sort((a, b) => (a.priority || 100) - (b.priority || 100));
}

/**
 * Phase-11 C36 — validate a policy array shape. Returns
 * { ok: true, policies } or { ok: false, error }.
 */
function validatePolicies(arr) {
  if (!Array.isArray(arr)) return { ok: false, error: 'must be an array' };
  if (arr.length === 0) return { ok: false, error: 'must be non-empty' };
  const seenTags = new Set();
  for (const p of arr) {
    if (!p || typeof p !== 'object') return { ok: false, error: 'entry must be an object' };
    if (typeof p.tag !== 'string' || p.tag.length === 0) {
      return { ok: false, error: 'entry missing valid tag' };
    }
    if (seenTags.has(p.tag)) return { ok: false, error: `duplicate tag: ${p.tag}` };
    seenTags.add(p.tag);
    if (
      typeof p.archiveAfterDays !== 'number' ||
      p.archiveAfterDays <= 0 ||
      !Number.isFinite(p.archiveAfterDays)
    ) {
      return { ok: false, error: `${p.tag}: invalid archiveAfterDays` };
    }
    if (
      typeof p.purgeAfterDays !== 'number' ||
      p.purgeAfterDays <= 0 ||
      !Number.isFinite(p.purgeAfterDays)
    ) {
      return { ok: false, error: `${p.tag}: invalid purgeAfterDays` };
    }
    if (p.purgeAfterDays <= p.archiveAfterDays) {
      return {
        ok: false,
        error: `${p.tag}: purgeAfterDays must be > archiveAfterDays`,
      };
    }
  }
  return { ok: true, policies: arr };
}

/**
 * Phase-11 C36 — resolve the active policy set at runtime. Reads
 * HR_RETENTION_POLICY_JSON env var; on parse or validation failure,
 * falls back to the frozen POLICIES array and surfaces the error
 * via the returned `fallback` object (caller logs it). NEVER throws.
 */
function resolveActivePolicies(envValue) {
  const raw = envValue === undefined ? process.env.HR_RETENTION_POLICY_JSON : envValue;
  if (raw === undefined || raw === null || raw === '') {
    return { policies: sortedByPriority(), source: 'default' };
  }
  try {
    const parsed = JSON.parse(raw);
    const validation = validatePolicies(parsed);
    if (!validation.ok) {
      return {
        policies: sortedByPriority(),
        source: 'default',
        fallback: { reason: 'validation_failed', error: validation.error },
      };
    }
    return {
      policies: [...validation.policies].sort((a, b) => (a.priority || 100) - (b.priority || 100)),
      source: 'env',
    };
  } catch (err) {
    return {
      policies: sortedByPriority(),
      source: 'default',
      fallback: { reason: 'parse_failed', error: err.message },
    };
  }
}

module.exports = {
  POLICIES,
  byTag,
  sortedByPriority,
  validatePolicies,
  resolveActivePolicies,
};
