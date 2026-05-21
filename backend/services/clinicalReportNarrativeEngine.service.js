'use strict';

/**
 * clinicalReportNarrativeEngine.service.js — Wave 257.
 *
 * Pure narrative-template engine for clinical outcome reports.
 *
 * Mirrors the design in the W257 design session "Clinical Outcome
 * Reporting Architect" (slot-driven templates, deterministic output,
 * no LLM). Existing services (W240 family, W242 ministry, W245
 * clinical) keep their current Arabic strings; this engine is
 * additive scaffolding that future renderers — or future refactors
 * of the existing three — can adopt without breaking anything.
 *
 * Scope discipline (matches W248c carve-out pattern):
 *   - Pure functions only: no I/O, no DB lookups, no Mongoose
 *   - NOT wired to W240/W242/W245 yet — integration is a separate
 *     decision the team makes when ready
 *   - Slot-based, not free-form. Determinism is the whole point —
 *     LLM-generated narrative cannot be audited or proven
 *     jargon-clean
 *
 * What it does:
 *   - magnitudeWord(deltaAbs, mcid, audience) → clinical/family label
 *   - confidenceHedge(level, audience) → prefix string
 *   - directionVerb(situation, scoringDirection, audience) → verb
 *   - familyMeasureLabel(code) → simple Arabic label or null
 *   - periodFamilyLabel({weeks}) → contextual time phrase
 *   - renderNarrative(situation, slots, audience) → composed string
 *   - scrubFamilyJargon(text) → asserts no forbidden tokens in
 *     family-facing output (throws on leak)
 *
 * Templates cover the five canonical narrative situations from W219
 * trend engine: SUSTAINED_IMPROVEMENT, PLATEAU, REGRESSION,
 * MIXED_DOMAINS, INSUFFICIENT_DATA.
 *
 * @module services/clinicalReportNarrativeEngine
 */

// ─── Audience constants ───────────────────────────────────────────────

const AUDIENCE = Object.freeze({
  CLINICAL: 'clinical',
  FAMILY: 'family',
});

const SITUATION = Object.freeze({
  SUSTAINED_IMPROVEMENT: 'SUSTAINED_IMPROVEMENT',
  PLATEAU: 'PLATEAU',
  REGRESSION: 'REGRESSION',
  MIXED_DOMAINS: 'MIXED_DOMAINS',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
});

// ─── Magnitude tiers ──────────────────────────────────────────────────

const MAGNITUDE_TIERS_CLINICAL = Object.freeze([
  { min: 5, label: 'كبير جداً' },
  { min: 2, label: 'كبير' },
  { min: 1, label: 'ملحوظ' },
  { min: 0, label: 'هامشي' },
]);

const MAGNITUDE_TIERS_FAMILY = Object.freeze([
  { min: 5, label: 'واضح جداً' },
  { min: 2, label: 'واضح' },
  { min: 1, label: 'ملحوظ' },
  { min: 0, label: 'بسيط' },
]);

/**
 * Choose a magnitude descriptor based on |delta| / MCID ratio.
 * Returns 'هامشي'/'بسيط' even for ratio=0 — the caller decides
 * whether a delta below MCID warrants narrative at all.
 */
function magnitudeWord(deltaAbs, mcid, audience) {
  if (!Number.isFinite(deltaAbs) || !Number.isFinite(mcid) || mcid <= 0) {
    return audience === AUDIENCE.FAMILY ? 'بسيط' : 'هامشي';
  }
  const factor = Math.abs(deltaAbs) / mcid;
  const tiers = audience === AUDIENCE.FAMILY ? MAGNITUDE_TIERS_FAMILY : MAGNITUDE_TIERS_CLINICAL;
  for (const tier of tiers) {
    if (factor >= tier.min) return tier.label;
  }
  return tiers[tiers.length - 1].label;
}

// ─── Confidence hedges ────────────────────────────────────────────────

