'use strict';

/**
 * care-planning.registry.js — Wave 41 (Care Planning Phase 1).
 *
 * Pure registry — no DB, no I/O. Encodes the Care Planning Intelligence
 * & Governance Engine spec into enforceable constants:
 *
 *   • Plan types (8)
 *   • Plan version statuses / state machine (13 states + transitions)
 *   • Validation rule set (hard / soft) for readiness scoring
 *   • Role matrix (who can author / review / approve / escalate)
 *   • SMART criteria checklist
 *   • Confidence scoring weights
 *   • Family communication redaction policy
 *   • Notification SLAs
 *
 * The Service layer (care-plan.service.js) and Validator
 * (care-plan-validator.service.js) read this for transition routing
 * and quality gating. Routes (Wave 42) will read it for HTTP
 * status mapping.
 *
 * Aligned with the Care Planning Engine spec sections:
 *   §4 AI Recommendation Layer / Output Contract
 *   §6 Quality Validation Gate
 *   §7 State Machine
 *   §8 Approval Governance
 *   §13 Versioning Model
 *   §15 Approval Governance Matrix
 *   §17 Risks & Anti-Patterns
 */

// ─── Plan Types (8) ───────────────────────────────────────────────

const PLAN_TYPES = Object.freeze({
  INDIVIDUAL_THERAPY: 'individual_therapy',
  INDIVIDUAL_EDUCATION: 'individual_education',
  BEHAVIORAL: 'behavioral',
  FAMILY_SUPPORT: 'family_support',
  GROUP: 'group',
  MULTIDISCIPLINARY: 'multidisciplinary',
  REVIEW: 'review',
  INTENSIVE: 'intensive',
});

const PLAN_TYPE_LIST = Object.freeze(Object.values(PLAN_TYPES));

// ─── Plan Version Statuses / State Machine (13 states) ────────────

const STATUSES = Object.freeze({
  DRAFT: 'draft',
  VALIDATION_PENDING: 'validation_pending',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED_TO_SUPERVISOR: 'submitted_to_supervisor',
  UNDER_REVIEW: 'under_review',
  REVISION_REQUESTED: 'revision_requested',
  ESCALATED_TO_BRANCH_MANAGER: 'escalated_to_branch_manager',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  SUPERSEDED: 'superseded',
  SAVED_TO_RECORD: 'saved_to_record',
  FAMILY_NOTIFICATION_SENT: 'family_notification_sent',
});

const STATUS_LIST = Object.freeze(Object.values(STATUSES));

// Terminal statuses — no outbound transitions allowed
const TERMINAL_STATUSES = Object.freeze(
  new Set([STATUSES.ARCHIVED, STATUSES.SUPERSEDED, STATUSES.FAMILY_NOTIFICATION_SENT])
);

// ─── State Machine Transitions ───────────────────────────────────

