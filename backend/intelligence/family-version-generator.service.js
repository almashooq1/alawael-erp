'use strict';

/**
 * family-version-generator.service.js — Wave 43 (Family Communication).
 *
 * Generates a family-facing Markdown summary from an APPROVED care plan
 * version. PURE module — deterministic, no LLM, no network. The Wave-44
 * LLM enrichment will WRAP this generator, never replace it; the
 * deterministic generator is the floor of guaranteed safety.
 *
 * Hard guarantees (PDPL + spec §11.1):
 *
 *   1. Strips every field in registry.FAMILY_REDACTION.STRIP_FIELDS
 *      from the source plan body before composition.
 *   2. Output contains NO clinical jargon (verified via the
 *      arabic-readability tripwire FORBIDDEN_CLINICAL_TERMS).
 *   3. Goals shown ≤ MAX_GOALS_SHOWN (default 5), highest-priority first.
 *   4. Total word count ≤ MAX_WORDS (default 600).
 *   5. Estimated readability grade ≤ MAX_GRADE_LEVEL (default 6) OR
 *      the result is flagged `requiresRewrite: true` (caller decides).
 *   6. REQUIRED_SECTIONS must all be present (goals / family_role /
 *      home_program / next_review / contact_pathway).
 *   7. No raw ICD codes, baselines, evidenceRefs, confidence values,
 *      internal notes, or assessment raw scores.
 *
 * Public API:
 *
 *   generate(planVersionBody, {
 *     centerName, contactPhone, contactEmail,
 *     beneficiaryFirstName, maxGoals, language='ar'
 *   }) → {
 *     ok, markdown, sections, readability, redactedFields,
 *     forbiddenTermsFound, requiresRewrite, wordCount, generatedAt
 *   }
 *
 *   isFamilyReady(generationResult) → boolean
 */

const readability = require('./arabic-readability.service');
const reg = require('./care-planning.registry');

// ─── Helpers ─────────────────────────────────────────────────────

function safeStr(x, fallback = '') {
  return typeof x === 'string' && x.trim().length > 0 ? x.trim() : fallback;
}

function ensureRtlMarker(text) {
  // Arabic-first reader hint; keeps Markdown renderers happy
  return text.startsWith('‫') ? text : `‫${text}`;
}

// Simple priority compare for goals (descending priorityScore, then
// stable by goalId)
function compareGoalsByPriority(a, b) {
  const pa = typeof a.priorityScore === 'number' ? a.priorityScore : 0;
  const pb = typeof b.priorityScore === 'number' ? b.priorityScore : 0;
  if (pb !== pa) return pb - pa;
  return String(a.goalId || '').localeCompare(String(b.goalId || ''));
}

// Convert a clinical goal statement to a family-friendly target phrase.
// Strategy: trim numeric noise + replace common technical verbs.
const TECHNICAL_REPLACEMENTS = [
  [/mands?/gi, 'طلبات لفظية'],
  [/baseline/gi, 'البداية'],
  [/criterion/gi, 'هدف'],
  [/intervention/gi, 'تمرين'],
  [/prompt(ing)?/gi, 'دعم'],
  [/reinforcement/gi, 'تشجيع'],
];

function softenStatement(statement) {
  if (typeof statement !== 'string') return '';
  let s = statement;
  for (const [pat, rep] of TECHNICAL_REPLACEMENTS) {
    s = s.replace(pat, rep);
  }
  return s.trim();
}

// Family-friendly domain labels (Arabic)
const DOMAIN_LABELS_AR = {
  expressive_language: 'التواصل اللفظي',
  receptive_language: 'فهم الكلام',
  social: 'المهارات الاجتماعية',
  language: 'مهارات اللغة',
  motor: 'الحركة',
  fine_motor: 'الحركة الدقيقة',
  gross_motor: 'الحركة الكبيرة',
  cognitive: 'المهارات الذهنية',
  behavior: 'السلوك',
  adl: 'مهارات الاعتماد على النفس',
  academic: 'المهارات التعليمية',
};

function domainLabel(domain) {
  return DOMAIN_LABELS_AR[domain] || 'مهارة عامة';
}

