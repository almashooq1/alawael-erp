'use strict';

/**
 * hr-approval-rules.js — Phase 11 Commit 11 (4.0.28).
 *
 * Classifier: given a validated admin patch + the existing Employee
 * record, return the list of rules that trigger a second-signature
 * requirement. Empty list → apply directly. Non-empty → route to
 * `HrChangeRequest.pending`.
 *
 * Each rule has:
 *   id            — stable string for audit + UI labels
 *   label         — short humanised description
 *   matcher(ctx)  — pure function returning boolean
 *
 * Rules are DATA, not code. Adding a rule is a one-entry edit.
 *
 * Why config-level, not inside the service: keeping rules here
 * means future commits can add approval surfaces (contract
 * amendments, leave > N days, SCFHS license corrections) without
 * touching the service layer at all.
 */

const SALARY_PCT_THRESHOLD = 15; // %
const COMPENSATION_FIELDS = [
  'basic_salary',
  'housing_allowance',
  'transport_allowance',
  'other_allowances',
];

function getField(obj, path) {
  if (!obj) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

const RULES = Object.freeze([
  {
    id: 'salary.increase_gt_15pct',
    label: 'Salary increase exceeds 15% vs current',
    matcher({ patch, existing }) {
      if (!Object.prototype.hasOwnProperty.call(patch, 'basic_salary')) return false;
      const current = Number(existing.basic_salary) || 0;
      const proposed = Number(patch.basic_salary) || 0;
      if (current <= 0) return proposed > 0; // new salary on zero baseline
      const delta = ((proposed - current) / current) * 100;
      return delta > SALARY_PCT_THRESHOLD;
    },
  },
  {
    id: 'salary.decrease_any',
    label: 'Salary decrease (any magnitude)',
    matcher({ patch, existing }) {
      if (!Object.prototype.hasOwnProperty.call(patch, 'basic_salary')) return false;
      const current = Number(existing.basic_salary) || 0;
      const proposed = Number(patch.basic_salary) || 0;
      return proposed < current;
    },
  },
  {
    id: 'employment.termination',
    label: 'Employment termination',
    matcher({ patch }) {
      return patch.status === 'terminated';
    },
  },
  {
    id: 'employment.suspension',
    label: 'Employment suspension',
    matcher({ patch }) {
      return patch.status === 'suspended';
    },
  },
  {
    id: 'employment.branch_transfer',
    label: 'Branch transfer',
    matcher({ patch, existing }) {
      if (!Object.prototype.hasOwnProperty.call(patch, 'branch_id')) return false;
      const current = existing.branch_id ? String(existing.branch_id) : null;
      const proposed = patch.branch_id ? String(patch.branch_id) : null;
      return proposed != null && proposed !== current;
    },
  },
  {
    id: 'identity.national_id_change',
    label: 'National ID / Iqama change on existing record',
    matcher({ patch, existing }) {
      const fields = ['national_id', 'iqama_number', 'passport_number'];
      for (const f of fields) {
        if (!Object.prototype.hasOwnProperty.call(patch, f)) continue;
        const before = existing[f];
        const after = patch[f];
        // Setting a previously-empty ID is data-entry, not a change.
        // Changing an existing non-empty ID to a different non-empty
        // value is the compliance case that needs approval.
        if (before && after && String(before) !== String(after)) return true;
      }
      return false;
    },
  },
  {
    id: 'compensation.material_allowance_change',
    label: 'Allowance bump exceeds 20% vs current',
    matcher({ patch, existing }) {
      for (const f of ['housing_allowance', 'transport_allowance']) {
        if (!Object.prototype.hasOwnProperty.call(patch, f)) continue;
        const current = Number(existing[f]) || 0;
        const proposed = Number(patch[f]) || 0;
        if (current <= 0) continue;
        const delta = ((proposed - current) / current) * 100;
        if (Math.abs(delta) > 20) return true;
      }
      return false;
    },
  },
]);

/**
 * Given a proposed flat patch + the existing Employee record, return
 * the list of triggered rule ids. Empty array = no approval needed.
 */
function detectTriggeredRules({ patch, existing }) {
  if (!patch || !existing) return [];
  const triggered = [];
  for (const rule of RULES) {
    try {
      if (rule.matcher({ patch, existing })) triggered.push(rule.id);
    } catch {
      // Defensive: a rule that throws is a code bug — skip it rather
      // than failing the entire PATCH request. The unit tests ensure
      // rules are well-formed.
    }
  }
  return triggered;
}

/**
 * Given a rule id, return the rule record. Used by the service to
 * render human-readable reasons in audit events + API responses.
 */
function findRule(id) {
  return RULES.find(r => r.id === id) || null;
}

module.exports = {
  RULES,
  SALARY_PCT_THRESHOLD,
  COMPENSATION_FIELDS,
  detectTriggeredRules,
  findRule,
};