const TRANSITIONS = Object.freeze([
  {
    id: 'submit_for_validation',
    descriptionAr: 'تقديم للتحقق من الجودة',
    descriptionEn: 'Submit draft for validation',
    from: [STATUSES.DRAFT],
    to: STATUSES.VALIDATION_PENDING,
    actorRoles: ['therapist', 'teacher'],
    minReadinessScore: 0, // any score allowed; validator runs next
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: false,
    severity: 'low',
    auditCategory: 'care-plan.submit-for-validation',
  },
  {
    id: 'mark_ready',
    descriptionAr: 'تجهيز للإرسال للمشرف',
    descriptionEn: 'Mark plan ready for supervisor submission',
    from: [STATUSES.VALIDATION_PENDING],
    to: STATUSES.READY_FOR_SUBMISSION,
    actorRoles: ['therapist', 'teacher', 'system'],
    minReadinessScore: 85,
    requiresHardFailuresClear: true,
    requiresSelfDistinctApprover: false,
    severity: 'low',
    auditCategory: 'care-plan.mark-ready',
  },
  {
    id: 'submit_to_supervisor',
    descriptionAr: 'إرسال إلى المشرف للمراجعة',
    descriptionEn: 'Submit to supervisor for review',
    from: [STATUSES.READY_FOR_SUBMISSION],
    to: STATUSES.SUBMITTED_TO_SUPERVISOR,
    actorRoles: ['therapist', 'teacher'],
    minReadinessScore: 85,
    requiresHardFailuresClear: true,
    requiresSelfDistinctApprover: false,
    severity: 'medium',
    auditCategory: 'care-plan.submit-to-supervisor',
  },
  {
    id: 'begin_review',
    descriptionAr: 'بدء المراجعة',
    descriptionEn: 'Begin supervisor review',
    from: [STATUSES.SUBMITTED_TO_SUPERVISOR],
    to: STATUSES.UNDER_REVIEW,
    actorRoles: ['clinical_supervisor'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: true,
    severity: 'low',
    auditCategory: 'care-plan.begin-review',
  },
  {
    id: 'request_revision',
    descriptionAr: 'طلب تعديل من المعالج',
    descriptionEn: 'Request revisions from author',
    from: [STATUSES.UNDER_REVIEW],
    to: STATUSES.REVISION_REQUESTED,
    actorRoles: ['clinical_supervisor', 'branch_manager'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: true,
    severity: 'medium',
    auditCategory: 'care-plan.request-revision',
  },
  {
    id: 'resubmit_after_revision',
    descriptionAr: 'إعادة الإرسال بعد التعديل',
    descriptionEn: 'Resubmit after author edits',
    from: [STATUSES.REVISION_REQUESTED],
    to: STATUSES.SUBMITTED_TO_SUPERVISOR,
    actorRoles: ['therapist', 'teacher'],
    minReadinessScore: 85,
    requiresHardFailuresClear: true,
    requiresSelfDistinctApprover: false,
    severity: 'medium',
    auditCategory: 'care-plan.resubmit',
  },
  {
    id: 'escalate',
    descriptionAr: 'تصعيد إلى مدير الفرع',
    descriptionEn: 'Escalate to branch manager',
    from: [STATUSES.UNDER_REVIEW],
    to: STATUSES.ESCALATED_TO_BRANCH_MANAGER,
    actorRoles: ['clinical_supervisor'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: true,
    severity: 'high',
    auditCategory: 'care-plan.escalate',
  },
  {
    id: 'approve',
    descriptionAr: 'اعتماد الخطة',
    descriptionEn: 'Approve plan version',
    from: [STATUSES.UNDER_REVIEW, STATUSES.ESCALATED_TO_BRANCH_MANAGER],
    to: STATUSES.APPROVED,
    actorRoles: ['clinical_supervisor', 'branch_manager'],
    minReadinessScore: 85,
    requiresHardFailuresClear: true,
    requiresSelfDistinctApprover: true,
    severity: 'critical',
    auditCategory: 'care-plan.approve',
  },
  {
    id: 'reject',
    descriptionAr: 'رفض الخطة',
    descriptionEn: 'Reject plan version',
    from: [STATUSES.UNDER_REVIEW, STATUSES.ESCALATED_TO_BRANCH_MANAGER],
    to: STATUSES.REJECTED,
    actorRoles: ['clinical_supervisor', 'branch_manager'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: true,
    severity: 'high',
    auditCategory: 'care-plan.reject',
  },
  {
    id: 'archive_rejected',
    descriptionAr: 'أرشفة بعد الرفض',
    descriptionEn: 'Archive after rejection',
    from: [STATUSES.REJECTED],
    to: STATUSES.ARCHIVED,
    actorRoles: ['clinical_supervisor', 'branch_manager', 'system'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: false,
    severity: 'low',
    auditCategory: 'care-plan.archive',
  },
  {
    id: 'save_to_record',
    descriptionAr: 'حفظ في ملف المستفيد',
    descriptionEn: 'File approved version into beneficiary record',
    from: [STATUSES.APPROVED],
    to: STATUSES.SAVED_TO_RECORD,
    actorRoles: ['system', 'clinical_supervisor'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: false,
    severity: 'medium',
    auditCategory: 'care-plan.save-to-record',
  },
  {
    id: 'notify_family',
    descriptionAr: 'إرسال نسخة الأسرة',
    descriptionEn: 'Dispatch family-friendly version',
    from: [STATUSES.SAVED_TO_RECORD],
    to: STATUSES.FAMILY_NOTIFICATION_SENT,
    actorRoles: ['system', 'clinical_supervisor'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: false,
    severity: 'medium',
    auditCategory: 'care-plan.notify-family',
  },
  {
    id: 'supersede',
    descriptionAr: 'استبدال بنسخة جديدة',
    descriptionEn: 'Supersede with a newer approved version',
    from: [STATUSES.APPROVED, STATUSES.SAVED_TO_RECORD, STATUSES.FAMILY_NOTIFICATION_SENT],
    to: STATUSES.SUPERSEDED,
    actorRoles: ['system'],
    minReadinessScore: 0,
    requiresHardFailuresClear: false,
    requiresSelfDistinctApprover: false,
    severity: 'high',
    auditCategory: 'care-plan.supersede',
  },
]);

const TRANSITION_BY_ID = Object.freeze(
  TRANSITIONS.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {})
);

// HIGH-sensitivity transitions get AnchorLedger commits + extended audit retention
const HIGH_SENSITIVITY_TRANSITIONS = Object.freeze(
  new Set(
    TRANSITIONS.filter(t => t.severity === 'critical' || t.severity === 'high').map(t => t.id)
  )
);

// ─── Validation Rule Set — Hard / Soft ────────────────────────────

const VALIDATION_RULES = Object.freeze([
  // ── Hard rules (block submission) ────────────────────────────
  {
    id: 'goal_has_baseline',
    type: 'hard',
    descriptionAr: 'كل هدف يجب أن يحمل baseline',
    descriptionEn: 'Every goal must declare a baseline link',
    scope: 'goal',
    penalty: 15,
  },
  {
    id: 'goal_has_evidence_refs',
    type: 'hard',
    descriptionAr: 'كل هدف يجب أن يحمل مراجع أدلة',
    descriptionEn: 'Every goal must have at least one evidenceRef',
    scope: 'goal',
    penalty: 15,
  },
  {
    id: 'goal_has_assessment_link',
    type: 'hard',
    descriptionAr: 'كل هدف مرتبط بتقييم',
    descriptionEn: 'Every goal links to a referenced assessment',
    scope: 'goal',
    penalty: 15,
  },
  {
    id: 'goal_is_smart',
    type: 'hard',
    descriptionAr: 'كل هدف يحقق معايير SMART',
    descriptionEn: 'Every goal must satisfy SMART criteria',
    scope: 'goal',
    penalty: 15,
  },
  {
    id: 'goal_has_measure',
    type: 'hard',
    descriptionAr: 'كل هدف مرتبط بمقياس',
    descriptionEn: 'Every goal has a measure / test linked',
    scope: 'goal',
    penalty: 15,
  },
  {
    id: 'has_review_date',
    type: 'hard',
    descriptionAr: 'وجود تاريخ مراجعة قادم',
    descriptionEn: 'Plan must declare a future review date',
    scope: 'plan',
    penalty: 10,
  },
  {
    id: 'safety_has_mitigation',
    type: 'hard',
    descriptionAr: 'كل علم خطر له خطة تخفيف',
    descriptionEn: 'Every safety flag must have a mitigation plan',
    scope: 'plan',
    penalty: 15,
  },
  {
    id: 'program_age_appropriate',
    type: 'hard',
    descriptionAr: 'البرامج مناسبة لعمر المستفيد',
    descriptionEn: 'Programs are appropriate for beneficiary age band',
    scope: 'program',
    penalty: 15,
  },
  {
    id: 'no_orphan_program',
    type: 'hard',
    descriptionAr: 'لا برنامج بلا هدف مرتبط',
    descriptionEn: 'No program lacks a goalRef',
    scope: 'program',
    penalty: 15,
  },
  {
    id: 'frequency_within_cap',
    type: 'hard',
    descriptionAr: 'التكرار ضمن سقف الفرع',
    descriptionEn: 'Session frequency respects branch capacity cap',
    scope: 'program',
    penalty: 15,
  },
  {
    id: 'no_goal_contradictions',
    type: 'hard',
    descriptionAr: 'لا تعارض بين الأهداف',
    descriptionEn: 'No contradictory goals declared',
    scope: 'plan',
    penalty: 15,
  },
  {
    id: 'evidence_refs_resolvable',
    type: 'hard',
    descriptionAr: 'كل evidenceRef قابل للتحقق',
    descriptionEn: 'All evidenceRefs resolve to known assessments / notes',
    scope: 'goal',
    penalty: 15,
  },

  // ── Soft rules (warnings only) ──────────────────────────────
  {
    id: 'measure_matches_domain',
    type: 'soft',
    descriptionAr: 'المقياس مناسب لنطاق الهدف',
    descriptionEn: 'Measure is appropriate for the goal domain',
    scope: 'goal',
    penalty: 3,
  },
  {
    id: 'family_role_defined',
    type: 'soft',
    descriptionAr: 'دور الأسرة محدد',
    descriptionEn: 'Family role is explicitly defined',
    scope: 'plan',
    penalty: 3,
  },
  {
    id: 'support_service_linked',
    type: 'soft',
    descriptionAr: 'الخدمات المساندة مربوطة حيث ينطبق',
    descriptionEn: 'Support services linked where applicable',
    scope: 'plan',
    penalty: 3,
  },
  {
    id: 'evidence_recency',
    type: 'soft',
    descriptionAr: 'الأدلة حديثة (≤ 90 يومًا)',
    descriptionEn: 'EvidenceRefs are recent (≤ 90 days)',
    scope: 'goal',
    penalty: 3,
  },
  {
    id: 'low_confidence_goal',
    type: 'soft',
    descriptionAr: 'الأهداف منخفضة الثقة موسومة',
    descriptionEn: 'Low-confidence goals (<0.5) flagged for human confirmation',
    scope: 'goal',
    penalty: 5,
  },
]);

const HARD_RULE_IDS = Object.freeze(
  new Set(VALIDATION_RULES.filter(r => r.type === 'hard').map(r => r.id))
);

const SOFT_RULE_IDS = Object.freeze(
  new Set(VALIDATION_RULES.filter(r => r.type === 'soft').map(r => r.id))
);

// ─── SMART Criteria Checklist (per goal) ──────────────────────────

const SMART_CRITERIA = Object.freeze([
  'specific', // names the observable behavior / skill
  'measurable', // has numeric target + unit
  'achievable', // age-appropriate + condition-aware
  'relevant', // tied to diagnosis or family priority
  'time_bound', // has explicit weeks/months horizon
]);

// ─── Confidence Scoring Weights (§3.2 of spec) ────────────────────

const CONFIDENCE_WEIGHTS = Object.freeze({
  evidenceRecency: 0.35,
  evidenceConsistency: 0.25,
  baselineClarity: 0.2,
  assessmentValidity: 0.1,
  dataGapPenalty: 0.1,
});

const CONFIDENCE_THRESHOLDS = Object.freeze({
  PRESENT: 0.75,
  HUMAN_CONFIRM: 0.5,
  HIDDEN: 0.0,
});

const CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT = 0.85;

// ─── Readiness Score Bands ────────────────────────────────────────

const READINESS_BANDS = Object.freeze({
  READY: 85, // ≥ 85 + 0 hard failures → ready_for_submission
  PENDING: 70, // 70-84 → validation_pending
  DRAFT_ONLY: 0, // < 70 or any hard failure → draft only
});

// ─── Rejection Reason Codes ───────────────────────────────────────

const REJECTION_REASONS = Object.freeze({
  EVIDENCE_GAP: 'evidence_gap',
  UNCLEAR_GOAL: 'unclear_goal',
  WEAK_BASELINE: 'weak_baseline',
  MISSING_PROGRAM_LOGIC: 'missing_program_logic',
  MISSING_MEASURE: 'missing_measure',
  MISSING_FAMILY_ROLE: 'missing_family_role',
  SAFETY_CONCERN: 'safety_concern',
  SCOPE_MISALIGNMENT: 'scope_misalignment',
});

const REJECTION_REASON_LIST = Object.freeze(Object.values(REJECTION_REASONS));

// ─── Approval Governance Matrix ───────────────────────────────────

const APPROVAL_RULES = Object.freeze({
  // Plan types that ALWAYS require branch-manager escalation
  ALWAYS_ESCALATE_TYPES: new Set([PLAN_TYPES.INTENSIVE, PLAN_TYPES.MULTIDISCIPLINARY]),

  // Rejection count that forces escalation on next resubmission
  ESCALATE_AFTER_REJECTIONS: 2,

  // Confidence floor for supervisor-only approval (below ⇒ escalate)
  CONFIDENCE_FLOOR_SUPERVISOR: 0.5,

  // Required reviewer overall score for approve
  MIN_REVIEW_SCORE_TO_APPROVE: 7.0,
});

// ─── Role Matrix (who can do what) ────────────────────────────────

const ROLE_MATRIX = Object.freeze({
  AUTHORS: new Set(['therapist', 'teacher']),
  REVIEWERS: new Set(['clinical_supervisor']),
  APPROVERS: new Set(['clinical_supervisor', 'branch_manager']),
  ESCALATION_TARGETS: new Set(['branch_manager']),
  EXECUTIVE_VIEWERS: new Set(['executive_leadership', 'head_office', 'quality_compliance']),
});

// ─── Family Communication Redaction Policy ────────────────────────

const FAMILY_REDACTION = Object.freeze({
  STRIP_FIELDS: new Set([
    'icd10',
    'icdCodes',
    'rawBaselineValues',
    'evidenceRefs',
    'confidence',
    'internalNotes',
    'therapistNotes',
    'assessmentRawScores',
  ]),
  MAX_GRADE_LEVEL: 6, // Arabic readability target ≤ Grade 6
  MAX_WORDS: 600,
  MAX_GOALS_SHOWN: 5,
  REQUIRED_SECTIONS: ['goals', 'family_role', 'home_program', 'next_review', 'contact_pathway'],
});

// ─── Notification SLAs ────────────────────────────────────────────

const NOTIFICATION_SLA = Object.freeze({
  AWAITING_REVIEW_HOURS: 24,
  REVISION_REQUESTED_HOURS: 12,
  APPROVED_HOURS: 0, // immediate
  OVERDUE_REVIEW_DAYS: 1,
  OVERDUE_REVIEW_CRITICAL_DAYS: 14,
  REPEATED_REJECTION_THRESHOLD: 3,
  PLATEAU_REVIEW_WEEKS: 6,
  FAMILY_ACK_REMINDER_DAYS: 7,
  FAMILY_ACK_ESCALATION_DAYS: 14,
  FAMILY_ACK_BRANCH_ESCALATION_DAYS: 21,
});

// ─── Helpers ──────────────────────────────────────────────────────

function findTransition(transitionId) {
  return TRANSITION_BY_ID[transitionId] || null;
}

function getAllowedTransitionsFrom(currentStatus) {
  return TRANSITIONS.filter(t => t.from.includes(currentStatus));
}

function validateTransitionRequest({ fromStatus, transitionId }) {
  const t = findTransition(transitionId);
  if (!t) return { valid: false, reason: 'UNKNOWN_TRANSITION' };
  if (!t.from.includes(fromStatus)) {
    return {
      valid: false,
      reason: 'INVALID_FROM_STATUS',
      allowed: t.from,
      requested: fromStatus,
    };
  }
  return { valid: true, transition: t };
}

function isHighSensitivity(transitionId) {
  return HIGH_SENSITIVITY_TRANSITIONS.has(transitionId);
}

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

function isPlanTypeAlwaysEscalated(planType) {
  return APPROVAL_RULES.ALWAYS_ESCALATE_TYPES.has(planType);
}

function getActorRoles(transitionId) {
  const t = findTransition(transitionId);
  return t ? [...t.actorRoles] : [];
}

function getRule(ruleId) {
  return VALIDATION_RULES.find(r => r.id === ruleId) || null;
}

function isHardRule(ruleId) {
  return HARD_RULE_IDS.has(ruleId);
}

function isSoftRule(ruleId) {
  return SOFT_RULE_IDS.has(ruleId);
}

/**
 * Classify a numeric readiness score into a band.
 * Returns: 'ready' | 'pending' | 'draft_only'
 */
function classifyReadiness(score, hardFailureCount = 0) {
  if (hardFailureCount > 0) return 'draft_only';
  if (score >= READINESS_BANDS.READY) return 'ready';
  if (score >= READINESS_BANDS.PENDING) return 'pending';
  return 'draft_only';
}

/**
 * Decide whether a confidence value is shown, flagged, or hidden.
 * Returns: 'present' | 'human_confirm' | 'hidden'
 */
function classifyConfidence(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.PRESENT) return 'present';
  if (confidence >= CONFIDENCE_THRESHOLDS.HUMAN_CONFIRM) return 'human_confirm';
  return 'hidden';
}

module.exports = {
  // Plan types
  PLAN_TYPES,
  PLAN_TYPE_LIST,

  // State machine
  STATUSES,
  STATUS_LIST,
  TERMINAL_STATUSES,
  TRANSITIONS,
  TRANSITION_BY_ID,
  HIGH_SENSITIVITY_TRANSITIONS,

  // Validation
  VALIDATION_RULES,
  HARD_RULE_IDS,
  SOFT_RULE_IDS,
  SMART_CRITERIA,

  // Scoring
  CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT,
  READINESS_BANDS,

  // Governance
  REJECTION_REASONS,
  REJECTION_REASON_LIST,
  APPROVAL_RULES,
  ROLE_MATRIX,

  // Family + notifications
  FAMILY_REDACTION,
  NOTIFICATION_SLA,

  // Helpers
  findTransition,
  getAllowedTransitionsFrom,
  validateTransitionRequest,
  isHighSensitivity,
  isTerminalStatus,
  isPlanTypeAlwaysEscalated,
  getActorRoles,
  getRule,
  isHardRule,
  isSoftRule,
  classifyReadiness,
  classifyConfidence,
};
