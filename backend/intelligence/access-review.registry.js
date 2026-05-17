'use strict';

/**
 * access-review.registry.js — Wave 38.
 *
 * Operationalises the User Access Review & Recertification Program
 * (designed in the access-governance pass). This is the single source
 * of truth for:
 *
 *   • Which review type applies to which entitlement
 *   • What cadence each entitlement must be re-attested at
 *   • Which reviewer-role(s) cosign each entitlement type
 *   • Which criteria codes apply per review type (C1..C7 + extensions)
 *   • Actor-bundle SoD conflicts (the cross-entitlement view that the
 *     Wave-31 action-context SoD layer cannot see by itself)
 *
 * Closes red-team finding #12 (stale privileged access) by making
 * "when does this entitlement need re-attestation?" a registry lookup
 * rather than human judgment.
 *
 * Pure registry — no DB, no I/O. The Wave-39 scheduler reads this to
 * build cycle queues. The Wave-38 simulator reads ACTOR_BUNDLE_CONFLICTS
 * to surface combinations that trip the SoD matrix.
 */

// ─── Review types (the 7 from §1-§7 of the program design) ─────────

const REVIEW_TYPE = Object.freeze({
  QUARTERLY: 'quarterly',
  PRIVILEGED: 'privileged',
  BRANCH: 'branch',
  HQ: 'hq',
  DORMANT: 'dormant',
  MOVER: 'mover',
  HIGH_RISK: 'high-risk',
});

const REVIEW_TYPES = Object.freeze(Object.values(REVIEW_TYPE));

// ─── Cadence labels ────────────────────────────────────────────────

const CADENCE = Object.freeze({
  CONTINUOUS: 'continuous',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  EVENT_DRIVEN: 'event-driven',
});

// ─── Decision codes (mirrored on the attestation model) ────────────

const DECISION = Object.freeze({
  CERTIFY: 'CERTIFY',
  REVISE: 'REVISE',
  REVOKE: 'REVOKE',
  ESCALATE: 'ESCALATE',
  ABSTAIN: 'ABSTAIN',
  ROTATE: 'ROTATE',
});

const DECISIONS = Object.freeze(Object.values(DECISION));

// ─── HIGH-sensitivity role list ────────────────────────────────────
// These trigger MONTHLY privileged review + multi-party Nafath
// signing. Aligned with §2 of the program design.

const HIGH_SENSITIVITY_ROLES = Object.freeze([
  'super_admin',
  'executive_leadership',
  'finance.approver_l2',
  'finance.treasurer',
  'finance.payer',
  'audit_admin',
  'auditor',
  'iam.role_granter',
  'iam.role_matrix_editor',
  'iam.role_matrix_activator',
  'dpo',
  'compliance_officer',
  'security_architect',
  'ciso',
]);

function isHighSensitivity(role) {
  return HIGH_SENSITIVITY_ROLES.includes(role);
}

// ─── Reviewer routing ──────────────────────────────────────────────
// Maps each role pattern to the set of reviewer-role keys that must
// COSIGN the attestation. Multi-entry arrays mean ALL listed reviewers
// must sign (joint review).

const REVIEWER_ROUTING = Object.freeze({
  // Executive tier — board-level review
  super_admin: ['ceo', 'audit_committee_chair'],
  executive_leadership: ['ceo'],
  ceo: ['audit_committee_chair'],

  // Finance privileged
  'finance.approver_l2': ['cfo', 'ciso', 'dpo'],
  'finance.treasurer': ['cfo', 'ciso'],
  'finance.payer': ['cfo', 'dpo'],

  // Audit / compliance
  audit_admin: ['dpo', 'audit_committee_chair'],
  auditor: ['dpo', 'ciso'],
  dpo: ['ceo', 'audit_committee_chair'],
  compliance_officer: ['dpo', 'ciso'],
  ciso: ['ceo', 'audit_committee_chair'],

  // IAM / security
  security_architect: ['ciso', 'dpo'],
  'iam.role_granter': ['security_architect', 'dpo'],
  'iam.role_matrix_editor': ['security_architect', 'dpo', 'ciso'],
  'iam.role_matrix_activator': ['security_architect', 'dpo', 'ciso', 'coo'],

  // Operational — branch-scoped
  therapist: ['branch_manager'],
  supervisor: ['branch_manager'],
  receptionist: ['branch_manager'],
  'branch.admin': ['branch_director', 'regional_manager'],
  branch_director: ['regional_manager', 'coo'],
  branch_manager: ['regional_manager', 'coo'],
  regional_manager: ['coo'],

  // HR tier
  hr_admin: ['chro', 'dpo'],
  hr_director: ['chro'],
  chro: ['ceo'],

  // Service accounts (special — routed to security team lead, not exec)
  'service-account': ['security_team_lead', 'ciso'],
});

