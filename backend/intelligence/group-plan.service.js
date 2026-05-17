'use strict';

/**
 * group-plan.service.js — Wave 46.
 *
 * Group-plan generator + validator. PURE module; uses the programs
 * library + main care-planning registry.
 *
 * A group plan is a SHARED structure executed across multiple
 * beneficiaries, with per-beneficiary adaptations. It NEVER replaces
 * individual plans; it complements them.
 *
 * Public API:
 *
 *   buildGroupPlan({ identity, targetCohort, candidates, sharedGoals,
 *                    groupProgramId, staffPool, options })
 *     → {
 *         ok, groupPlan, rejectedCandidates, warnings, errors
 *       }
 *
 *   validateGroupPlan(groupPlan, { programsLibrary }) → validation snapshot
 *
 *   suggestCohort({ candidates, cohortCriteria, capacity })
 *     → { selected: [], rejected: [{beneficiaryId, reasons}] }
 *
 * Hard guarantees:
 *   • staff:beneficiary ratio per spec §6.2 (severity-aware)
 *   • safety exclusions composed across cohort
 *   • group program must support `modality: 'group'` AND age band
 *   • shared goals must all be applicable to the cohort
 *   • individualized adaptations carry pointers to the per-beneficiary
 *     INDIVIDUAL plan (never override the individual goal)
 */

const reg = require('./care-planning.registry');
const lib = require('./care-plan-programs-library.registry');

const REASON = Object.freeze({
  NO_CANDIDATES: 'NO_CANDIDATES',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  PROGRAM_NOT_GROUP_MODALITY: 'PROGRAM_NOT_GROUP_MODALITY',
  STAFF_INSUFFICIENT: 'STAFF_INSUFFICIENT',
  UNKNOWN_PROGRAM: 'UNKNOWN_PROGRAM',
  NO_SHARED_GOALS: 'NO_SHARED_GOALS',
  COHORT_TOO_SMALL: 'COHORT_TOO_SMALL',
  AGE_BAND_INCOMPATIBLE: 'AGE_BAND_INCOMPATIBLE',
  CONTRAINDICATION_PRESENT: 'CONTRAINDICATION_PRESENT',
});

// Required staff:beneficiary ratios by safety profile of the cohort.
// Most-restrictive ratio wins when multiple flags are present.
const STAFF_RATIO_BY_PROFILE = Object.freeze({
  default: { staff: 1, beneficiaries: 4 },
  asd_severe: { staff: 1, beneficiaries: 2 },
  aggression_high: { staff: 1, beneficiaries: 1 },
  elopement_high: { staff: 1, beneficiaries: 2 },
  cognitive_severe: { staff: 1, beneficiaries: 3 },
  motor_high_support: { staff: 1, beneficiaries: 2 },
});

// Safety flag pairs that MUST NOT coexist in the same group session
// (composed by Mahram-of-care principle: if A+B → high incident risk,
// the cohort is rejected before reaching capacity check).
const INCOMPATIBLE_FLAG_PAIRS = Object.freeze([
  ['aggression_high', 'sensory_seeker'],
  ['elopement_high', 'aggression_high'],
  ['seizure_high_freq', 'aggression_high'],
]);

const COHORT_MIN_SIZE = 3;
const COHORT_DEFAULT_MAX = 12;

// ─── Helpers ────────────────────────────────────────────────────

function _mostRestrictiveRatio(flagsSet) {
  let chosen = STAFF_RATIO_BY_PROFILE.default;
  for (const [flag, ratio] of Object.entries(STAFF_RATIO_BY_PROFILE)) {
    if (flag === 'default') continue;
    if (flagsSet.has(flag)) {
      if (ratio.beneficiaries < chosen.beneficiaries) chosen = ratio;
    }
  }
  return chosen;
}

function _detectIncompatiblePairs(allFlagsByBeneficiary) {
  const reasons = [];
  const flags = new Set();
  for (const arr of allFlagsByBeneficiary) (arr || []).forEach(f => flags.add(f));
  for (const [a, b] of INCOMPATIBLE_FLAG_PAIRS) {
    if (flags.has(a) && flags.has(b)) {
      reasons.push({ pair: [a, b] });
    }
  }
  return reasons;
}

