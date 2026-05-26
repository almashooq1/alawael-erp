'use strict';

/**
 * gas-scale-builder.lib.js — W454.
 *
 * Heuristic GAS scale proposer. Pure functions, no I/O, fully unit-testable.
 *
 * Per Phase A of docs/blueprint/beneficiary-lifecycle-v3.md. Existing GAS
 * service (backend/services/gas.service.js, W264) requires the therapist
 * to manually write all 5 anchor levels (-2..+2). This library produces a
 * draft via heuristic extraction; the therapist reviews + edits before
 * saving — NEVER auto-applied.
 *
 * Pattern: ADR-011 heuristic-first, ML optional. The heuristic path
 * extracts the action verb + measurable object + target value from the
 * goal text (Arabic + English) and slots them into a template ladder.
 *
 * For LLM-assisted refinement, callers can pipe the heuristic draft +
 * goal text + similar past scales (via RAG W283) to an LLM, then
 * fall back to the heuristic if the LLM call fails or low-confidence.
 */

const VALID_LEVELS = ['minus2', 'minus1', 'zero', 'plus1', 'plus2'];

// Bilingual template strings for the 5 GAS anchors.
const TEMPLATES = {
  ar: {
    minus2: 'لا يستطيع {action} {object} حتى مع دعم أقصى',
    minus1: 'يستطيع {action} {object} مع دعم كبير',
    zero: '{goalText}',
    plus1: 'يتجاوز الهدف: {action} {object} باستقلالية شبه كاملة',
    plus2: 'يتجاوز الهدف بشكل ملحوظ: {action} {object} باستقلالية كاملة + تعميم',
  },
  en: {
    minus2: 'Cannot {action} {object} even with maximal support',
    minus1: 'Can {action} {object} with significant support',
    zero: '{goalText}',
    plus1: 'Exceeds goal: {action} {object} with near-independence',
    plus2: 'Significantly exceeds goal: {action} {object} independently and generalizes',
  },
};

// Common rehab action verbs by language. The heuristic prefers the first
// match in the goal text.
const ACTION_VERBS = {
  ar: [
    'يمشي',
    'المشي',
    'يجلس',
    'الجلوس',
    'يقف',
    'الوقوف',
    'يأكل',
    'الأكل',
    'يشرب',
    'الشرب',
    'يلبس',
    'اللبس',
    'يستحم',
    'الاستحمام',
    'يتحدث',
    'التحدث',
    'يقرأ',
    'القراءة',
    'يكتب',
    'الكتابة',
    'يتفاعل',
    'التفاعل',
    'يركز',
    'التركيز',
    'يتذكر',
    'التذكر',
    'يحل',
    'الحل',
  ],
  en: [
    'walk',
    'walks',
    'walking',
    'sit',
    'sits',
    'sitting',
    'stand',
    'stands',
    'standing',
    'eat',
    'eats',
    'eating',
    'feed',
    'drink',
    'drinks',
    'dress',
    'dresses',
    'dressing',
    'bathe',
    'bathing',
    'wash',
    'speak',
    'speaks',
    'talking',
    'read',
    'reads',
    'reading',
    'write',
    'writes',
    'writing',
    'interact',
    'communicate',
    'focus',
    'attend',
    'remember',
    'recall',
    'solve',
    'solves',
  ],
};

/**
 * Detect language of goal text by character sample.
 * Defaults to 'ar' if Arabic characters dominate, else 'en'.
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'ar';
  const arabicChars = (text.match(/[؀-ۿ]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && arabicChars / totalChars > 0.3 ? 'ar' : 'en';
}

/**
 * Extract the first action verb found in the goal text.
 *
 * Verbs are matched longest-first to avoid "walk" winning over "walks"
 * when the latter is actually present in the text.
 */
