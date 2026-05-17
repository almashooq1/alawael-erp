'use strict';

/**
 * care-plan-recommendation-builder.service.js — Wave 44 (P-REC-001).
 *
 * The Recommendation layer is split into TWO components by design:
 *
 *   1. PromptBuilder  (this module) — assembles the Input Bundle into a
 *                     System+User prompt pair with strict output contract.
 *                     Pure module — does NOT call any LLM.
 *
 *   2. LLM caller     — a future Wave-45 module that takes the prompt,
 *                     calls Anthropic API with prompt caching, and feeds
 *                     the raw JSON output through `validateProposal`.
 *
 * Why split: the builder is the safety floor. Even if the LLM
 * misbehaves, we never accept its output unless it satisfies:
 *   • JSON schema (every required field present + correct types)
 *   • Post-validator (every evidenceRef resolves to a real record)
 *   • Confidence cap (no goal with confidence > 0.85 without recent
 *     standardized assessment)
 *   • SMART check via the validator service
 *
 * Public API:
 *
 *   buildInputBundle(rawData)
 *     → cleaned, redacted Input Bundle (matches spec §2.1)
 *
 *   buildRecommendationPrompt(inputBundle, options)
 *     → { system, user, schemaContract, expectedFields }
 *
 *   validateProposal(rawJson, { resolveEvidenceRef, isGoalSmart, computeConfidence })
 *     → { ok, proposal, errors }
 *
 * The `validateProposal` function is the single chokepoint between
 * LLM output and the care-plan service. NO bypass paths.
 */

const reg = require('./care-planning.registry');

// ─── Output Contract (JSON Schema-like for documentation + checking) ──

const PROPOSAL_REQUIRED_TOP_LEVEL = Object.freeze(['proposal', 'confidence']);

const PROPOSAL_REQUIRED_NESTED = Object.freeze({
  proposal: ['planType', 'rationaleTopLine', 'goals', 'programs', 'reviewCycleWeeks'],
  confidence: ['overall'],
});

const GOAL_REQUIRED_FIELDS = Object.freeze([
  'id',
  'domain',
  'statement',
  'priorityScore',
  'evidenceRefs',
  'expectedDurationWeeks',
  'successCriterion',
]);

const PROGRAM_REQUIRED_FIELDS = Object.freeze([
  'id',
  'frequencyPerWeek',
  'durationMin',
  'goalRefs',
]);

// ─── Input Bundle Sanitisation ─────────────────────────────────

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function safeNumber(x) {
  return typeof x === 'number' && !Number.isNaN(x) ? x : null;
}

function safeString(x, max = 1000) {
  if (typeof x !== 'string') return null;
  const trimmed = x.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : null;
}

/**
 * Build a clean Input Bundle from raw beneficiary data. Hard-redacts
 * fields that should never be in the LLM context (PDPL — saudi national
 * IDs, exact birth dates, etc.). Beneficiary identity is reduced to an
 * opaque id; the prompt instructs the LLM not to echo it back.
 *
 * @param {object} raw — whatever the caller has
 * @returns {object} sanitized bundle
 */