function getReviewersFor(role) {
  if (REVIEWER_ROUTING[role]) return [...REVIEWER_ROUTING[role]];
  // Default fallback: branch_manager for any unrecognised role
  return ['branch_manager'];
}

// ─── Cadence resolver ──────────────────────────────────────────────

function getCadenceFor(role, opts = {}) {
  if (opts.isServiceAccount) return CADENCE.QUARTERLY;
  if (opts.isTempElevated) return CADENCE.WEEKLY;
  if (opts.isDormancyCheck) return CADENCE.CONTINUOUS;
  if (isHighSensitivity(role)) return CADENCE.MONTHLY;
  return CADENCE.QUARTERLY;
}

// ─── Criteria mapping per review type ──────────────────────────────
// C1-C7  = base quarterly criteria
// P1-P7  = privileged additions
// H1-H5  = HQ-recertification additions
// B1-B5  = branch-manager attestation criteria
// D1-D5  = dormant cleanup
// M1-M7  = mover review
// HR1-HR6 = high-risk-specific

const CRITERIA_FOR_TYPE = Object.freeze({
  [REVIEW_TYPE.QUARTERLY]: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
  [REVIEW_TYPE.PRIVILEGED]: [
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
    'C7',
    'P1',
    'P2',
    'P3',
    'P4',
    'P5',
    'P6',
    'P7',
  ],
  [REVIEW_TYPE.BRANCH]: ['B1', 'B2', 'B3', 'B4', 'B5'],
  [REVIEW_TYPE.HQ]: [
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
    'C7',
    'P1',
    'P2',
    'P3',
    'P4',
    'P5',
    'P6',
    'P7',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
  ],
  [REVIEW_TYPE.DORMANT]: ['D1', 'D2', 'D3', 'D4', 'D5'],
  [REVIEW_TYPE.MOVER]: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'],
  [REVIEW_TYPE.HIGH_RISK]: [
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
    'C7',
    'P1',
    'P2',
    'P3',
    'P4',
    'P5',
    'P6',
    'P7',
    'HR1',
    'HR2',
    'HR3',
    'HR4',
    'HR5',
    'HR6',
  ],
});

function getCriteriaFor(reviewType) {
  return CRITERIA_FOR_TYPE[reviewType] ? [...CRITERIA_FOR_TYPE[reviewType]] : null;
}

// ─── Review-type resolver ──────────────────────────────────────────
// Given an entitlement (role + scope) and context (event triggers),
// returns the appropriate review type.

function getReviewTypeFor({ role, scope, eventContext = {} } = {}) {
  if (eventContext.isMove) return REVIEW_TYPE.MOVER;
  if (eventContext.isDormant) return REVIEW_TYPE.DORMANT;
  if (eventContext.isHighRiskTrigger) return REVIEW_TYPE.HIGH_RISK;
  if (eventContext.isBranchAttestation) return REVIEW_TYPE.BRANCH;
  if (scope === 'GLOBAL' || scope === 'REGION') return REVIEW_TYPE.HQ;
  if (isHighSensitivity(role)) return REVIEW_TYPE.PRIVILEGED;
  return REVIEW_TYPE.QUARTERLY;
}

// ─── Actor-bundle SoD conflicts ────────────────────────────────────
// These are the BUNDLE form of the 28-rule SoD matrix. The Wave-31
// `decide()` evaluates per-action SoD; this list catches toxic
// combinations that a single actor holds across roles BEFORE any
// action is attempted. The simulator surfaces these at attestation
// time so reviewers see the standing risk, not just per-action.