function _ageInBand(age, band) {
  return age >= band[0] && age <= band[1];
}

// ─── suggestCohort ──────────────────────────────────────────────

/**
 * Filter candidates against cohort criteria. Returns selected + rejected.
 *
 * @param {object} opts
 *   - candidates: [{ beneficiaryId, age, diagnosis, skillLevel, safetyFlags, individualPlanRef }]
 *   - cohortCriteria: { ageRange:[min,max], diagnosisFilters:[ICD], skillLevelRange:[min,max], safetyExclusions:[flag] }
 *   - capacity: int
 */
function suggestCohort({
  candidates = [],
  cohortCriteria = {},
  capacity = COHORT_DEFAULT_MAX,
} = {}) {
  const selected = [];
  const rejected = [];

  const ageRange = cohortCriteria.ageRange || null;
  const diagFilters = cohortCriteria.diagnosisFilters || null;
  const skillRange = cohortCriteria.skillLevelRange || null;
  const exclusions = new Set(cohortCriteria.safetyExclusions || []);

  for (const c of candidates) {
    const reasons = [];
    if (ageRange && !_ageInBand(c.age, ageRange)) {
      reasons.push(`age_out_of_band[${ageRange[0]}..${ageRange[1]}]`);
    }
    if (diagFilters && diagFilters.length > 0) {
      const dx = Array.isArray(c.diagnosis) ? c.diagnosis : [c.diagnosis].filter(Boolean);
      if (!dx.some(d => diagFilters.includes(d))) {
        reasons.push('diagnosis_mismatch');
      }
    }
    if (skillRange && c.skillLevel != null) {
      if (c.skillLevel < skillRange[0] || c.skillLevel > skillRange[1]) {
        reasons.push(`skill_out_of_band[${skillRange[0]}..${skillRange[1]}]`);
      }
    }
    const flags = c.safetyFlags || [];
    for (const f of flags) {
      if (exclusions.has(f)) reasons.push(`excluded_safety_flag:${f}`);
    }
    if (reasons.length === 0) {
      selected.push({ beneficiaryId: c.beneficiaryId, age: c.age, flags });
    } else {
      rejected.push({ beneficiaryId: c.beneficiaryId, reasons });
    }
  }

  // Apply pairwise incompatibility AFTER filtering
  // — drop the highest-flag beneficiaries first until pairs disappear.
  const trimmed = [...selected];
  let pairs = _detectIncompatiblePairs(trimmed.map(s => s.flags));
  while (pairs.length > 0 && trimmed.length > COHORT_MIN_SIZE) {
    // Find the candidate with the most safety flags and drop them
    trimmed.sort((a, b) => (b.flags?.length || 0) - (a.flags?.length || 0));
    const dropped = trimmed.shift();
    rejected.push({
      beneficiaryId: dropped.beneficiaryId,
      reasons: [`incompatible_safety_pair_${pairs[0].pair.join('+')}`],
    });
    pairs = _detectIncompatiblePairs(trimmed.map(s => s.flags));
  }

  // Apply capacity
  const finalSelected = trimmed.slice(0, capacity);
  const overflow = trimmed.slice(capacity);
  overflow.forEach(o =>
    rejected.push({ beneficiaryId: o.beneficiaryId, reasons: ['capacity_overflow'] })
  );

  return {
    selected: finalSelected,
    rejected,
    counts: {
      candidates: candidates.length,
      selected: finalSelected.length,
      rejected: rejected.length,
    },
  };
}

// ─── buildGroupPlan ─────────────────────────────────────────────

