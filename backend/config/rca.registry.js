'use strict';

/**
 * rca.registry.js — World-Class QMS Phase 29 Commit 2.
 *
 * Structured Root-Cause Analysis. Combines two industry-standard
 * frameworks in one investigation:
 *
 *   • 5 Whys — Toyota / lean technique. Chain of cause→cause→… until
 *     a root cause that is actionable surfaces. We enforce a minimum
 *     depth of 3 (most real root causes are 4-5 layers deep) and a
 *     maximum of 7 (anything past 7 is usually speculation per ASQ).
 *
 *   • Ishikawa / Fishbone — visual brainstorm of all contributing
 *     causes grouped by category. We support both:
 *
 *       6M (manufacturing legacy) — Man, Machine, Material, Method,
 *       Measurement, Mother-nature (environment).
 *
 *       Healthcare variant per IHI / TJC — People, Process,
 *       Environment, Equipment, Policy/Procedure, Communication,
 *       Patient-factors.
 *
 *   • PRA-style severity scoring (carried over from CMS / TJC sentinel-
 *     event taxonomy) so we can prioritise root causes.
 */

// ── Lifecycle ──────────────────────────────────────────────────────

const RCA_STATUSES = Object.freeze([
  'draft', // investigation opened, fishbone being built
  'data_collection', // evidence being gathered (interviews, logs, photos)
  'analysis', // 5-Whys + Ishikawa nodes being analysed
  'root_cause_identified', // team agrees on root cause(s)
  'actions_open', // CAPA / corrective actions in flight
  'actions_completed', // actions closed; awaiting effectiveness check
  'verified', // effectiveness check positive → investigation closed
  'archived', // legacy; superseded
  'cancelled', // investigation abandoned with documented reason
]);

const TERMINAL_STATUSES = Object.freeze(['verified', 'archived', 'cancelled']);

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: ['data_collection', 'cancelled'],
  data_collection: ['analysis', 'draft', 'cancelled'],
  analysis: ['root_cause_identified', 'data_collection', 'cancelled'],
  root_cause_identified: ['actions_open', 'analysis', 'cancelled'],
  actions_open: ['actions_completed', 'cancelled'],
  actions_completed: ['verified', 'actions_open'],
  verified: ['archived'],
  archived: [],
  cancelled: [],
});

// ── 5-Whys configuration ───────────────────────────────────────────

const FIVE_WHYS_MIN_DEPTH = 3;
const FIVE_WHYS_MAX_DEPTH = 7;

// ── Ishikawa categories ────────────────────────────────────────────

const ISHIKAWA_CATEGORIES_6M = Object.freeze([
  { code: 'man', nameAr: 'الأشخاص', nameEn: 'Man (people)' },
  { code: 'machine', nameAr: 'المعدات', nameEn: 'Machine (equipment)' },
  { code: 'material', nameAr: 'المواد', nameEn: 'Material' },
  { code: 'method', nameAr: 'الأسلوب', nameEn: 'Method (process)' },
  { code: 'measurement', nameAr: 'القياس', nameEn: 'Measurement' },
  { code: 'mother_nature', nameAr: 'البيئة', nameEn: 'Mother-nature (environment)' },
]);

const ISHIKAWA_CATEGORIES_HEALTHCARE = Object.freeze([
  { code: 'people', nameAr: 'الموظفون', nameEn: 'People' },
  { code: 'process', nameAr: 'العملية', nameEn: 'Process' },
  { code: 'environment', nameAr: 'البيئة', nameEn: 'Environment' },
  { code: 'equipment', nameAr: 'الأجهزة', nameEn: 'Equipment' },
  { code: 'policy', nameAr: 'السياسات والإجراءات', nameEn: 'Policy / Procedure' },
  { code: 'communication', nameAr: 'التواصل', nameEn: 'Communication' },
  { code: 'patient_factors', nameAr: 'العوامل المتعلقة بالمستفيد', nameEn: 'Patient factors' },
]);

const ISHIKAWA_VARIANTS = Object.freeze({
  '6m': ISHIKAWA_CATEGORIES_6M,
  healthcare: ISHIKAWA_CATEGORIES_HEALTHCARE,
});

// ── Severity (sentinel-event style) ────────────────────────────────

const SEVERITY = Object.freeze([
  { code: 'no_harm', score: 1, nameAr: 'بلا أذى', nameEn: 'No harm' },
  { code: 'temporary_minor', score: 2, nameAr: 'أذى مؤقت طفيف', nameEn: 'Temporary minor harm' },
  { code: 'temporary_major', score: 3, nameAr: 'أذى مؤقت كبير', nameEn: 'Temporary major harm' },
  { code: 'permanent_minor', score: 4, nameAr: 'أذى دائم طفيف', nameEn: 'Permanent minor harm' },
  { code: 'permanent_major', score: 5, nameAr: 'أذى دائم كبير', nameEn: 'Permanent major harm' },
  { code: 'death', score: 6, nameAr: 'وفاة', nameEn: 'Death' },
]);

// ── Validation helpers ─────────────────────────────────────────────

/**
 * Validate a 5-Whys chain.
 *
 * @param {Array<{question:string, answer:string}>} chain
 * @returns {{ok:boolean, reason?:string}}
 */
function validateFiveWhysChain(chain) {
  if (!Array.isArray(chain)) return { ok: false, reason: 'chain must be an array' };
  if (chain.length < FIVE_WHYS_MIN_DEPTH) {
    return { ok: false, reason: `at least ${FIVE_WHYS_MIN_DEPTH} levels required` };
  }
  if (chain.length > FIVE_WHYS_MAX_DEPTH) {
    return { ok: false, reason: `at most ${FIVE_WHYS_MAX_DEPTH} levels allowed` };
  }
  for (let i = 0; i < chain.length; i++) {
    const node = chain[i] || {};
    if (!node.question || !node.question.trim()) {
      return { ok: false, reason: `level ${i + 1}: question is required` };
    }
    if (!node.answer || !node.answer.trim()) {
      return { ok: false, reason: `level ${i + 1}: answer is required` };
    }
  }
  return { ok: true };
}

/**
 * Validate Ishikawa cause distribution. We expect at least 1 cause in
 * at least 3 distinct categories — otherwise the diagram is too thin
 * to be useful and is usually a sign the team brainstormed only one
 * branch.
 */
function validateIshikawa(causesByCategory) {
  if (!causesByCategory || typeof causesByCategory !== 'object') {
    return { ok: false, reason: 'causesByCategory is required' };
  }
  const populated = Object.values(causesByCategory).filter(
    list => Array.isArray(list) && list.length > 0
  );
  if (populated.length < 3) {
    return { ok: false, reason: 'at least 3 categories must have causes' };
  }
  return { ok: true };
}

module.exports = {
  RCA_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  FIVE_WHYS_MIN_DEPTH,
  FIVE_WHYS_MAX_DEPTH,
  ISHIKAWA_CATEGORIES_6M,
  ISHIKAWA_CATEGORIES_HEALTHCARE,
  ISHIKAWA_VARIANTS,
  SEVERITY,
  validateFiveWhysChain,
  validateIshikawa,
};