const ACTOR_BUNDLE_CONFLICTS = Object.freeze([
  // ── Process #1 — User creation + role grant ─────────────────
  {
    id: 'BUNDLE-IAM-1',
    descriptionEn:
      'Holds creator + role_granter + activator on same actor — single-person privileged account chain',
    descriptionAr: 'يجمع منشئ المستخدم ومانح الصلاحيات والمفعّل — سلسلة هجوم لشخص واحد',
    requiresAll: ['iam.user_creator', 'iam.role_granter', 'iam.user_activator'],
    severity: 'critical',
    relatedSoDRule: 'SOD-13',
  },
  {
    id: 'BUNDLE-IAM-2',
    descriptionEn:
      'Holds role_granter while also being a HIGH-sensitivity holder — self-elevation risk',
    descriptionAr: 'يحمل صلاحية منح الأدوار مع حمل دور عالي الحساسية — خطر التصعيد الذاتي',
    requiresAll: ['iam.role_granter', 'super_admin'],
    severity: 'critical',
    relatedSoDRule: 'SOD-11',
  },

  // ── Process #2 — Role-matrix editing ────────────────────────
  {
    id: 'BUNDLE-MATRIX-1',
    descriptionEn: 'Editor + approver of role matrix — peer review bypass',
    descriptionAr: 'محرر ومعتمد لمصفوفة الأدوار — تخطي مراجعة الأقران',
    requiresAll: ['iam.role_matrix_editor', 'iam.role_matrix_approver'],
    severity: 'critical',
    relatedSoDRule: 'SOD-14',
  },
  {
    id: 'BUNDLE-MATRIX-2',
    descriptionEn: 'Approver + activator of role matrix — staging gate bypass',
    descriptionAr: 'معتمد ومفعّل لمصفوفة الأدوار — تخطي بوابة التجهيز',
    requiresAll: ['iam.role_matrix_approver', 'iam.role_matrix_activator'],
    severity: 'critical',
    relatedSoDRule: 'SOD-15',
  },

  // ── Process #3 — Invoice/claim 3-way SoD ────────────────────
  {
    id: 'BUNDLE-FIN-1',
    descriptionEn: 'Holds invoice creator + approver — classic self-approval',
    descriptionAr: 'يجمع إنشاء واعتماد الفواتير — اعتماد ذاتي كلاسيكي',
    requiresAll: ['finance.creator', 'finance.approver_l1'],
    severity: 'high',
    relatedSoDRule: 'SOD-1',
  },
  {
    id: 'BUNDLE-FIN-2',
    descriptionEn: 'Holds approver + payer — approve-then-pay-yourself attack chain',
    descriptionAr: 'يجمع اعتماد الفواتير والصرف — سلسلة "اعتمد ثم ادفع لنفسك"',
    requiresAll: ['finance.approver_l1', 'finance.payer'],
    severity: 'critical',
    relatedSoDRule: 'SOD-NEW-FIN-1',
  },
  {
    id: 'BUNDLE-FIN-3',
    descriptionEn: 'Holds treasurer + reconciler — pay and hide in reconciliation',
    descriptionAr: 'يجمع أمانة الصندوق والتسوية البنكية — ادفع وأخفِ في التسوية',
    requiresAll: ['finance.treasurer', 'finance.reconciler'],
    severity: 'critical',
    relatedSoDRule: 'SOD-NEW-FIN-2',
  },
  {
    id: 'BUNDLE-FIN-4',
    descriptionEn: 'Holds approver_l1 + approver_l2 — single-eye on above-threshold value',
    descriptionAr: 'يحمل مستويي اعتماد L1+L2 — رؤية أحادية على المبالغ العالية',
    requiresAll: ['finance.approver_l1', 'finance.approver_l2'],
    severity: 'high',
    relatedSoDRule: 'SOD-NEW-FIN-3',
  },

  // ── Process #4 — Sensitive reports ──────────────────────────
  {
    id: 'BUNDLE-REPORT-1',
    descriptionEn: 'Holds report author + exporter on PHI dataset — single-eye PHI extraction',
    descriptionAr: 'يجمع تأليف وتصدير التقارير على بيانات PHI — استخراج بنظرة واحدة',
    requiresAll: ['report.author', 'report.exporter_phi'],
    severity: 'critical',
    relatedSoDRule: 'SOD-20',
  },
  {
    id: 'BUNDLE-REPORT-2',
    descriptionEn: 'Holds exporter + distributor — silent fan-out attack',
    descriptionAr: 'يجمع تصدير وتوزيع التقارير — هجوم البث الصامت',
    requiresAll: ['report.exporter', 'report.distributor'],
    severity: 'high',
    relatedSoDRule: 'SOD-NEW-RPT-1',
  },

  // ── Process #5 — Break-glass ────────────────────────────────
  {
    id: 'BUNDLE-EMERG-1',
    descriptionEn: 'Holds break-glass approver + finance approver — could elevate to self-pay',
    descriptionAr: 'يجمع اعتماد الوصول الطارئ والاعتماد المالي — يمكن التصعيد للصرف الذاتي',
    requiresAll: ['break_glass.approver', 'finance.approver_l1'],
    severity: 'critical',
    relatedSoDRule: 'SOD-NEW-EMERG-1',
  },
  {
    id: 'BUNDLE-EMERG-2',
    descriptionEn: 'Holds break-glass approver + reviewer — no independent oversight',
    descriptionAr: 'يجمع اعتماد ومراجعة الوصول الطارئ — لا رقابة مستقلة',
    requiresAll: ['break_glass.approver', 'break_glass.reviewer'],
    severity: 'high',
    relatedSoDRule: 'SOD-NEW-EMERG-2',
  },

  // ── Process #7 — Cross-branch transfer ──────────────────────
  {
    id: 'BUNDLE-XFER-1',
    descriptionEn: 'Holds transfer initiator + receiver — single-actor cross-branch motion',
    descriptionAr: 'يجمع بدء واستقبال نقل المستفيدين/الموظفين — حركة عبر الفروع بشخص واحد',
    requiresAll: ['transfer.initiator', 'transfer.receiver'],
    severity: 'critical',
    relatedSoDRule: 'SOD-26',
  },

  // ── Cross-program ───────────────────────────────────────────
  {
    id: 'BUNDLE-X-1',
    descriptionEn: 'Holds DPO + any audit-modify role — auditor of auditors with edit power',
    descriptionAr: 'يجمع دور DPO مع صلاحية تعديل سجل التدقيق',
    requiresAll: ['dpo', 'audit.modify'],
    severity: 'critical',
    relatedSoDRule: 'SOD-3',
  },
  {
    id: 'BUNDLE-X-2',
    descriptionEn: 'Holds super_admin + dpo — single actor wears both keys of the kingdom',
    descriptionAr: 'يجمع super_admin مع dpo — شخص واحد يحمل كل مفاتيح المنظومة',
    requiresAll: ['super_admin', 'dpo'],
    severity: 'critical',
    relatedSoDRule: 'SOD-NEW-X-1',
  },
]);