// Format an ISO date into a friendly Arabic-locale-like string.
// We avoid `Intl.DateTimeFormat` to keep the module side-effect-free
// across Node versions; family-readable is the goal.
const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function formatDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${ARABIC_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Body redaction ──────────────────────────────────────────────

/**
 * Recursively walk an object, removing keys named in the strip list.
 * Returns a new object (input not mutated).
 */
function redactBody(input, stripFields) {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(v => redactBody(v, stripFields));
  if (typeof input !== 'object') return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (stripFields.has(key)) continue;
    out[key] = redactBody(value, stripFields);
  }
  return out;
}

function listRedactedFields(input, stripFields, path = '', acc = new Set()) {
  if (input == null) return acc;
  if (Array.isArray(input)) {
    input.forEach((v, i) => listRedactedFields(v, stripFields, `${path}[${i}]`, acc));
    return acc;
  }
  if (typeof input !== 'object') return acc;
  for (const [key, value] of Object.entries(input)) {
    const full = path ? `${path}.${key}` : key;
    if (stripFields.has(key)) {
      acc.add(full);
      continue;
    }
    listRedactedFields(value, stripFields, full, acc);
  }
  return acc;
}

// ─── Section builders ────────────────────────────────────────────

function sectionGreeting({ beneficiaryFirstName }) {
  if (beneficiaryFirstName) {
    return [
      `# خطة ${beneficiaryFirstName} للمرحلة القادمة`,
      '',
      'مرحبًا بكم. هذه نسخة مبسطة من خطة طفلكم تساعدكم على متابعة التقدم في البيت.',
    ].join('\n');
  }
  return [
    '# خطة ابنكم للمرحلة القادمة',
    '',
    'مرحبًا بكم. هذه نسخة مبسطة من الخطة تساعدكم على متابعة التقدم في البيت.',
  ].join('\n');
}

function sectionGoals(goals, maxGoals) {
  const sorted = [...(goals || [])].sort(compareGoalsByPriority).slice(0, maxGoals);

  if (sorted.length === 0) {
    return ['## ما نعمل عليه', '', 'سيُحدد فريق العلاج الأهداف خلال الجلسات الأولى.'].join('\n');
  }

  const lines = ['## ما نعمل عليه', ''];
  for (const g of sorted) {
    const label = domainLabel(g.domain);
    const target = softenStatement(g.statement || '');
    const horizon = g.targetHorizonWeeks ? ` خلال ${g.targetHorizonWeeks} أسبوع` : '';
    lines.push(`- **${label}**${horizon}: ${target}`);
  }
  return lines.join('\n');
}

function sectionFamilyRole(familyRole) {
  const lines = ['## دوركم في البيت', ''];
  const coachingPlan = safeStr(familyRole?.coachingPlan);
  if (coachingPlan) {
    lines.push(coachingPlan);
    lines.push('');
  }
  const minutes = familyRole?.expectedInvolvementMinutesPerWeek;
  if (typeof minutes === 'number' && minutes > 0) {
    lines.push(`الوقت المقترح للعمل في البيت: حوالي ${minutes} دقيقة في الأسبوع.`);
  }
  if (!coachingPlan && !minutes) {
    lines.push('سيشاركم الأخصائي خطوات بسيطة تساعد طفلكم في البيت بعد كل جلسة.');
  }
  return lines.join('\n');
}

function sectionHomeProgram(homeProgram) {
  const items = Array.isArray(homeProgram) ? homeProgram : [];
  if (items.length === 0) {
    return [
      '## تمارين البيت',
      '',
      'لا توجد تمارين منزلية محددة في هذه المرحلة. سيتم إضافتها لاحقًا حسب التقدم.',
    ].join('\n');
  }
  const lines = ['## تمارين البيت', ''];
  for (const it of items) {
    const activity = safeStr(it.activity);
    const freq = safeStr(it.frequency);
    if (!activity) continue;
    if (freq) lines.push(`- ${activity} (${freq})`);
    else lines.push(`- ${activity}`);
  }
  return lines.join('\n');
}

