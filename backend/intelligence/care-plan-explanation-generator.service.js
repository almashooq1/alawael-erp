'use strict';

/**
 * care-plan-explanation-generator.service.js — Wave 48.
 *
 * Deterministic per-element explanation generator (spec §5).
 *
 * Given an LLM proposal + the Input Bundle + (optional) resolved
 * evidence records, produces an Explanation block per goal:
 *
 *   {
 *     elementId,
 *     whyProposed,
 *     dataPoints: [{source, value, relevance}],
 *     baselineLink: {...},
 *     linkedAssessment,
 *     confidence,
 *     confidenceDrivers: [...],
 *     confidenceDetractors: [...],
 *     risksIfRejected: [...],
 *     alternatives: [{option, tradeoff}],
 *     humanCheckRequired: [...]
 *   }
 *
 * NO LLM. The explanation is composed from the structured proposal +
 * the Wave-44 validator/confidence outputs + the Wave-46 programs
 * library. Determinism is the safety property: every explanation can
 * be reproduced from the same inputs (audit-friendly).
 */

const reg = require('./care-planning.registry');
const lib = require('./care-plan-programs-library.registry');

function _findGoalById(proposal, id) {
  return (proposal?.goals || []).find(g => g.id === id) || null;
}

function _dataPointsForGoal(goal, inputBundle) {
  const points = [];
  // Map evidenceRefs to bundle items
  for (const ref of goal.evidenceRefs || []) {
    if (ref.kind === 'assessment') {
      const a = (inputBundle.assessments || []).find(x => x.id === ref.refId);
      if (a) {
        points.push({
          source: `assessment ${a.type || a.id} (${a.date || '—'})`,
          value: a.summary || '—',
          relevance: 'baseline data for goal target',
        });
      } else {
        points.push({
          source: `assessment ${ref.refId}`,
          value: 'referenced but not resolvable in bundle',
          relevance: 'NEEDS VERIFICATION',
        });
      }
    } else if (ref.kind === 'baseline') {
      const b = (inputBundle.baselines || []).find(x => x.goalDomain === goal.domain);
      if (b) {
        points.push({
          source: `baseline (${b.measuredAt || '—'})`,
          value: `${b.value} ${b.unit || ''}`.trim(),
          relevance: 'starting measurement',
        });
      }
    } else if (ref.kind === 'note') {
      points.push({
        source: 'clinician/family note',
        value: ref.summary || ref.refId,
        relevance: 'qualitative signal',
      });
    } else if (ref.kind === 'measure') {
      points.push({
        source: `measure ${ref.refId}`,
        value: '—',
        relevance: 'tracked measure',
      });
    }
  }
  return points;
}

function _confidenceDriversAndDetractors(goal, inputBundle, scaleConfidence) {
  const drivers = [];
  const detractors = [];

  const refs = goal.evidenceRefs || [];
  const hasAssessmentRef = refs.some(r => r.kind === 'assessment');
  const hasObservationRef = refs.some(r => r.kind === 'note' || r.kind === 'measure');

  if (hasAssessmentRef) drivers.push('standardized assessment available');
  if (refs.length >= 3) drivers.push('multiple independent evidence sources');
  if (goal.targetHorizonWeeks && goal.targetHorizonWeeks <= 24) {
    drivers.push('short time horizon (≤24 weeks)');
  }

  if (!hasAssessmentRef) detractors.push('no standardized assessment cited');
  if (refs.length === 0) detractors.push('zero evidence references');
  if (!hasObservationRef && !hasAssessmentRef) {
    detractors.push('no observational or assessment data linked');
  }

  // Attendance signal (if available)
  const progress = (inputBundle?.progressHistory || [])[0];
  if (progress && typeof progress.attendance === 'number' && progress.attendance < 0.7) {
    detractors.push(
      `attendance ${(progress.attendance * 100).toFixed(0)}% < 70% reduces inference quality`
    );
  }

  // Confidence cap consideration
  if (scaleConfidence > reg.CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT) {
    detractors.push(
      `reported confidence ${scaleConfidence.toFixed(2)} exceeds cap without recent standardized assessment`
    );
  }

  return { drivers, detractors };
}

function _risksIfRejected(goal) {
  // Map domain → typical clinical risk if goal is skipped
  const DOMAIN_RISKS = {
    expressive_language: [
      'delayed language milestone',
      'increased communication frustration',
      'behavior escalation',
    ],
    receptive_language: ['comprehension gap widens', 'academic readiness delay'],
    social: ['social isolation', 'lower peer integration', 'lower self-esteem'],
    behavior: ['behavioral plateau', 'increase in dysregulation', 'safety incidents'],
    fine_motor: ['handwriting / ADL delay'],
    gross_motor: ['mobility independence delay'],
    cognitive: ['academic gap', 'IEP non-compliance'],
    adl: ['independence regression', 'family burden increase'],
    academic: ['curriculum regression', 'grade retention risk'],
  };
  return DOMAIN_RISKS[goal.domain] || ['delayed progress for this developmental domain'];
}