/**
 * Return list of bundle conflicts triggered by the given role set.
 * A conflict triggers when actor holds ALL of `requiresAll`.
 */
function findActorBundleConflicts(actorRoles = []) {
  const rolesSet = new Set(actorRoles);
  return ACTOR_BUNDLE_CONFLICTS.filter(c => c.requiresAll.every(r => rolesSet.has(r)));
}

/**
 * Return list of bundle conflicts that are ONE role away from
 * triggering (proactive detection). Each near-miss reports the
 * additional role that would tip it.
 */
function findActorBundleNearMisses(actorRoles = []) {
  const rolesSet = new Set(actorRoles);
  const out = [];
  for (const conflict of ACTOR_BUNDLE_CONFLICTS) {
    const missing = conflict.requiresAll.filter(r => !rolesSet.has(r));
    if (missing.length === 1) {
      out.push({ ...conflict, needRole: missing[0] });
    }
  }
  return out;
}

module.exports = {
  REVIEW_TYPE,
  REVIEW_TYPES,
  CADENCE,
  DECISION,
  DECISIONS,
  HIGH_SENSITIVITY_ROLES,
  REVIEWER_ROUTING,
  CRITERIA_FOR_TYPE,
  ACTOR_BUNDLE_CONFLICTS,
  isHighSensitivity,
  getReviewersFor,
  getCadenceFor,
  getCriteriaFor,
  getReviewTypeFor,
  findActorBundleConflicts,
  findActorBundleNearMisses,
};