const CONFIDENCE_HEDGE = Object.freeze({
  clinical: Object.freeze({
    high: '',
    moderate: 'وفقاً للبيانات المتاحة، ',
    low: 'بثقة محدودة بسبب قلة عدد القياسات، ',
  }),
  family: Object.freeze({
    high: '',
    moderate: 'حسب القياسات الأخيرة، ',
    low: 'لا يزال مبكراً للجزم، ولكن ',
  }),
});

function confidenceHedge(level, audience) {
  const table = audience === AUDIENCE.FAMILY ? CONFIDENCE_HEDGE.family : CONFIDENCE_HEDGE.clinical;
  return table[level] != null ? table[level] : '';
}

// ─── Direction-aware verbs ────────────────────────────────────────────

const DIRECTION_VERBS = Object.freeze({
  improvement: Object.freeze({
    higher_better: Object.freeze({ clinical: 'ارتفعت', family: 'تحسّنت' }),
    lower_better: Object.freeze({ clinical: 'انخفضت', family: 'تحسّنت' }),
  }),
  decline: Object.freeze({
    higher_better: Object.freeze({ clinical: 'انخفضت', family: 'تراجعت' }),
    lower_better: Object.freeze({ clinical: 'ارتفعت', family: 'تراجعت' }),
  }),
});

/**
 * @param {'improvement'|'decline'} situation
 * @param {'higher_better'|'lower_better'} scoringDirection
 * @param {'clinical'|'family'} audience
 */
function directionVerb(situation, scoringDirection, audience) {
  const group = DIRECTION_VERBS[situation];
  if (!group) return audience === AUDIENCE.FAMILY ? 'تغيّرت' : 'تغيّرت';
  const dir = group[scoringDirection];
  if (!dir) {
    // Default to higher_better when scoringDirection unknown — most measures
    return group.higher_better[audience] || 'تغيّرت';
  }
  return dir[audience] || 'تغيّرت';
}

// ─── Family vocabulary ────────────────────────────────────────────────
//
// Note: W240 measureFamilyReport.service.js holds its own legacy
// labels. The intent is for that service to migrate to this map at
// integration time. Keep them in sync only by code review — do not
// dual-source-of-truth at runtime.

const FAMILY_MEASURE_LABELS = Object.freeze({
  BERG: 'اتزان الوقوف والجلوس',
  'BERG-Berg Balance Scale': 'اتزان الوقوف والجلوس',
  'GMFM-66': 'الحركة الكبرى',
  'GMFM-88': 'الحركة الكبرى',
  WeeFIM: 'الأنشطة اليومية',
  'WeeFIM-II': 'الأنشطة اليومية',
  'CELF-5': 'فهم اللغة والتعبير',
  'CELF-P3': 'فهم اللغة والتعبير',
  'CARS-2': 'مؤشرات التواصل الاجتماعي',
  'M-CHAT-R': 'علامات التواصل المبكرة',
  'ADOS-2': 'تقييم التواصل الاجتماعي',
  PROMIS: 'الجودة العامة للحياة',
  'PROMIS-Pediatric': 'الجودة العامة للحياة',
  Vineland: 'المهارات اليومية والاستقلالية',
  'Vineland-3': 'المهارات اليومية والاستقلالية',
});

function familyMeasureLabel(measureCode) {
  if (typeof measureCode !== 'string') return null;
  if (FAMILY_MEASURE_LABELS[measureCode]) return FAMILY_MEASURE_LABELS[measureCode];
  // try case-insensitive prefix match — handles 'BERG-Berg Balance' etc
  const upper = measureCode.toUpperCase();
  for (const key of Object.keys(FAMILY_MEASURE_LABELS)) {
    if (upper.startsWith(key.toUpperCase())) return FAMILY_MEASURE_LABELS[key];
  }
  return null;
}

// ─── Period phrasing ──────────────────────────────────────────────────