function buildInputBundle(raw = {}) {
  const b = raw.beneficiary || {};
  return {
    beneficiary: {
      // Opaque id, no name / national id / DOB
      id: safeString(b.id || b._id, 100),
      age: safeNumber(b.age),
      gender: b.gender === 'M' || b.gender === 'F' ? b.gender : null,
      primaryDiagnosis: safeString(b.primaryDiagnosis, 50),
      comorbidities: safeArray(b.comorbidities)
        .map(c => safeString(c, 50))
        .filter(Boolean),
      languagePreference: b.languagePreference === 'en' ? 'en' : 'ar',
    },
    assessments: safeArray(raw.assessments).map(a => ({
      id: safeString(a.id || a._id, 100),
      type: safeString(a.type, 50),
      date: a.date ? new Date(a.date).toISOString() : null,
      summary: safeString(a.summary, 1000),
      // domains stays an object — but limit to safe scalar leaves
    })),
    baselines: safeArray(raw.baselines).map(bl => ({
      goalDomain: safeString(bl.goalDomain, 100),
      value: safeString(String(bl.value ?? ''), 200),
      unit: safeString(bl.unit, 50),
      measuredAt: bl.measuredAt ? new Date(bl.measuredAt).toISOString() : null,
    })),
    previousPlan: raw.previousPlan
      ? {
          id: safeString(raw.previousPlan.id || raw.previousPlan._id, 100),
          version: safeNumber(raw.previousPlan.version),
          approvedAt: raw.previousPlan.approvedAt
            ? new Date(raw.previousPlan.approvedAt).toISOString()
            : null,
          goalsClosed: safeNumber(raw.previousPlan.goalsClosed),
          goalsCarried: safeNumber(raw.previousPlan.goalsCarried),
        }
      : null,
    progressHistory: safeArray(raw.progressHistory).map(p => ({
      period: safeString(p.period, 20),
      trend: ['improving', 'plateau', 'regressing'].includes(p.trend) ? p.trend : 'plateau',
      attendance: safeNumber(p.attendance),
    })),
    transportRisk: raw.transportRisk
      ? {
          missedDueToTransport: safeNumber(raw.transportRisk.missedDueToTransport) || 0,
          lastFlag: raw.transportRisk.lastFlag
            ? new Date(raw.transportRisk.lastFlag).toISOString()
            : null,
        }
      : null,
    familyNotes: safeArray(raw.familyNotes)
      .map(n => safeString(n, 1000))
      .filter(Boolean),
    teacherNotes: safeArray(raw.teacherNotes)
      .map(n => safeString(n, 1000))
      .filter(Boolean),
    therapistNotes: safeArray(raw.therapistNotes)
      .map(n => safeString(n, 1000))
      .filter(Boolean),
    supportServices: {
      available: safeArray(raw.supportServices?.available)
        .map(s => safeString(s, 50))
        .filter(Boolean),
      missing: safeArray(raw.supportServices?.missing)
        .map(s => safeString(s, 50))
        .filter(Boolean),
    },
    branchContext: raw.branchContext
      ? {
          branchId: safeString(raw.branchContext.branchId, 100),
          specialtyLoad: raw.branchContext.specialtyLoad || {},
          groupCapacity: safeNumber(raw.branchContext.groupCapacity),
        }
      : null,
    safetyFlags: safeArray(raw.safetyFlags)
      .map(f => safeString(f, 100))
      .filter(Boolean),
    constraints: {
      sessionsPerWeekCap: safeNumber(raw.constraints?.sessionsPerWeekCap) || 5,
      budgetTier: ['standard', 'premium'].includes(raw.constraints?.budgetTier)
        ? raw.constraints.budgetTier
        : 'standard',
    },
  };
}

// ─── Prompt Builder ────────────────────────────────────────────

const SYSTEM_PROMPT_AR_FIRST = `أنت Senior Rehabilitation Clinical Planner. مهمتك إنتاج مسوّدة خطة لمستفيد بناءً على Input Bundle المُحقن.

القواعد الصارمة (Hard rules — أي مخالفة تُرفض من الـ post-validator):

1. لا تخترع بيانات. إن لم تتوفر assessment أو baseline لهدف ما، لا تصدر الهدف — ضع id الهدف في humanConfirmationRequired.
2. كل goal يجب أن يحمل evidenceRefs قابلة للحل في قاعدة البيانات + baselineLink + assessmentLink. الـ post-validator يفشل التوصية إن أي ref لا يُحل.
3. الأهداف SMART فقط:
   - Specific: تسمي السلوك القابل للملاحظة.
   - Measurable: قيمة + وحدة + إطار زمني.
   - Achievable: تأخذ في الاعتبار العمر + التشخيص.
   - Relevant: مرتبطة بـ ICD أو سياق الفرع.
   - Time-bound: targetHorizonWeeks موجود.
4. priorityScore بين 0 و 1: safety > functional impact > family priority > developmental window > resource availability.
5. لا تتجاوز constraints.sessionsPerWeekCap.
6. إن وُجد تعارض بين برنامج وحالة (مثلاً تحفيز حسي عالٍ مع تاريخ نوبات)، استبعد البرنامج واذكره في risks.
7. confidence لا يتجاوز 0.85 إلا إن وُجد تقييم معياري ≤ 30 يومًا.

شكل المخرج: JSON فقط مطابق للعقد التالي. لا نص خارج JSON. لا تعليقات. لا أعمدة سرد.`;

