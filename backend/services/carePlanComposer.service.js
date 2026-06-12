'use strict';

/**
 * carePlanComposer.service.js — W1264 (مؤلّف الخطة الذكي).
 *
 * Composes a READ-ONLY draft-UnifiedCarePlan PROPOSAL for a beneficiary by
 * stitching the three live engines built/expanded this cycle:
 *
 *   1. pathwayBundle.suggestForBeneficiary  → disability-matched bundle +
 *      LIVE GoalBank templates (age-windowed) + LIVE measure library hits
 *   2. care-plan-programs-library            → evidence-ranked program
 *      recommendations per goal domain (with contraindication machinery)
 *
 * Design principles (the house rules):
 *   • REFUSE-TO-FABRICATE — every proposed goal is a clinician-authored
 *     GoalBank SMART text; every program carries its evidence level +
 *     citations; nothing numeric is invented. The output is a PROPOSAL the
 *     clinician edits/approves — never an auto-created plan.
 *   • EXPLAINABLE — each suggestion carries an Arabic `why` (age fit,
 *     evidence level, bundle match) so the therapist can judge it.
 *   • FAITHFUL-OR-ABSENT — empty libraries produce empty sections + notes,
 *     never filler content.
 *
 * Public API:
 *   composeDraftFromSuggestion(suggestion, opts) — PURE (no I/O)
 *   suggestDraftPlan(beneficiaryId)              — orchestrator
 */

const programsLib = require('../intelligence/care-plan-programs-library.registry');

// GoalBank.domain → UnifiedCarePlan goalRef.type enum
const GOALBANK_TO_GOALREF_TYPE = Object.freeze({
  SPEECH: 'speech',
  OCCUPATIONAL: 'motor',
  PHYSICAL: 'motor',
  BEHAVIORAL: 'behavioral',
  SPECIAL_EDU: 'academic',
  LIFE_SKILLS: 'life_skill',
});

// GoalBank.domain → programs-library domain vocabulary
const GOALBANK_TO_PROGRAM_DOMAIN = Object.freeze({
  SPEECH: 'expressive_language',
  OCCUPATIONAL: 'fine_motor',
  PHYSICAL: 'gross_motor',
  BEHAVIORAL: 'behavior',
  SPECIAL_EDU: 'academic',
  LIFE_SKILLS: 'adl',
});

// programs-library modality → UnifiedCarePlan intervention.domain enum
const MODALITY_TO_INTERVENTION_DOMAIN = Object.freeze({
  aba: 'behavioral_therapy',
  slp: 'speech_therapy',
  ot: 'occupational_therapy',
  pt: 'physical_therapy',
  psych: 'psychological',
  parent_training: 'family_training',
  aac: 'assistive_technology',
  special_edu: 'educational',
  vocational: 'vocational',
  group: 'other',
});

const EVIDENCE_LABEL_AR = Object.freeze({
  strong: 'دليل قوي',
  moderate: 'دليل متوسط',
  emerging: 'دليل ناشئ',
});

function frequencyText(p) {
  const perWeek =
    p.minSessionsPerWeek === p.maxSessionsPerWeek
      ? `${p.maxSessionsPerWeek}`
      : `${p.minSessionsPerWeek}–${p.maxSessionsPerWeek}`;
  const dur = Array.isArray(p.sessionDurationMinRange)
    ? `${p.sessionDurationMinRange[0]}–${p.sessionDurationMinRange[1]} دقيقة`
    : '';
  return `${perWeek} جلسة/أسبوع${dur ? `، ${dur}` : ''}`;
}

/**
 * PURE composition: suggestion (the pathwayBundle.suggestForBeneficiary
 * payload) → draft-UnifiedCarePlan proposal.
 */