function periodFamilyLabel({ weeks } = {}) {
  if (!Number.isFinite(weeks) || weeks <= 0) return 'الفترة الأخيرة';
  if (weeks < 8) return 'الشهر الماضي';
  if (weeks < 16) return 'الفصل الماضي';
  if (weeks < 28) return 'الأشهر الستة الماضية';
  return 'منذ بداية الخطة الحالية';
}

// ─── Templates ────────────────────────────────────────────────────────
//
// Each template has slots wrapped in {{double-brace}}. Renderer
// substitutes from `slots` object. Missing slot → "—" (safe fallback,
// not throw — so partial data never crashes a report).

const TEMPLATES = Object.freeze({
  SUSTAINED_IMPROVEMENT: Object.freeze({
    clinical:
      '{{measureCode_ar}} {{verb_improvement}} {{magnitudeWord}} ({{deltaAbs}} نقطة = {{mcidFactor}}× MCID {{mcidStatus_ar}}) خلال {{periodWeeks}} أسبوعاً (n={{n}} إدارات). {{hedge_confidence}}الاتجاه = تحسّن مستدام بـslope={{slope}}/شهر، CI95=[{{ciLow}}, {{ciHigh}}], R²={{r2}}.',
    family:
      '{{domainFamilyLabel}} {{verb_improvement}} بشكل {{magnitudeWord}} منذ {{periodFamilyLabel}}. {{hedge_confidence}}هذا تقدم ملموس يدعم استمرار خطة العلاج الحالية.',
  }),
  PLATEAU: Object.freeze({
    clinical:
      '{{measureCode_ar}} استقر عند {{currentScore}} (آخر {{plateauWeeks}} أسبوعاً، {{n}} إدارات داخل نطاق SDC={{sdc}}). الـCI95 للـslope يحوي الصفر [{{slopeLow}}, {{slopeHigh}}]. {{hedge_confidence}}الاتجاه = ركود يستوجب مراجعة خطة التدخل.',
    family:
      '{{domainFamilyLabel}} لم {{verb_improvement}} منذ {{periodFamilyLabel}}. هذا يحتاج منا تعديل خطة الجلسات لتحفيز تقدم جديد.',
  }),
  REGRESSION: Object.freeze({
    clinical:
      '{{measureCode_ar}} {{verb_decline}} من {{baselineScore}} إلى {{currentScore}} (delta={{delta}}, |delta|={{deltaAbs}} = {{mcidFactor}}× MCID). الـCI95 لا يحوي الصفر [{{ciLow}}, {{ciHigh}}]. {{hedge_confidence}}الاتجاه = تراجع يستدعي MDT review خلال {{urgencyHours}} ساعة.',
    family:
      'لاحظنا أن {{domainFamilyLabel}} {{verb_decline}} في {{periodFamilyLabel}}. نحتاج للقاء معكم لفهم الأسباب وتعديل الخطة معاً.',
  }),
  MIXED_DOMAINS: Object.freeze({
    clinical:
      'تحسّن في {{improvingMeasures}} مع ركود في {{plateauMeasures}} ضمن نفس المجال. قد يدل على skill-transfer gap بين capacity و performance، أو على compensation pattern. يُنصح بمراجعة توزيع تركيز التدخل.',
    family:
      'طفلكم تحسّن في بعض المهارات لكن مهارات أخرى تحتاج تركيزاً إضافياً. سنناقش معكم خطة معدّلة في اللقاء القادم.',
  }),
  INSUFFICIENT_DATA: Object.freeze({
    clinical:
      'البيانات الحالية (n={{n}} إدارات) غير كافية لإصدار classification trend موثوق. يلزم إدارة إضافية على الأقل قبل التفسير الإكلينيكي. الإدارة القادمة المُجدوَلة: {{nextDate}}.',
    family:
      'ما زلنا في بداية رحلة القياس مع طفلكم. سنحتاج لجلسات قياس إضافية قبل أن نستطيع الحديث عن اتجاه واضح. القياس القادم: {{nextDate}}.',
  }),
});