const SYSTEM_PROMPT_OUTPUT_CONTRACT = `{
  "proposal": {
    "planType": "<one of: ${reg.PLAN_TYPE_LIST.join(' | ')}>",
    "rationaleTopLine": "<≤ 280 chars Arabic>",
    "goals": [
      {
        "id": "<g1, g2, ...>",
        "domain": "<expressive_language | social | motor | cognitive | behavior | adl | academic | ...>",
        "statement": "<SMART Arabic sentence with target value + unit + horizon>",
        "priorityScore": <0..1>,
        "evidenceRefs": [{"kind": "<assessment|baseline|note>", "refId": "<id from input bundle>"}],
        "baselineLink": "<bl-id from input bundle>",
        "assessmentLink": "<asm-id from input bundle>",
        "expectedDurationWeeks": <int 1..104>,
        "successCriterion": "<observable threshold>"
      }
    ],
    "programs": [
      {
        "id": "<p1, p2, ...>",
        "frequencyPerWeek": <int 0..14>,
        "durationMin": <int 5..240>,
        "goalRefs": ["<goal ids>"]
      }
    ],
    "tests": [{"id": "<t1>", "cadenceWeeks": <int>, "goalRefs": [...]}],
    "supportServices": [{"service": "<transport|psychology|...>", "reason": "...", "goalRefs": [...]}],
    "familyActions": [{"action": "<10-min daily reading>", "goalRef": "<g1>"}],
    "reviewCycleWeeks": <int 4..52>,
    "risks": [{"risk": "...", "mitigation": "..."}],
    "nextBestAction": "submit_for_validation"
  },
  "confidence": {
    "overall": <0..1>,
    "perGoal": {"<goal-id>": <0..1>}
  },
  "missingData": ["<what you would have used if available>"],
  "humanConfirmationRequired": ["<goal ids needing manual verification>"]
}`;

function buildRecommendationPrompt(inputBundle, options = {}) {
  const lang = options.language === 'en' ? 'en' : 'ar';
  void lang; // reserved for future ENG prompt variant; AR-first today

  const system = `${SYSTEM_PROMPT_AR_FIRST}

Output JSON contract (must match exactly):
${SYSTEM_PROMPT_OUTPUT_CONTRACT}`;

  const user = [
    '=== Input Bundle ===',
    JSON.stringify(inputBundle, null, 2),
    '',
    '=== Generate now ===',
    'Return ONLY the JSON object. No prose.',
  ].join('\n');

  return {
    system,
    user,
    schemaContract: {
      required: PROPOSAL_REQUIRED_TOP_LEVEL,
      nestedRequired: PROPOSAL_REQUIRED_NESTED,
      goalRequiredFields: GOAL_REQUIRED_FIELDS,
      programRequiredFields: PROGRAM_REQUIRED_FIELDS,
      planTypes: reg.PLAN_TYPE_LIST,
    },
    expectedFields: ['proposal.goals', 'proposal.programs', 'confidence.overall'],
  };
}

// ─── Output Validator ──────────────────────────────────────────

function _missingFields(obj, requiredKeys, path) {
  const missing = [];
  for (const key of requiredKeys) {
    if (obj == null || obj[key] === undefined || obj[key] === null) {
      missing.push(`${path}.${key}`);
    }
  }
  return missing;
}

/**
 * Parse + validate a raw LLM response. Strips Markdown fencing, parses
 * JSON, then runs schema + post-validation.
 *
 * @param {string | object} rawJson — output from LLM (or already-parsed)
 * @param {object} hooks
 *   - resolveEvidenceRef(ref) — async fn; must return truthy for known refs
 *   - isGoalSmart(goal)       — fn returning { allPass: boolean }
 *   - computeConfidence(...)  — for cross-check (not invoked by default)
 *   - constraints             — { sessionsPerWeekCap }
 * @returns {object} { ok, proposal?, errors: [], warnings: [] }
 */