function sectionNextReview(reviewSchedule) {
  const next = reviewSchedule?.nextReviewAt;
  const cadence = reviewSchedule?.cadenceWeeks;
  const lines = ['## موعد المراجعة القادم', ''];
  const formatted = formatDate(next);
  if (formatted) {
    lines.push(`الموعد القادم لمراجعة الخطة: **${formatted}**`);
  } else if (cadence) {
    lines.push(`سيراجع الفريق الخطة كل ${cadence} أسبوع.`);
  } else {
    lines.push('سيتواصل معكم الفريق لتحديد موعد المراجعة القادمة.');
  }
  return lines.join('\n');
}

function sectionContactPathway({ centerName, contactPhone, contactEmail }) {
  const lines = ['## للتواصل', ''];
  if (centerName) lines.push(`- اسم المركز: ${centerName}`);
  if (contactPhone) lines.push(`- هاتف: ${contactPhone}`);
  if (contactEmail) lines.push(`- بريد إلكتروني: ${contactEmail}`);
  if (lines.length === 2) {
    lines.push('- يرجى التواصل مع المركز الذي يتابع طفلكم لأي استفسار.');
  }
  lines.push('');
  lines.push('شكرًا لثقتكم. الفريق هنا لدعمكم.');
  return lines.join('\n');
}

// ─── Public API ──────────────────────────────────────────────────

const DEFAULTS = Object.freeze({
  maxGoals: reg.FAMILY_REDACTION.MAX_GOALS_SHOWN,
  maxWords: reg.FAMILY_REDACTION.MAX_WORDS,
  maxGrade: reg.FAMILY_REDACTION.MAX_GRADE_LEVEL,
});

/**
 * Generate a family-friendly Markdown version of an approved plan.
 *
 * @param {object} planBody — full plan-version body (post-approval)
 * @param {object} ctx      — { centerName, contactPhone, contactEmail,
 *                              beneficiaryFirstName, maxGoals }
 * @returns {object} generation result
 */
function generate(planBody, ctx = {}) {
  if (!planBody || typeof planBody !== 'object') {
    return {
      ok: false,
      reason: 'INVALID_PLAN_BODY',
      markdown: null,
    };
  }

  const stripFields = reg.FAMILY_REDACTION.STRIP_FIELDS;

  // Track which fields the generator removes (audit / debug aid)
  const redactedFields = Array.from(listRedactedFields(planBody, stripFields));
  const redacted = redactBody(planBody, stripFields);

  const maxGoals = Number(ctx.maxGoals || DEFAULTS.maxGoals);
  const maxWords = Number(ctx.maxWords || DEFAULTS.maxWords);
  const maxGrade = Number(ctx.maxGrade || DEFAULTS.maxGrade);

  const sections = {
    greeting: sectionGreeting(ctx),
    goals: sectionGoals(redacted.goals, maxGoals),
    family_role: sectionFamilyRole(redacted.familyRole),
    home_program: sectionHomeProgram(redacted.familyRole?.homeProgram),
    next_review: sectionNextReview(redacted.reviewSchedule),
    contact_pathway: sectionContactPathway(ctx),
  };

  // Verify every required section non-empty
  const missingSections = [];
  for (const req of reg.FAMILY_REDACTION.REQUIRED_SECTIONS) {
    if (!sections[req] || sections[req].trim().length === 0) {
      missingSections.push(req);
    }
  }

  let markdown = [
    sections.greeting,
    sections.goals,
    sections.family_role,
    sections.home_program,
    sections.next_review,
    sections.contact_pathway,
  ].join('\n\n');

  markdown = ensureRtlMarker(markdown);

  // Hard length cap — if exceeded, the generator FAILS rather than
  // silently truncating mid-paragraph
  const wordCount = markdown.trim().split(/\s+/).length;
  const tooLong = wordCount > maxWords;

  // Readability assessment
  const readabilityResult = readability.estimateGrade(markdown);

  // Trip-wire for forbidden clinical terms
  const forbiddenTermsFound = readability.detectForbiddenTerms(markdown);

  const requiresRewrite =
    readabilityResult.grade > maxGrade ||
    forbiddenTermsFound.length > 0 ||
    missingSections.length > 0 ||
    tooLong;

  return {
    ok: !requiresRewrite,
    markdown,
    sections,
    readability: readabilityResult,
    redactedFields,
    forbiddenTermsFound,
    missingSections,
    requiresRewrite,
    wordCount,
    tooLong,
    generatedAt: new Date().toISOString(),
    reason: requiresRewrite ? 'FAMILY_VERSION_REQUIRES_REWRITE' : null,
  };
}