function extractAction(text, lang) {
  if (!text) return null;
  const verbs = (ACTION_VERBS[lang] || []).slice().sort((a, b) => b.length - a.length);
  const lower = lang === 'en' ? text.toLowerCase() : text;
  for (const v of verbs) {
    const needle = lang === 'en' ? v.toLowerCase() : v;
    if (lower.includes(needle)) return v;
  }
  return null;
}

/**
 * Extract a measurable object/target from the goal text.
 * Heuristic: first noun-like fragment after the verb, or fallback to
 * the trailing portion of the text.
 */
function extractObject(text, action, lang) {
  if (!text) return lang === 'ar' ? 'الهدف' : 'the task';
  if (!action) {
    return text.length > 60 ? text.slice(0, 60).trim() + '...' : text;
  }
  const idx = text.indexOf(action);
  if (idx < 0) return text;
  const tail = text.slice(idx + action.length).trim();
  if (!tail) return lang === 'ar' ? 'الهدف' : 'the task';
  // Take first 60 chars or up to the first sentence-end / comma.
  const cut = tail.search(/[.,،؛!?\n]/);
  const slice = cut > 0 ? tail.slice(0, cut) : tail;
  return slice.length > 60 ? slice.slice(0, 60).trim() + '...' : slice;
}

/**
 * Propose a 5-level GAS scale from a goal statement using the heuristic.
 *
 * @param {string} goalText  — the goal statement (Arabic or English)
 * @param {Object} [opts]
 * @param {string} [opts.language] — 'ar' | 'en' (default: auto-detect)
 * @param {number} [opts.weight=1] — proposed weight 1-3
 * @returns {{ proposal: Object, method: string, confidence: string, signals: Object }}
 */
function proposeScaleHeuristic(goalText, opts = {}) {
  const text = typeof goalText === 'string' ? goalText.trim() : '';
  if (text.length < 5) {
    return {
      proposal: null,
      method: 'heuristic-v1',
      confidence: 'low',
      signals: { reason: 'GOAL_TEXT_TOO_SHORT' },
    };
  }

  const lang = opts.language || detectLanguage(text);
  const action = extractAction(text, lang);
  const object = extractObject(text, action, lang);
  const tpl = TEMPLATES[lang] || TEMPLATES.ar;

  const fill = template =>
    template
      .replace('{action}', action || (lang === 'ar' ? 'تنفيذ' : 'perform'))
      .replace('{object}', object)
      .replace('{goalText}', text);

  const proposal = {
    minus2: fill(tpl.minus2),
    minus1: fill(tpl.minus1),
    zero: fill(tpl.zero),
    plus1: fill(tpl.plus1),
    plus2: fill(tpl.plus2),
    weight: Math.max(1, Math.min(3, opts.weight ?? 1)),
  };

  // Confidence: medium when both action + object extracted, low otherwise.
  const confidence = action ? 'medium' : 'low';

  return {
    proposal,
    method: 'heuristic-v1',
    confidence,
    signals: {
      detectedLanguage: lang,
      extractedAction: action,
      extractedObject: object,
    },
  };
}

/**
 * Validate a proposed GAS scale shape.
 */
function validateProposal(proposal) {
  const errors = [];
  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }
  for (const level of VALID_LEVELS) {
    if (!proposal[level] || typeof proposal[level] !== 'string') {
      errors.push(`MISSING_LEVEL:${level}`);
    } else if (proposal[level].trim().length < 5) {
      errors.push(`LEVEL_TOO_SHORT:${level}`);
    }
  }
  // Anchors should be distinct (no copy-paste leaks).
  const seen = new Set();
  for (const level of VALID_LEVELS) {
    const text = (proposal[level] || '').trim();
    if (text && seen.has(text)) {
      errors.push(`DUPLICATE_ANCHOR:${level}`);
    }
    seen.add(text);
  }
  return { valid: errors.length === 0, errors };
}

module.exports = Object.freeze({
  proposeScaleHeuristic,
  validateProposal,
  detectLanguage,
  extractAction,
  extractObject,
  // Constants
  VALID_LEVELS,
  TEMPLATES,
  ACTION_VERBS,
});