function _alternatives(goal) {
  // Use the programs library to suggest 1-2 alternative programs
  const matches = lib.recommendPrograms(
    { domain: goal.domain, age: goal.beneficiaryAge, indications: goal.indications || [] },
    3
  );
  return matches.slice(0, 2).map(m => ({
    option: m.nameAr || m.name,
    tradeoff:
      'alternative evidence-based program — discuss with supervisor if primary recommendation is rejected',
  }));
}

function _humanCheckRequired(goal, proposalLevel) {
  const checks = [];
  if (!goal.baselineLink) checks.push('confirm baseline measurement before approving');
  if (!goal.assessmentLink) checks.push('attach assessment reference');
  if (proposalLevel?.humanConfirmationRequired?.includes(goal.id)) {
    checks.push('LLM flagged this goal for human confirmation');
  }
  if ((goal.confidence || 0) < reg.CONFIDENCE_THRESHOLDS.HUMAN_CONFIRM) {
    checks.push('confidence below human-confirm threshold');
  }
  if (typeof goal.targetHorizonWeeks !== 'number' || goal.targetHorizonWeeks <= 0) {
    checks.push('set a time-bound horizon');
  }
  return checks;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Generate a single goal explanation.
 */
function explainGoal(goal, { inputBundle = {}, proposalLevel = {} } = {}) {
  if (!goal || !goal.id) {
    return { ok: false, reason: 'INVALID_GOAL' };
  }
  const goalConfidence = proposalLevel?.confidence?.perGoal?.[goal.id] ?? goal.confidence ?? null;

  const { drivers, detractors } = _confidenceDriversAndDetractors(
    goal,
    inputBundle,
    goalConfidence || 0
  );

  const whyProposed = [
    `الهدف يستهدف نطاق "${goal.domain}".`,
    goal.targetHorizonWeeks
      ? `الإطار الزمني المقترح ${goal.targetHorizonWeeks} أسبوع، مدعوم بالأدلة المربوطة.`
      : 'الإطار الزمني غير محدد بعد.',
    `الأولوية ${(goal.priorityScore ?? 0).toFixed(2)} تعكس الأثر الوظيفي + سياق السلامة.`,
  ].join(' ');

  return {
    ok: true,
    elementId: goal.id,
    whyProposed,
    dataPoints: _dataPointsForGoal(goal, inputBundle),
    baselineLink: goal.baselineLink
      ? { baselineId: goal.baselineLink, label: 'baseline for this goal domain' }
      : null,
    linkedAssessment: goal.assessmentLink || null,
    confidence: goalConfidence,
    confidenceLabel: goalConfidence == null ? 'unknown' : reg.classifyConfidence(goalConfidence),
    confidenceDrivers: drivers,
    confidenceDetractors: detractors,
    risksIfRejected: _risksIfRejected(goal),
    alternatives: _alternatives(goal),
    humanCheckRequired: _humanCheckRequired(goal, proposalLevel),
  };
}

/**
 * Generate explanations for every goal in a proposal + a plan-level
 * rationale block.
 */
function explainProposal(proposal, { inputBundle = {} } = {}) {
  if (!proposal || typeof proposal !== 'object') {
    return { ok: false, reason: 'INVALID_PROPOSAL' };
  }
  const goals = Array.isArray(proposal.goals) ? proposal.goals : proposal.proposal?.goals || [];
  const confidence = proposal.confidence || proposal.confidence;

  const perGoal = goals.map(g => explainGoal(g, { inputBundle, proposalLevel: proposal }));

  const planRationale = {
    topLine: proposal.proposal?.rationaleTopLine || proposal.rationaleTopLine || null,
    overallConfidence: confidence?.overall ?? null,
    overallConfidenceLabel:
      confidence?.overall != null ? reg.classifyConfidence(confidence.overall) : 'unknown',
    missingData: proposal.missingData || [],
    humanConfirmationRequired: proposal.humanConfirmationRequired || [],
    risksIfPlanRejected: [
      'continuation of current trajectory without targeted support',
      'family confidence in service decreases',
      'compliance with reauthorization cycles slips',
    ],
  };

  const summary = {
    goalCount: goals.length,
    presentConfidenceGoals: perGoal.filter(p => p.confidenceLabel === 'present').length,
    needsHumanConfirmGoals: perGoal.filter(p => p.confidenceLabel === 'human_confirm').length,
    hiddenConfidenceGoals: perGoal.filter(p => p.confidenceLabel === 'hidden').length,
    anyHumanCheckRequired: perGoal.some(p => (p.humanCheckRequired || []).length > 0),
  };

  return {
    ok: true,
    planRationale,
    perGoal,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  explainGoal,
  explainProposal,
  // Exposed for testing
  _internal: {
    _confidenceDriversAndDetractors,
    _risksIfRejected,
    _alternatives,
    _humanCheckRequired,
  },
};