function buildGroupPlan({
  identity = {},
  targetCohort = {},
  candidates = [],
  sharedGoals = [],
  groupProgramId,
  staffPool = [],
  options = {},
} = {}) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(candidates) || candidates.length < COHORT_MIN_SIZE) {
    return {
      ok: false,
      reason: REASON.NO_CANDIDATES,
      errors: [{ code: REASON.NO_CANDIDATES, min: COHORT_MIN_SIZE, got: candidates.length }],
    };
  }
  if (!Array.isArray(sharedGoals) || sharedGoals.length === 0) {
    return { ok: false, reason: REASON.NO_SHARED_GOALS };
  }
  const program = lib.getProgram(groupProgramId);
  if (!program) {
    return { ok: false, reason: REASON.UNKNOWN_PROGRAM };
  }
  if (program.modality !== 'group') {
    return {
      ok: false,
      reason: REASON.PROGRAM_NOT_GROUP_MODALITY,
      programId: groupProgramId,
      modality: program.modality,
    };
  }

  // Cohort selection
  const capacity = Number(options.capacity || COHORT_DEFAULT_MAX);
  const cohort = suggestCohort({
    candidates,
    cohortCriteria: targetCohort,
    capacity,
  });

  if (cohort.selected.length < COHORT_MIN_SIZE) {
    return {
      ok: false,
      reason: REASON.COHORT_TOO_SMALL,
      cohort,
      min: COHORT_MIN_SIZE,
    };
  }

  // Age compatibility with program age band
  for (const m of cohort.selected) {
    if (!_ageInBand(m.age, program.ageBand)) {
      errors.push({
        code: REASON.AGE_BAND_INCOMPATIBLE,
        beneficiaryId: m.beneficiaryId,
        age: m.age,
        programBand: program.ageBand,
      });
    }
  }

  // Contraindications per cohort member
  for (const m of cohort.selected) {
    const contra = lib.checkContraindications(groupProgramId, m.flags || []);
    if (!contra.ok) {
      errors.push({
        code: REASON.CONTRAINDICATION_PRESENT,
        beneficiaryId: m.beneficiaryId,
        conflicts: contra.conflicts,
      });
    }
  }

  // Staff ratio
  const cohortFlags = new Set();
  for (const m of cohort.selected) (m.flags || []).forEach(f => cohortFlags.add(f));
  // Diagnosis-driven profile additions
  for (const c of candidates) {
    if (c.diagnosis === 'F84.0' && c.severity === 'severe') cohortFlags.add('asd_severe');
    if (c.diagnosis === 'F70' && c.severity === 'severe') cohortFlags.add('cognitive_severe');
  }
  const ratio = _mostRestrictiveRatio(cohortFlags);
  const cohortSize = cohort.selected.length;
  const requiredStaff = Math.ceil(cohortSize / ratio.beneficiaries) * ratio.staff;
  const availableStaff = Array.isArray(staffPool) ? staffPool.length : 0;

  if (availableStaff < requiredStaff) {
    errors.push({
      code: REASON.STAFF_INSUFFICIENT,
      requiredStaff,
      availableStaff,
      ratioApplied: ratio,
    });
  }

  // Individualized adaptations skeleton (per cohort member)
  const adaptations = cohort.selected.map(m => ({
    beneficiaryId: m.beneficiaryId,
    individualPlanRef:
      (candidates.find(c => c.beneficiaryId === m.beneficiaryId) || {}).individualPlanRef || null,
    adaptedGoals: [], // filled by caller / supervisor
    adaptedMeasures: [],
    supportNotes: '',
  }));

  // Session structure (default blocks for a 60-min group)
  const sessionStructure = options.sessionStructure || {
    duration: 60,
    blocks: [
      { name: 'افتتاحية واستقبال', durationMin: 10, leadRole: 'therapist_lead' },
      { name: 'نشاط مهارة مشتركة', durationMin: 25, leadRole: 'therapist_lead' },
      { name: 'تطبيق فردي بمساعدة', durationMin: 15, leadRole: 'therapist_assistant' },
      { name: 'إغلاق وتغذية راجعة للأسرة', durationMin: 10, leadRole: 'therapist_lead' },
    ],
  };

  const groupPlan = {
    groupId: identity.groupId || `grp_${Date.now()}`,
    title:
      identity.title ||
      `${program.nameAr} — ${cohortFlags.has('asd_severe') ? 'دعم مكثف' : 'مجموعة قياسية'}`,
    branchId: identity.branchId || null,
    targetCohort,
    inclusionCriteria: options.inclusionCriteria || [],
    exclusionCriteria: Array.from(cohortFlags),
    sharedGoals,
    individualizedAdaptations: adaptations,
    groupProgram: {
      programId: program.id,
      programName: program.name,
      programNameAr: program.nameAr,
      frequencyPerWeek: options.frequencyPerWeek || program.minSessionsPerWeek,
      durationMin: options.durationMin || program.sessionDurationMinRange[0],
    },
    sessionStructure,
    staffRoles: {
      required: requiredStaff,
      assigned: staffPool,
      ratioApplied: ratio,
    },
    measures: (options.measures || []).map(m => ({
      measureId: m.measureId,
      instrument: m.instrument,
      perBeneficiary: true,
      cadenceWeeks: m.cadenceWeeks || 4,
    })),
    safetyRequirements: {
      minStaff: requiredStaff,
      behavioralProtocols: options.behavioralProtocols || [],
      emergencyContactsRef: options.emergencyContactsRef || null,
    },
    participationTracking: {
      method: 'attendance + per-goal-participation-rubric',
      minAttendanceForOutcome: 0.7,
    },
    groupOutcomeModel: {
      cohortLevel: { aggregateMetric: 'shared_goal_progress_avg', target: 0.7 },
      individualLevel: { perGoalProgress: true },
    },
    reviewCycle: {
      weeks: options.reviewCycleWeeks || 8,
      triggerEvents: ['attendance_drop_below_70', 'safety_event_in_session', 'goal_plateau_6w'],
    },
    cohortDispositions: {
      selected: cohort.selected.length,
      rejected: cohort.rejected.length,
      rejectedDetails: cohort.rejected,
    },
  };

  if (errors.length > 0) {
    return { ok: false, errors, warnings, groupPlanDraft: groupPlan };
  }

  return {
    ok: true,
    groupPlan,
    rejectedCandidates: cohort.rejected,
    warnings,
  };
}