function composeDraftFromSuggestion(suggestion, { maxGoals = 8, maxPrograms = 6 } = {}) {
  if (!suggestion || typeof suggestion !== 'object') {
    return { ok: false, reason: 'INVALID_SUGGESTION' };
  }
  const age = suggestion.beneficiary ? suggestion.beneficiary.age : null;
  const notes = [...(suggestion.notes || [])];

  // ── Goals: GoalBank templates → goalRef-shaped proposals ────────────
  const templates = (suggestion.resolved && suggestion.resolved.goalTemplates) || [];
  const goals = templates.slice(0, maxGoals).map(t => ({
    title: t.description, // the clinician-authored Arabic SMART text
    type: GOALBANK_TO_GOALREF_TYPE[t.domain] || 'other',
    criteria: t.measurementCriteria || null,
    priority: 'medium', // clinical priority is the therapist's call — never inferred
    status: 'pending',
    notes: `من بنك الأهداف — ${t.category} (${t.difficulty})`,
    why: [
      age != null ? `مناسب للعمر ${age} (نطاق ${t.targetAgeMin}–${t.targetAgeMax})` : null,
      `ضمن مجالات حزمة ${suggestion.bundle ? suggestion.bundle.titleAr : 'المسار'}`,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
  if (templates.length === 0)
    notes.push('بنك الأهداف لم يُرجِع قوالب — الخطة تبدأ بلا أهداف مقترحة');

  // ── Programs: per distinct goal domain, evidence-ranked, deduped ────
  const domains = [
    ...new Set(templates.map(t => GOALBANK_TO_PROGRAM_DOMAIN[t.domain]).filter(Boolean)),
  ];
  const seen = new Set();
  const interventions = [];
  const EVIDENCE_RANK = { strong: 3, moderate: 2 };
  for (const domain of domains) {
    // We deliberately rank by domain+age+evidence WITHOUT gating on ICD
    // indications (the composer has no diagnosis codes) — instead the
    // program's indications are SURFACED in `why` for the clinician to
    // judge. Faithful: shown, never silently assumed.
    const ranked = programsLib
      .listPrograms({ domain, ...(age != null ? { ageBand: age } : {}) })
      .sort((a, b) => (EVIDENCE_RANK[b.evidenceLevel] || 1) - (EVIDENCE_RANK[a.evidenceLevel] || 1))
      .slice(0, 3);
    for (const p of ranked) {
      if (seen.has(p.id) || interventions.length >= maxPrograms) continue;
      seen.add(p.id);
      interventions.push({
        title: p.name,
        title_ar: p.nameAr,
        domain: MODALITY_TO_INTERVENTION_DOMAIN[p.modality] || 'other',
        frequency: frequencyText(p),
        status: 'planned',
        evidence: `${EVIDENCE_LABEL_AR[p.evidenceLevel] || p.evidenceLevel} — ${(p.citations || []).join('; ')}`,
        why: [
          `موصى به لمجال ${domain}`,
          age != null ? `ضمن النطاق العمري ${p.ageBand[0]}–${p.ageBand[1]}` : null,
          p.indications && p.indications.length > 0
            ? `دواعي الاستخدام (ICD): ${p.indications.join(', ')} — طابِق مع تشخيص المستفيد`
            : null,
          p.contraindications.length > 0
            ? `⚠ موانع: ${p.contraindications.join(', ')} — لم تُقيَّم آلياً، تتطلب مراجعة سريرية`
            : 'لا موانع مسجلة',
        ]
          .filter(Boolean)
          .join(' · '),
      });
    }
  }

  // ── Assessments: bundle guidance + live measure hits ────────────────
  const measures = (suggestion.resolved && suggestion.resolved.measures) || [];
  const suggestedAssessments = {
    guidance: (suggestion.bundle && suggestion.bundle.guidanceAssessments) || [],
    liveMeasures: measures.slice(0, 10).map(m => ({
      code: m.code,
      name: m.name_ar || m.name,
      category: m.category,
    })),
  };

  return {
    ok: true,
    proposal: {
      type: 'comprehensive',
      reviewCycle: 'monthly',
      title_ar: suggestion.bundle ? `خطة مقترحة — ${suggestion.bundle.titleAr}` : 'خطة مقترحة',
      globalGoals: goals,
      globalInterventions: interventions,
      suggestedAssessments,
      bundleInterventionsAr: (suggestion.bundle && suggestion.bundle.interventionsAr) || [],
    },
    beneficiary: suggestion.beneficiary || null,
    bundle: suggestion.bundle
      ? { key: suggestion.bundle.key, titleAr: suggestion.bundle.titleAr }
      : null,
    counts: { goals: goals.length, interventions: interventions.length, measures: measures.length },
    disclaimerAr:
      'هذه مسودة مقترحة للمراجعة السريرية — لا تُعتمد آلياً. الأولويات والأهداف النهائية قرار الفريق العلاجي.',
    notes,
    composedAt: new Date().toISOString(),
  };
}

/** Orchestrator: beneficiaryId → live suggestion → composed proposal. */
async function suggestDraftPlan(beneficiaryId) {
  const { suggestForBeneficiary } = require('./pathwayBundle.service');
  const suggestion = await suggestForBeneficiary(beneficiaryId);
  return composeDraftFromSuggestion(suggestion);
}

module.exports = {
  composeDraftFromSuggestion,
  suggestDraftPlan,
  GOALBANK_TO_GOALREF_TYPE,
  GOALBANK_TO_PROGRAM_DOMAIN,
  MODALITY_TO_INTERVENTION_DOMAIN,
};