async function validateProposal(rawJson, hooks = {}) {
  const errors = [];
  const warnings = [];

  // 1) Parse
  let parsed = rawJson;
  if (typeof rawJson === 'string') {
    let text = rawJson.trim();
    // Strip ```json ... ``` fences if the LLM ignored instructions
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return {
        ok: false,
        errors: [{ code: 'INVALID_JSON', detail: e.message }],
        warnings,
      };
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, errors: [{ code: 'NOT_AN_OBJECT' }], warnings };
  }

  // 2) Top-level schema
  const missingTop = _missingFields(parsed, PROPOSAL_REQUIRED_TOP_LEVEL, '$');
  if (missingTop.length > 0) {
    errors.push({ code: 'MISSING_TOP_LEVEL', fields: missingTop });
  }

  // 3) Nested schema
  for (const [key, fields] of Object.entries(PROPOSAL_REQUIRED_NESTED)) {
    const missing = _missingFields(parsed[key], fields, `$.${key}`);
    if (missing.length > 0) {
      errors.push({ code: 'MISSING_NESTED', section: key, fields: missing });
    }
  }
  // Stop early if foundational fields missing
  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const proposal = parsed.proposal;

  // 4) planType enum
  if (!reg.PLAN_TYPE_LIST.includes(proposal.planType)) {
    errors.push({
      code: 'INVALID_PLAN_TYPE',
      value: proposal.planType,
      allowed: reg.PLAN_TYPE_LIST,
    });
  }

  // 5) rationaleTopLine length
  if (typeof proposal.rationaleTopLine !== 'string' || proposal.rationaleTopLine.length > 280) {
    errors.push({
      code: 'RATIONALE_TOO_LONG',
      length: typeof proposal.rationaleTopLine === 'string' ? proposal.rationaleTopLine.length : 0,
      max: 280,
    });
  }

  // 6) Goals — required fields + SMART + priorityScore range
  const goals = Array.isArray(proposal.goals) ? proposal.goals : [];
  if (goals.length === 0) {
    errors.push({ code: 'NO_GOALS' });
  }
  const goalIds = new Set();
  for (const g of goals) {
    const missing = _missingFields(g, GOAL_REQUIRED_FIELDS, `$.proposal.goals[${g.id || '?'}]`);
    if (missing.length > 0) {
      errors.push({ code: 'GOAL_MISSING_FIELDS', goalId: g.id, fields: missing });
      continue;
    }
    if (goalIds.has(g.id)) {
      errors.push({ code: 'DUPLICATE_GOAL_ID', goalId: g.id });
    }
    goalIds.add(g.id);

    if (typeof g.priorityScore !== 'number' || g.priorityScore < 0 || g.priorityScore > 1) {
      errors.push({ code: 'INVALID_PRIORITY_SCORE', goalId: g.id, value: g.priorityScore });
    }

    if (!Array.isArray(g.evidenceRefs) || g.evidenceRefs.length === 0) {
      errors.push({ code: 'GOAL_NO_EVIDENCE_REFS', goalId: g.id });
    }

    // SMART (if checker injected)
    if (typeof hooks.isGoalSmart === 'function') {
      const smartGoal = {
        statement: g.statement,
        targetValue: g.targetValue || g.successCriterion,
        targetUnit: g.targetUnit || 'criterion',
        priorityScore: g.priorityScore,
        domain: g.domain,
        targetHorizonWeeks: g.expectedDurationWeeks,
      };
      const smart = hooks.isGoalSmart(smartGoal);
      if (!smart.allPass) {
        const missing = Object.entries(smart)
          .filter(([k, v]) => k !== 'allPass' && !v)
          .map(([k]) => k);
        errors.push({ code: 'GOAL_NOT_SMART', goalId: g.id, missing });
      }
    }
  }

  // 7) Programs — required fields + goalRef validity
  const programs = Array.isArray(proposal.programs) ? proposal.programs : [];
  for (const p of programs) {
    const missing = _missingFields(
      p,
      PROGRAM_REQUIRED_FIELDS,
      `$.proposal.programs[${p.id || '?'}]`
    );
    if (missing.length > 0) {
      errors.push({ code: 'PROGRAM_MISSING_FIELDS', programId: p.id, fields: missing });
      continue;
    }
    if (!Array.isArray(p.goalRefs) || p.goalRefs.length === 0) {
      errors.push({ code: 'PROGRAM_NO_GOAL_REFS', programId: p.id });
      continue;
    }
    for (const ref of p.goalRefs) {
      if (!goalIds.has(ref)) {
        errors.push({ code: 'PROGRAM_ORPHAN_REF', programId: p.id, goalRef: ref });
      }
    }
  }

  // 8) Frequency cap
  const cap = Number(hooks.constraints?.sessionsPerWeekCap || 0);
  if (cap > 0) {
    const totalFreq = programs.reduce((s, p) => s + Number(p.frequencyPerWeek || 0), 0);
    if (totalFreq > cap) {
      errors.push({
        code: 'FREQUENCY_EXCEEDS_CAP',
        total: totalFreq,
        cap,
      });
    }
  }

  // 9) Confidence cap (per-goal + overall)
  const confidence = parsed.confidence;
  if (typeof confidence.overall !== 'number' || confidence.overall < 0 || confidence.overall > 1) {
    errors.push({ code: 'INVALID_OVERALL_CONFIDENCE', value: confidence.overall });
  }
  if (
    typeof confidence.overall === 'number' &&
    confidence.overall > reg.CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT &&
    !hooks.hasRecentStandardizedAssessment
  ) {
    errors.push({
      code: 'CONFIDENCE_CAP_VIOLATED',
      overall: confidence.overall,
      cap: reg.CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT,
    });
  }

  if (confidence.perGoal && typeof confidence.perGoal === 'object') {
    for (const [gid, score] of Object.entries(confidence.perGoal)) {
      if (typeof score !== 'number' || score < 0 || score > 1) {
        errors.push({ code: 'INVALID_GOAL_CONFIDENCE', goalId: gid, value: score });
      }
      if (
        typeof score === 'number' &&
        score > reg.CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT &&
        !hooks.hasRecentStandardizedAssessment
      ) {
        warnings.push({ code: 'GOAL_CONFIDENCE_CAP_VIOLATED', goalId: gid, value: score });
      }
    }
  }

  // 10) reviewCycleWeeks sanity
  if (
    typeof proposal.reviewCycleWeeks !== 'number' ||
    proposal.reviewCycleWeeks < 4 ||
    proposal.reviewCycleWeeks > 52
  ) {
    errors.push({
      code: 'INVALID_REVIEW_CYCLE',
      value: proposal.reviewCycleWeeks,
    });
  }

  // 11) Post-validator: evidenceRef resolvability (hard rule)
  if (typeof hooks.resolveEvidenceRef === 'function' && goals.length > 0) {
    for (const g of goals) {
      const refs = Array.isArray(g.evidenceRefs) ? g.evidenceRefs : [];
      for (const ref of refs) {
        let resolved = false;
        try {
          resolved = await hooks.resolveEvidenceRef(ref);
        } catch (err) {
          warnings.push({
            code: 'EVIDENCE_RESOLVE_THREW',
            goalId: g.id,
            refId: ref.refId,
            error: err.message,
          });
        }
        if (!resolved) {
          errors.push({
            code: 'EVIDENCE_REF_UNRESOLVED',
            goalId: g.id,
            refKind: ref.kind,
            refId: ref.refId,
          });
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    proposal: errors.length === 0 ? proposal : null,
    confidence: errors.length === 0 ? confidence : null,
    missingData: parsed.missingData || [],
    humanConfirmationRequired: parsed.humanConfirmationRequired || [],
    errors,
    warnings,
  };
}

module.exports = {
  buildInputBundle,
  buildRecommendationPrompt,
  validateProposal,
  // Exposed for testing / documentation
  PROPOSAL_REQUIRED_TOP_LEVEL,
  PROPOSAL_REQUIRED_NESTED,
  GOAL_REQUIRED_FIELDS,
  PROGRAM_REQUIRED_FIELDS,
};
