'use strict';

/**
 * golden-thread-enforcement.lib.js — W1204 (Blueprint 43, R3: الإلزام في الواجهة)
 *
 * Pure decision library for the golden-thread interface gate:
 *   - "لا هدف بلا مقياس"  — a therapeutic goal without at least one linked
 *     measure is rejected at the API boundary.
 *   - "لا جلسة بلا هدف"   — a clinical session cannot be COMPLETED without at
 *     least one goalProgress entry referencing a goal.
 *
 * Enforcement is deliberately gated at the ROUTE layer, not the model layer:
 * legacy documents, sweepers and migrations must keep saving. The gate has
 * three modes, read LAZILY from process.env (Phase-27 doctrine — no top-level
 * env reads):
 *
 *   GOLDEN_THREAD_ENFORCEMENT=off      (default) — gate is inert.
 *   GOLDEN_THREAD_ENFORCEMENT=warn     — request proceeds; violations are
 *                                        returned in the response envelope
 *                                        (`goldenThread.warnings`) so the UI
 *                                        can surface them during rollout.
 *   GOLDEN_THREAD_ENFORCEMENT=enforce  — request is rejected with HTTP 422 +
 *                                        code GOLDEN_THREAD_VIOLATION.
 *
 * Rollout recipe (mirrors BRANCH_SCOPE_FAIL_CLOSED): run `warn` in prod, watch
 * the violation counts via GET /golden-thread/enforcement-status + logs, then
 * flip to `enforce` once the caseload-attention queue (W1167) drains.
 *
 * Pure functions only — no DB, no HTTP. Callers wire the result to responses.
 */

const MODES = Object.freeze(['off', 'warn', 'enforce']);

const VIOLATION_CODES = Object.freeze({
  GOAL_WITHOUT_MEASURE: 'GOAL_WITHOUT_MEASURE',
  SESSION_WITHOUT_GOAL: 'SESSION_WITHOUT_GOAL',
});

const VIOLATION_MESSAGES = Object.freeze({
  GOAL_WITHOUT_MEASURE: Object.freeze({
    ar: 'لا هدف بلا مقياس — يجب ربط الهدف بمقياس واحد على الأقل (measureLinks / linkedMeasures)',
    en: 'No goal without a measure — the goal must link at least one measurement instrument (measureLinks / linkedMeasures)',
  }),
  SESSION_WITHOUT_GOAL: Object.freeze({
    ar: 'لا جلسة بلا هدف — لا يمكن إتمام الجلسة دون توثيق تقدّم هدف واحد على الأقل (goalProgress[].goalId)',
    en: 'No session without a goal — the session cannot be completed without at least one goalProgress entry referencing a goal',
  }),
});

/** HTTP envelope code used by every gate rejection (stable for the UI). */
const GATE_ERROR_CODE = 'GOLDEN_THREAD_VIOLATION';

/**
 * Lazily resolve the enforcement mode from the environment.
 * Unknown values degrade to 'off' (fail-safe: never brick writes on a typo).
 * @returns {'off'|'warn'|'enforce'}
 */
function enforcementMode(env = process.env) {
  const raw = String(env.GOLDEN_THREAD_ENFORCEMENT || 'off')
    .trim()
    .toLowerCase();
  return MODES.includes(raw) ? raw : 'off';
}

/**
 * Count measure links in a goal payload across every accepted shape:
 *  - objectives[].measureLinks[]   (canonical TherapeuticGoal W235 shape)
 *  - linkedMeasures[]              (models/Goal.js W1090 shape; also used by
 *                                   embedded care-plan goals)
 *  - measureLinks[]                (flat fallback some clients send)
 * Entries without a measure id are not counted (refuse-to-fabricate).
 */
function countGoalMeasureLinks(body) {
  if (!body || typeof body !== 'object') return 0;
  let count = 0;
  const countArray = arr => {
    if (!Array.isArray(arr)) return;
    for (const link of arr) {
      if (link && typeof link === 'object' && (link.measureId || link.measure || link.instrumentId))
        count += 1;
    }
  };
  if (Array.isArray(body.objectives)) {
    for (const obj of body.objectives) {
      if (obj && typeof obj === 'object') countArray(obj.measureLinks);
    }
  }
  countArray(body.linkedMeasures);
  countArray(body.measureLinks);
  return count;
}

/**
 * Count goal references in a session-completion payload
 * (goalProgress[].goalId — the canonical W1149 linkage).
 */
function countSessionGoalRefs(completionData) {
  if (!completionData || typeof completionData !== 'object') return 0;
  const arr = completionData.goalProgress;
  if (!Array.isArray(arr)) return 0;
  let count = 0;
  for (const entry of arr) {
    if (entry && typeof entry === 'object' && entry.goalId) count += 1;
  }
  return count;
}

/** @returns {{ok: boolean, violations: Array<{code:string,messageAr:string,messageEn:string}>}} */
function checkGoalPayload(body) {
  const violations = [];
  if (countGoalMeasureLinks(body) === 0) {
    violations.push({
      code: VIOLATION_CODES.GOAL_WITHOUT_MEASURE,
      messageAr: VIOLATION_MESSAGES.GOAL_WITHOUT_MEASURE.ar,
      messageEn: VIOLATION_MESSAGES.GOAL_WITHOUT_MEASURE.en,
    });
  }
  return { ok: violations.length === 0, violations };
}

/** @returns {{ok: boolean, violations: Array<{code:string,messageAr:string,messageEn:string}>}} */
function checkSessionCompletionPayload(completionData) {
  const violations = [];
  if (countSessionGoalRefs(completionData) === 0) {
    violations.push({
      code: VIOLATION_CODES.SESSION_WITHOUT_GOAL,
      messageAr: VIOLATION_MESSAGES.SESSION_WITHOUT_GOAL.ar,
      messageEn: VIOLATION_MESSAGES.SESSION_WITHOUT_GOAL.en,
    });
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Combine the env mode with a check result into a gate decision.
 * @returns {{action: 'pass'|'warn'|'reject', mode: string, violations: Array}}
 */
function evaluateGate(checkResult, env = process.env) {
  const mode = enforcementMode(env);
  if (mode === 'off' || checkResult.ok) {
    return { action: 'pass', mode, violations: [] };
  }
  return {
    action: mode === 'enforce' ? 'reject' : 'warn',
    mode,
    violations: checkResult.violations,
  };
}

/**
 * Build the stable 422 rejection envelope. Routes spread this into res.json.
 */
function rejectionEnvelope(violations) {
  return {
    success: false,
    code: GATE_ERROR_CODE,
    message: violations.map(v => v.messageAr).join(' · '),
    violations,
  };
}

module.exports = {
  MODES,
  VIOLATION_CODES,
  VIOLATION_MESSAGES,
  GATE_ERROR_CODE,
  enforcementMode,
  countGoalMeasureLinks,
  countSessionGoalRefs,
  checkGoalPayload,
  checkSessionCompletionPayload,
  evaluateGate,
  rejectionEnvelope,
};