function isFamilyReady(generationResult) {
  if (!generationResult) return false;
  return (
    generationResult.ok === true &&
    generationResult.requiresRewrite === false &&
    generationResult.forbiddenTermsFound.length === 0 &&
    generationResult.missingSections.length === 0 &&
    generationResult.readability.grade <= DEFAULTS.maxGrade
  );
}

// ─── W1259: UnifiedCarePlan adapter (ADR-040 (b)) ────────────────────
//
// PURE field-name mapping from the UI's plan model into the generator's
// input contract. Faithful-or-absent: only content the clinician actually
// entered is mapped; nothing is invented.

const UNIFIED_TYPE_TO_DOMAIN = Object.freeze({
  academic: 'academic',
  behavioral: 'behavior',
  communication: 'language',
  motor: 'motor',
  speech: 'expressive_language',
  social: 'social',
  life_skill: 'adl',
  cognitive: 'cognitive',
  // sensory / vocational / other → generator falls back to 'مهارة عامة'
});

const UNIFIED_PRIORITY_TO_SCORE = Object.freeze({ high: 0.9, medium: 0.6, low: 0.3 });

const UNIFIED_CYCLE_TO_WEEKS = Object.freeze({
  weekly: 1,
  biweekly: 2,
  monthly: 4,
  quarterly: 12,
  custom: 4,
});

function _gatherUnifiedGoals(src) {
  const out = [...(src.globalGoals || [])];
  const gather = group => {
    if (!group || !group.domains) return;
    for (const section of Object.values(group.domains)) {
      if (section && Array.isArray(section.goals)) out.push(...section.goals);
    }
  };
  gather(src.educational);
  gather(src.therapeutic);
  gather(src.lifeSkills);
  return out;
}

function mapUnifiedPlanToFamilyBody(unifiedPlan) {
  const src =
    typeof unifiedPlan.toObject === 'function' ? unifiedPlan.toObject() : unifiedPlan || {};
  const goals = _gatherUnifiedGoals(src)
    .filter(g => g && (g.title || g.target))
    .map(g => ({
      statement: [g.title, g.target].filter(Boolean).join(' — '),
      domain: UNIFIED_TYPE_TO_DOMAIN[g.type] || g.type || null,
      priorityScore: UNIFIED_PRIORITY_TO_SCORE[g.priority] ?? 0.5,
    }));

  const fam = src.familyComponent || {};
  const coaching = Array.isArray(fam.parentTraining)
    ? fam.parentTraining.filter(Boolean).join('. ')
    : '';

  return {
    goals,
    familyRole: {
      ...(coaching ? { coachingPlan: coaching } : {}),
      homeProgram:
        typeof fam.homeProgram === 'string' && fam.homeProgram.trim().length > 0
          ? [{ activity: fam.homeProgram.trim() }]
          : [],
    },
    reviewSchedule: {
      nextReviewAt: src.nextReviewDate || null,
      cadenceWeeks: UNIFIED_CYCLE_TO_WEEKS[src.reviewCycle] || null,
    },
  };
}

/** Generate the family version straight from a UnifiedCarePlan doc. */
function generateForUnifiedPlan(unifiedPlan, ctx = {}) {
  if (!unifiedPlan || typeof unifiedPlan !== 'object') {
    return { ok: false, reason: 'INVALID_PLAN_BODY', markdown: null };
  }
  const result = generate(mapUnifiedPlanToFamilyBody(unifiedPlan), ctx);
  result.source = 'unified';
  return result;
}

module.exports = {
  generate,
  generateForUnifiedPlan,
  mapUnifiedPlanToFamilyBody,
  isFamilyReady,
  DEFAULTS,
  // Exposed for testing
  _internal: { redactBody, listRedactedFields, softenStatement, domainLabel },
};