const SLOT_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/**
 * Render a narrative template with slot substitution.
 * Missing slots fall back to '—'. Never throws on missing data —
 * report generation must remain robust.
 *
 * @param {string} situation - one of SITUATION.* keys
 * @param {Object} slots - { slotName: value, ... }
 * @param {'clinical'|'family'} audience
 * @returns {string}
 */
function renderNarrative(situation, slots, audience) {
  const tmplGroup = TEMPLATES[situation];
  if (!tmplGroup) {
    return audience === AUDIENCE.FAMILY
      ? 'نحن نتابع تقدم طفلكم.'
      : 'تعذّر إنتاج سرد تلقائي — يرجى المراجعة اليدوية.';
  }
  const template = tmplGroup[audience] || tmplGroup.clinical;
  return template.replace(SLOT_PATTERN, (_match, name) => {
    const v = slots == null ? undefined : slots[name];
    if (v == null || v === '') return '—';
    return String(v);
  });
}

// ─── Family jargon sweep ──────────────────────────────────────────────
//
// Regex-based blacklist. Run on every family-facing string before it
// leaves the renderer. A single match raises an error — this is the
// guardrail that prevents the W240 promise ("zero jargon to family")
// from eroding silently over time.

const FAMILY_JARGON_BLACKLIST = Object.freeze([
  /MCID/i,
  /\bSDC\b/i,
  /\bCI ?95\b/i,
  /\bslope\b/i,
  /\bR²/,
  /\bR-?squared\b/i,
  /\bBERG\b/,
  /\bGMFM/,
  /\bWeeFIM/i,
  /\bCELF/,
  /\bCARS/,
  /\bPROMIS/,
  /\bM-CHAT/,
  /\bADOS/,
  /\bVineland\b/i,
  /standard ?score/i,
  /percentile/i,
  /z-?score/i,
  /\bregression\b/i,
  /\bplateau\b/i,
  /\btrajectory\b/i,
  /classification/i,
  /confidence interval/i,
  /baseline/i,
  /\bdelta\b/i,
  /\bn=\d+/,
]);

class FamilyJargonLeak extends Error {
  constructor(token, sample) {
    super(`Family jargon leak detected: matched ${token} in "${sample}"`);
    this.name = 'FamilyJargonLeak';
    this.matchedToken = token;
    this.sample = sample;
  }
}

/**
 * Assert that a family-facing string contains no blacklisted tokens.
 * Throws FamilyJargonLeak on first match — caller can catch and
 * route to a manual-review queue rather than show to family.
 */
function scrubFamilyJargon(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  for (const re of FAMILY_JARGON_BLACKLIST) {
    if (re.test(text)) {
      throw new FamilyJargonLeak(String(re), text.slice(0, 200));
    }
  }
  return text;
}

// ─── Compose convenience ──────────────────────────────────────────────

/**
 * High-level entry: produce a family-safe narrative.
 * Calls renderNarrative then scrubFamilyJargon. Use for any
 * family-facing output; clinical output uses renderNarrative directly.
 */
function renderFamilyNarrative(situation, slots) {
  const out = renderNarrative(situation, slots, AUDIENCE.FAMILY);
  return scrubFamilyJargon(out);
}

// ─── Exports ──────────────────────────────────────────────────────────

module.exports = {
  // Primary API
  renderNarrative,
  renderFamilyNarrative,
  scrubFamilyJargon,
  // Building blocks (exported for direct composition)
  magnitudeWord,
  confidenceHedge,
  directionVerb,
  familyMeasureLabel,
  periodFamilyLabel,
  // Errors
  FamilyJargonLeak,
  // Constants (exported for tests + downstream stability)
  AUDIENCE,
  SITUATION,
  TEMPLATES,
  MAGNITUDE_TIERS_CLINICAL,
  MAGNITUDE_TIERS_FAMILY,
  CONFIDENCE_HEDGE,
  DIRECTION_VERBS,
  FAMILY_MEASURE_LABELS,
  FAMILY_JARGON_BLACKLIST,
};
