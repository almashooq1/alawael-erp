'use strict';

/**
 * care/psych.registry.js — Phase 17 Commit 5 (4.0.87).
 *
 * Three coordinated sub-vocabularies in one file:
 *
 *   1) PsychRiskFlag  — per-beneficiary urgent mental-health
 *      flags (suicidal ideation, self-harm, severe depression,
 *      psychotic symptoms, substance use, aggression, elopement
 *      risk, neglect risk). State machine: active → monitoring →
 *      resolved / archived, with an escape to escalated.
 *
 *   2) PsychScaleAssessment — standardized scored instruments:
 *      PHQ-9 (depression), GAD-7 (anxiety), DASS-21 (depression +
 *      anxiety + stress). Each scale has item count, min/max
 *      total scores, and threshold → interpretation bands, plus
 *      a `criticalFlagThreshold` that auto-fires a risk flag.
 *
 *   3) MdtMeeting — Multi-Disciplinary Team meetings combining
 *      psychologist + social worker + psychiatrist + care
 *      manager + (optionally) family. Lifecycle: scheduled →
 *      completed / cancelled / rescheduled.
 *
 * The three are linked in practice: a high PHQ-9 score fires a
 * risk flag; a critical flag convenes an MDT; an MDT decision
 * resolves the flag.
 */

// ── 1. Risk flags ───────────────────────────────────────────────────

const FLAG_TYPES = Object.freeze([
  'suicidal_ideation',
  'self_harm',
  'severe_depression',
  'psychotic_symptoms',
  'substance_use',
  'aggression',
  'elopement_risk',
  'neglect_risk',
  'severe_anxiety',
  'trauma_reaction',
  'other',
]);

const FLAG_SEVERITIES = Object.freeze(['low', 'moderate', 'high', 'critical']);

const FLAG_STATUSES = Object.freeze([
  'active', // newly raised, awaiting response
  'monitoring', // plan in place, under observation
  'escalated', // promoted to psychiatric emergency / MDT convened
  'resolved', // risk no longer present
  'archived', // historical — kept for audit
  'cancelled', // raised in error
]);

const FLAG_TERMINAL_STATUSES = Object.freeze(['resolved', 'archived', 'cancelled']);
const FLAG_PAUSE_STATUSES = Object.freeze([]); // risk flags never "pause" — always active or terminal