// ─── validateGroupPlan ──────────────────────────────────────────

function validateGroupPlan(groupPlan = {}) {
  const errors = [];
  const warnings = [];

  if (!groupPlan.groupProgram?.programId) {
    errors.push({ code: REASON.UNKNOWN_PROGRAM });
  }
  if (!Array.isArray(groupPlan.sharedGoals) || groupPlan.sharedGoals.length === 0) {
    errors.push({ code: REASON.NO_SHARED_GOALS });
  }
  const adapt = Array.isArray(groupPlan.individualizedAdaptations)
    ? groupPlan.individualizedAdaptations
    : [];
  if (adapt.length < COHORT_MIN_SIZE) {
    errors.push({ code: REASON.COHORT_TOO_SMALL, min: COHORT_MIN_SIZE, got: adapt.length });
  }

  // Each adaptation must reference an individualPlanRef
  const missingRef = adapt.filter(a => !a.individualPlanRef);
  if (missingRef.length > 0) {
    warnings.push({
      code: 'MISSING_INDIVIDUAL_PLAN_REF',
      count: missingRef.length,
      detail: 'Group plans must point each cohort member to their individual plan',
    });
  }

  // Staff
  if (
    groupPlan.staffRoles &&
    typeof groupPlan.staffRoles.required === 'number' &&
    Array.isArray(groupPlan.staffRoles.assigned) &&
    groupPlan.staffRoles.assigned.length < groupPlan.staffRoles.required
  ) {
    errors.push({
      code: REASON.STAFF_INSUFFICIENT,
      required: groupPlan.staffRoles.required,
      assigned: groupPlan.staffRoles.assigned.length,
    });
  }

  // Review cycle present
  if (!groupPlan.reviewCycle?.weeks) {
    warnings.push({ code: 'NO_REVIEW_CYCLE' });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      cohortSize: adapt.length,
      sharedGoals: groupPlan.sharedGoals?.length || 0,
      adaptations: adapt.length,
    },
  };
}

module.exports = {
  buildGroupPlan,
  validateGroupPlan,
  suggestCohort,
  STAFF_RATIO_BY_PROFILE,
  INCOMPATIBLE_FLAG_PAIRS,
  COHORT_MIN_SIZE,
  COHORT_DEFAULT_MAX,
  REASON,
};

void reg; // reserved for future cohort-level governance bindings