const FLAG_TRANSITIONS = Object.freeze({
  active: [
    { to: 'monitoring', event: 'plan_established', required: ['safetyPlan'] },
    { to: 'escalated', event: 'escalated', required: ['escalationReason'] },
    { to: 'resolved', event: 'resolved', required: ['resolutionNotes'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  monitoring: [
    { to: 'escalated', event: 'escalated', required: ['escalationReason'] },
    { to: 'resolved', event: 'resolved', required: ['resolutionNotes'] },
    { to: 'active', event: 'reopened', required: ['reopenReason'] },
  ],
  escalated: [
    { to: 'monitoring', event: 'de_escalated', required: ['safetyPlan'] },
    { to: 'resolved', event: 'resolved', required: ['resolutionNotes'] },
  ],
  resolved: [
    { to: 'archived', event: 'archived' },
    { to: 'active', event: 'reopened', required: ['reopenReason'] },
  ],
  archived: [],
  cancelled: [],
});

// SLA policy id — 1-hour response for critical flags, 24/7.
// Declared here; wired in sla.registry separately.
const CRITICAL_FLAG_SLA_ID = 'psych.risk_flag.response';

// ── 2. Scales ───────────────────────────────────────────────────────

/**
 * Each scale: itemCount, scoring range per item, total range,
 * interpretation bands [{ minScore, maxScore, label, action }],
 * criticalItemIndices (items that, if ≥ threshold, auto-fire a
 * risk flag regardless of total score — e.g., PHQ-9 item 9 on
 * suicidal ideation).
 */

const SCALES = Object.freeze({
  phq9: Object.freeze({
    code: 'phq9',
    labelEn: 'PHQ-9',
    labelAr: 'استبيان اكتئاب PHQ-9',
    itemCount: 9,
    itemMinScore: 0,
    itemMaxScore: 3,
    totalMin: 0,
    totalMax: 27,
    criticalItemIndices: Object.freeze([8]), // item 9 (0-indexed 8) = suicidal ideation
    criticalItemThreshold: 1, // any non-zero answer to item 9 → flag
    criticalFlagType: 'suicidal_ideation',
    bands: Object.freeze([
      { minScore: 0, maxScore: 4, label: 'minimal', action: 'monitor' },
      { minScore: 5, maxScore: 9, label: 'mild', action: 'counseling' },
      { minScore: 10, maxScore: 14, label: 'moderate', action: 'psychotherapy' },
      { minScore: 15, maxScore: 19, label: 'moderately_severe', action: 'psychiatrist_referral' },
      { minScore: 20, maxScore: 27, label: 'severe', action: 'urgent_psychiatric_review' },
    ]),
    totalFlagThreshold: 20, // severe → flag
    totalFlagType: 'severe_depression',
  }),

  gad7: Object.freeze({
    code: 'gad7',
    labelEn: 'GAD-7',
    labelAr: 'استبيان قلق GAD-7',
    itemCount: 7,
    itemMinScore: 0,
    itemMaxScore: 3,
    totalMin: 0,
    totalMax: 21,
    criticalItemIndices: Object.freeze([]),
    criticalItemThreshold: null,
    criticalFlagType: null,
    bands: Object.freeze([
      { minScore: 0, maxScore: 4, label: 'minimal', action: 'monitor' },
      { minScore: 5, maxScore: 9, label: 'mild', action: 'counseling' },
      { minScore: 10, maxScore: 14, label: 'moderate', action: 'psychotherapy' },
      { minScore: 15, maxScore: 21, label: 'severe', action: 'psychiatrist_referral' },
    ]),
    totalFlagThreshold: 15,
    totalFlagType: 'severe_anxiety',
  }),

  dass21: Object.freeze({
    code: 'dass21',
    labelEn: 'DASS-21',
    labelAr: 'مقياس DASS-21',
    itemCount: 21,
    itemMinScore: 0,
    itemMaxScore: 3,
    totalMin: 0,
    totalMax: 63, // but interpretation uses per-subscale × 2
    criticalItemIndices: Object.freeze([]),
    criticalItemThreshold: null,
    criticalFlagType: null,
    // Depression / Anxiety / Stress subscales (each ×2 multiplier per DASS convention)
    subscales: Object.freeze({
      depression: Object.freeze([2, 4, 9, 12, 15, 16, 20]), // 0-indexed item numbers
      anxiety: Object.freeze([1, 3, 6, 8, 14, 18, 19]),
      stress: Object.freeze([0, 5, 7, 10, 13, 17, 21 - 1]),
    }),
    bands: Object.freeze([
      { minScore: 0, maxScore: 9, label: 'normal', action: 'monitor' },
      { minScore: 10, maxScore: 13, label: 'mild', action: 'counseling' },
      { minScore: 14, maxScore: 20, label: 'moderate', action: 'psychotherapy' },
      { minScore: 21, maxScore: 27, label: 'severe', action: 'psychiatrist_referral' },
      {
        minScore: 28,
        maxScore: 63,
        label: 'extremely_severe',
        action: 'urgent_psychiatric_review',
      },
    ]),
    totalFlagThreshold: 28,
    totalFlagType: 'severe_depression',
  }),
});

const SCALE_CODES = Object.freeze(Object.keys(SCALES));

// ── 3. MDT meetings ─────────────────────────────────────────────────

const MDT_PURPOSES = Object.freeze([
  'risk_flag_review',
  'care_plan_review',
  'diagnostic_formulation',
  'medication_review',
  'discharge_planning',
  'family_meeting',
  'incident_debrief',
  'complex_case_review',
]);

const MDT_ROLES = Object.freeze([
  'psychologist',
  'psychiatrist',
  'social_worker',
  'care_manager',
  'nurse',
  'occupational_therapist',
  'speech_therapist',
  'family_member',
  'guardian',
  'other',
]);

const MDT_STATUSES = Object.freeze([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled',
]);

const MDT_TERMINAL_STATUSES = Object.freeze(['completed', 'cancelled', 'rescheduled']);

const MDT_TRANSITIONS = Object.freeze({
  scheduled: [
    { to: 'in_progress', event: 'started' },
    { to: 'completed', event: 'completed', required: ['summary'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
    { to: 'rescheduled', event: 'rescheduled', required: ['rescheduledTo'] },
  ],
  in_progress: [
    { to: 'completed', event: 'completed', required: ['summary'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  completed: [],
  cancelled: [],
  rescheduled: [],
});

// ── Helpers ─────────────────────────────────────────────────────────

function canFlagTransition(from, to) {
  const edges = FLAG_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function flagEventFor(from, to) {
  const edges = FLAG_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function flagRequiredFields(from, to) {
  const edges = FLAG_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isFlagTerminal(status) {
  return FLAG_TERMINAL_STATUSES.includes(status);
}

function canMdtTransition(from, to) {
  const edges = MDT_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function mdtEventFor(from, to) {
  const edges = MDT_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function mdtRequiredFields(from, to) {
  const edges = MDT_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isMdtTerminal(status) {
  return MDT_TERMINAL_STATUSES.includes(status);
}

function getScale(code) {
  return SCALES[code] || null;
}

/**
 * Score a completed scale response.
 * @param {string} code - scale code (phq9 / gad7 / dass21)
 * @param {number[]} responses - per-item scores
 * @returns {object} { total, band, action, autoFlag: null|{type, reason} }
 */
function scoreScale(code, responses) {
  const scale = getScale(code);
  if (!scale) throw new Error(`unknown scale '${code}'`);
  if (!Array.isArray(responses)) {
    throw new Error(`responses must be an array`);
  }
  if (responses.length !== scale.itemCount) {
    throw new Error(
      `scale '${code}' expects ${scale.itemCount} responses, got ${responses.length}`
    );
  }
  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    if (typeof r !== 'number' || r < scale.itemMinScore || r > scale.itemMaxScore) {
      throw new Error(
        `response[${i}]=${r} out of range [${scale.itemMinScore}, ${scale.itemMaxScore}]`
      );
    }
  }
  const total = responses.reduce((s, v) => s + v, 0);
  const band = scale.bands.find(b => total >= b.minScore && total <= b.maxScore);

  // Auto-flag logic: check critical items first, then total threshold
  let autoFlag = null;
  for (const i of scale.criticalItemIndices) {
    if (responses[i] >= (scale.criticalItemThreshold || 0)) {
      autoFlag = {
        type: scale.criticalFlagType,
        reason: `scale:${code} critical item ${i + 1} (score=${responses[i]})`,
      };
      break;
    }
  }
  if (!autoFlag && scale.totalFlagThreshold != null && total >= scale.totalFlagThreshold) {
    autoFlag = {
      type: scale.totalFlagType,
      reason: `scale:${code} total score ${total} ≥ threshold ${scale.totalFlagThreshold}`,
    };
  }

  return {
    total,
    band: band ? band.label : 'unknown',
    action: band ? band.action : 'unknown',
    autoFlag,
  };
}

// ── Validate ────────────────────────────────────────────────────────

function validate() {
  // Flag machine — every status has a transitions entry
  for (const s of FLAG_STATUSES) {
    if (FLAG_TRANSITIONS[s] === undefined) {
      throw new Error(`psych registry: flag status '${s}' missing transitions entry`);
    }
  }
  for (const [from, edges] of Object.entries(FLAG_TRANSITIONS)) {
    if (!FLAG_STATUSES.includes(from)) {
      throw new Error(`psych registry: flag transition source '${from}' unknown`);
    }
    for (const e of edges) {
      if (!FLAG_STATUSES.includes(e.to)) {
        throw new Error(`psych registry: flag transition ${from}→${e.to} unknown`);
      }
      if (!e.event) {
        throw new Error(`psych registry: flag transition ${from}→${e.to} missing event`);
      }
    }
  }
  // Scales — bands cover the entire totalMin..totalMax range contiguously
  for (const [code, s] of Object.entries(SCALES)) {
    let cursor = s.totalMin;
    for (const b of s.bands) {
      if (b.minScore !== cursor) {
        throw new Error(
          `psych registry: scale '${code}' has gap before band '${b.label}' (expected ${cursor}, got ${b.minScore})`
        );
      }
      cursor = b.maxScore + 1;
    }
    if (cursor - 1 !== s.totalMax) {
      throw new Error(
        `psych registry: scale '${code}' bands don't reach totalMax ${s.totalMax} (stopped at ${cursor - 1})`
      );
    }
  }
  // MDT machine
  for (const s of MDT_STATUSES) {
    if (MDT_TRANSITIONS[s] === undefined) {
      throw new Error(`psych registry: mdt status '${s}' missing transitions entry`);
    }
  }
  for (const arr of [FLAG_TYPES, FLAG_SEVERITIES, MDT_PURPOSES, MDT_ROLES]) {
    if (new Set(arr).size !== arr.length) {
      throw new Error(`psych registry: duplicate vocabulary`);
    }
  }
  return true;
}

module.exports = {
  // Flag
  FLAG_TYPES,
  FLAG_SEVERITIES,
  FLAG_STATUSES,
  FLAG_TERMINAL_STATUSES,
  FLAG_PAUSE_STATUSES,
  FLAG_TRANSITIONS,
  CRITICAL_FLAG_SLA_ID,
  canFlagTransition,
  flagEventFor,
  flagRequiredFields,
  isFlagTerminal,
  // Scales
  SCALES,
  SCALE_CODES,
  getScale,
  scoreScale,
  // MDT
  MDT_PURPOSES,
  MDT_ROLES,
  MDT_STATUSES,
  MDT_TERMINAL_STATUSES,
  MDT_TRANSITIONS,
  canMdtTransition,
  mdtEventFor,
  mdtRequiredFields,
  isMdtTerminal,
  // Validate
  validate,
};
