'use strict';

/**
 * beneficiary-lifecycle.registry.js — Wave 39 (Beneficiary 360 Phase 1).
 *                                     — Wave 581 (lifecycle completion:
 *                                       waitlisted + deceased states).
 *
 * State machine + transition matrix for the Beneficiary 360 Enterprise
 * Master Record. Pure registry — no DB, no I/O. The service layer
 * (beneficiary-lifecycle.service.js) reads this to validate transitions
 * + route approvals + invoke side-effects.
 *
 * Aligned with §2 of the Beneficiary 360 design blueprint:
 *
 *   intake → draft ──admit──────────────→ active
 *                 ↘── waitlist → waitlisted ──admit──→ active
 *                                          ↘─ cancel_waitlist → archived
 *   active
 *     ↘── suspended → active
 *     ↘── transferred-pending → transferred → (active@new_branch)
 *     ↘── discharged → archived
 *     ↘── record_deceased → deceased → archived   (terminal clinical event)
 *     ↘── deletion-pending → deleted (DPO+ approved)
 *   archived → restored → active   (rare; DPO + clinical lead)
 *   deleted  → (no return; tombstone only)
 *
 * Every transition carries: required approvers, MFA tier, Nafath
 * requirement, reason-code allowlist, and named side-effects that the
 * service will dispatch to injected callbacks.
 */

// ─── States ─────────────────────────────────────────────────────────

const LIFECYCLE_STATES = Object.freeze({
  DRAFT: 'draft',
  WAITLISTED: 'waitlisted', // W581 — admitted-to-queue, awaiting capacity
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRANSFERRED_PENDING: 'transferred-pending',
  TRANSFERRED: 'transferred',
  DISCHARGED: 'discharged',
  DECEASED: 'deceased', // W581 — clinical death event (terminal, archive-only exit)
  ARCHIVED: 'archived',
  DELETION_PENDING: 'deletion-pending',
  DELETED: 'deleted',
});

const STATES = Object.freeze(Object.values(LIFECYCLE_STATES));

// ─── Workflow status (per transition record) ───────────────────────

const TRANSITION_STATUS = Object.freeze({
  PENDING: 'pending', // awaiting approvals
  APPROVED: 'approved', // all approvals in, awaiting execution
  EXECUTED: 'executed', // side-effects done, transition committed
  REJECTED: 'rejected', // any approver explicitly rejected
  CANCELLED: 'cancelled', // initiator or DPO cancelled before execute
  REVERSED: 'reversed', // executed but reversed within reversal window
  FAILED: 'failed', // execution failed (technical error)
});

const STATUSES = Object.freeze(Object.values(TRANSITION_STATUS));

// ─── Reason-code namespaces (per-transition allowlists below) ──────

const REASON_CODES = Object.freeze({
  CANCEL_WAITLIST: ['family-withdrew', 'no-capacity', 'ineligible', 'found-alternative', 'admin'],
  SUSPEND: ['medical', 'family', 'billing', 'admin'],
  REACTIVATE: ['medical-clear', 'family-resolved', 'billing-resolved', 'admin'],
  TRANSFER: ['clinical-need', 'family-relocation', 'capacity', 'admin', 'regulator-required'],
  DISCHARGE: ['goals-met', 'family-request', 'medical', 'aged-out', 'no-show', 'other'],
  DECEASED: ['natural', 'medical-complication', 'accident', 'unknown', 'other'],
  ARCHIVE: ['discharged-retention', 'inactive-long', 'deceased-retention', 'admin'],
  RESTORE: ['data-correction', 'family-return', 'clinical-need', 'admin'],
  REQUEST_DELETE: ['pdpl-erasure', 'duplicate-record', 'wrong-record', 'test-data'],
  CANCEL_DELETION: ['retention-still-active', 'legal-hold', 'family-withdrew-request', 'admin'],
});

// ─── Transitions ────────────────────────────────────────────────────

const TRANSITIONS = Object.freeze([
  {
    id: 'waitlist',
    descriptionAr: 'إدراج المستفيد على قائمة الانتظار',
    descriptionEn: 'Place beneficiary on the admission waitlist',
    from: [LIFECYCLE_STATES.DRAFT],
    to: LIFECYCLE_STATES.WAITLISTED,
    requiredApproverRoles: ['admissions_officer'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: false,
    allowedReasonCodes: null,
    sideEffects: ['enqueue-waitlist', 'notify-family-waitlisted'],
    severity: 'low',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.waitlist',
  },
  {
    id: 'cancel_waitlist',
    descriptionAr: 'إلغاء إدراج المستفيد من قائمة الانتظار',
    descriptionEn: 'Remove beneficiary from the waitlist (no admission)',
    from: [LIFECYCLE_STATES.WAITLISTED],
    to: LIFECYCLE_STATES.ARCHIVED,
    requiredApproverRoles: ['admissions_officer', 'branch_manager'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.CANCEL_WAITLIST,
    sideEffects: ['dequeue-waitlist', 'notify-family-waitlist-cancelled'],
    severity: 'medium',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.waitlist.cancel',
  },
  {
    id: 'admit',
    descriptionAr: 'قبول وتفعيل المستفيد',
    descriptionEn: 'Admit and activate beneficiary',
    from: [LIFECYCLE_STATES.DRAFT, LIFECYCLE_STATES.WAITLISTED],
    to: LIFECYCLE_STATES.ACTIVE,
    requiredApproverRoles: ['admissions_officer', 'clinical_lead'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: false,
    allowedReasonCodes: null,
    sideEffects: ['create-care-team', 'enroll-in-program', 'notify-family-welcome'],
    severity: 'medium',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.admit',
  },
  {
    id: 'suspend',
    descriptionAr: 'تعليق ملف المستفيد',
    descriptionEn: 'Suspend beneficiary record',
    from: [LIFECYCLE_STATES.ACTIVE],
    to: LIFECYCLE_STATES.SUSPENDED,
    requiredApproverRoles: ['branch_manager'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.SUSPEND,
    sideEffects: ['pause-schedule', 'notify-family-suspension', 'notify-team'],
    severity: 'medium',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.suspend',
  },
  {
    id: 'reactivate',
    descriptionAr: 'إعادة تفعيل ملف المستفيد',
    descriptionEn: 'Reactivate suspended beneficiary',
    from: [LIFECYCLE_STATES.SUSPENDED],
    to: LIFECYCLE_STATES.ACTIVE,
    requiredApproverRoles: ['branch_manager'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.REACTIVATE,
    sideEffects: ['resume-schedule', 'notify-family-resumption', 'notify-team'],
    severity: 'low',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.reactivate',
  },
  {
    id: 'initiate_transfer',
    descriptionAr: 'بدء نقل المستفيد لفرع آخر',
    descriptionEn: 'Initiate cross-branch transfer',
    from: [LIFECYCLE_STATES.ACTIVE],
    to: LIFECYCLE_STATES.TRANSFERRED_PENDING,
    requiredApproverRoles: ['hr_or_admissions', 'dpo'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.TRANSFER,
    sideEffects: ['freeze-record', 'notify-destination-branch', 'open-cross-branch-temp-elevated'],
    compensatingOps: ['unfreeze-record', 'close-cross-branch-temp-elevated'],
    severity: 'critical',
    reversalWindowDays: 30,
    auditCategory: 'beneficiary.lifecycle.transfer.initiate',
  },
  {
    id: 'complete_transfer',
    descriptionAr: 'إتمام نقل المستفيد',
    descriptionEn: 'Complete cross-branch transfer',
    from: [LIFECYCLE_STATES.TRANSFERRED_PENDING],
    to: LIFECYCLE_STATES.TRANSFERRED,
    requiredApproverRoles: ['destination_admissions', 'destination_clinical_lead'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: false,
    allowedReasonCodes: null,
    sideEffects: [
      'cut-over-atomic',
      'create-at-destination',
      'source-tombstone-pointer',
      'data-handoff-minimum-necessary',
      'close-cross-branch-temp-elevated',
    ],
    compensatingOps: ['rollback-transfer-destination'],
    severity: 'critical',
    reversalWindowDays: 30,
    auditCategory: 'beneficiary.lifecycle.transfer.complete',
  },
  {
    id: 'reverse_transfer',
    descriptionAr: 'إلغاء نقل قيد التنفيذ',
    descriptionEn: 'Reverse a pending transfer',
    from: [LIFECYCLE_STATES.TRANSFERRED_PENDING],
    to: LIFECYCLE_STATES.ACTIVE,
    requiredApproverRoles: ['hr_or_admissions', 'dpo'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.TRANSFER, // shared list
    sideEffects: [
      'unfreeze-record',
      'notify-destination-cancellation',
      'close-cross-branch-temp-elevated',
    ],
    severity: 'high',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.transfer.reverse',
  },
  {
    id: 'discharge',
    descriptionAr: 'تخرج وإغلاق ملف المستفيد',
    descriptionEn: 'Discharge beneficiary with clinical closure',
    from: [LIFECYCLE_STATES.ACTIVE, LIFECYCLE_STATES.SUSPENDED],
    to: LIFECYCLE_STATES.DISCHARGED,
    requiredApproverRoles: ['clinical_lead', 'family_acknowledgment'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.DISCHARGE,
    sideEffects: [
      'generate-closure-report',
      'end-active-schedules',
      'release-care-team',
      'notify-family-discharge',
      'notify-school-if-coordinated',
    ],
    compensatingOps: ['restore-cancelled-appointments', 'reactivate-care-team'],
    severity: 'high',
    reversalWindowDays: 14,
    auditCategory: 'beneficiary.lifecycle.discharge',
  },
  {
    id: 'record_deceased',
    descriptionAr: 'تسجيل وفاة المستفيد',
    descriptionEn: 'Record beneficiary death (clinical terminal event)',
    from: [LIFECYCLE_STATES.ACTIVE, LIFECYCLE_STATES.SUSPENDED],
    to: LIFECYCLE_STATES.DECEASED,
    requiredApproverRoles: ['clinical_lead', 'branch_director'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.DECEASED,
    sideEffects: [
      'end-active-schedules',
      'close-open-episodes',
      'release-care-team',
      'generate-closure-report',
      'notify-family-condolence',
      'notify-regulator-if-required',
    ],
    compensatingOps: [
      'restore-cancelled-appointments',
      'reopen-closed-episodes',
      'reactivate-care-team',
    ],
    severity: 'critical',
    reversalWindowDays: 14, // data-entry-error correction window only
    auditCategory: 'beneficiary.lifecycle.deceased',
  },
  {
    id: 'archive',
    descriptionAr: 'أرشفة ملف المستفيد',
    descriptionEn: 'Archive beneficiary record per retention policy',
    from: [
      LIFECYCLE_STATES.DISCHARGED,
      LIFECYCLE_STATES.DECEASED,
      LIFECYCLE_STATES.ACTIVE,
      LIFECYCLE_STATES.SUSPENDED,
    ],
    to: LIFECYCLE_STATES.ARCHIVED,
    requiredApproverRoles: ['branch_director', 'dpo'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.ARCHIVE,
    sideEffects: [
      'remove-from-active-lists',
      'compute-retention-expiry',
      'anchor-archive-certificate',
    ],
    severity: 'high',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.archive',
  },
  {
    id: 'restore',
    descriptionAr: 'استعادة ملف من الأرشيف',
    descriptionEn: 'Restore from archive',
    from: [LIFECYCLE_STATES.ARCHIVED],
    to: LIFECYCLE_STATES.ACTIVE,
    requiredApproverRoles: ['dpo', 'clinical_lead'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.RESTORE,
    sideEffects: ['restore-care-team', 'restore-from-archive', 'notify-family-restoration'],
    severity: 'high',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.restore',
  },
  {
    id: 'request_deletion',
    descriptionAr: 'طلب حذف ملف المستفيد',
    descriptionEn: 'Request beneficiary record deletion',
    from: [
      LIFECYCLE_STATES.ACTIVE,
      LIFECYCLE_STATES.SUSPENDED,
      LIFECYCLE_STATES.DISCHARGED,
      LIFECYCLE_STATES.ARCHIVED,
    ],
    to: LIFECYCLE_STATES.DELETION_PENDING,
    requiredApproverRoles: ['dpo'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.REQUEST_DELETE,
    sideEffects: ['run-retention-check', 'run-impact-analysis', 'queue-dpo-review'],
    severity: 'critical',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.delete.request',
  },
  {
    id: 'approve_deletion',
    descriptionAr: 'اعتماد حذف ملف المستفيد',
    descriptionEn: 'Approve deletion (DPO + Legal + CEO)',
    from: [LIFECYCLE_STATES.DELETION_PENDING],
    to: LIFECYCLE_STATES.DELETED,
    requiredApproverRoles: ['dpo', 'legal', 'ceo'],
    mfaTier: 3,
    requiresNafath: true,
    requiresReason: false, // reason captured at request_deletion
    allowedReasonCodes: null,
    sideEffects: [
      'soft-delete-30d',
      'create-tombstone',
      'anchor-deletion-certificate',
      'notify-nphies-void',
      'notify-zatca-ack',
      'family-receipt-of-erasure',
    ],
    severity: 'critical',
    reversalWindowDays: 30, // soft-delete window
    auditCategory: 'beneficiary.lifecycle.delete.approve',
  },
  {
    id: 'cancel_deletion',
    descriptionAr: 'إلغاء طلب الحذف',
    descriptionEn: 'Cancel a pending deletion request',
    from: [LIFECYCLE_STATES.DELETION_PENDING],
    to: LIFECYCLE_STATES.ARCHIVED, // returns to archived state by default
    requiredApproverRoles: ['dpo'],
    mfaTier: 2,
    requiresNafath: false,
    requiresReason: true,
    allowedReasonCodes: REASON_CODES.CANCEL_DELETION,
    sideEffects: ['dequeue-dpo-review', 'restore-to-archived'],
    severity: 'medium',
    reversalWindowDays: null,
    auditCategory: 'beneficiary.lifecycle.delete.cancel',
  },
]);

const TRANSITION_BY_ID = Object.freeze(
  TRANSITIONS.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {})
);

// HIGH-sensitivity transitions get AnchorLedger commits + 10-year audit retention
const HIGH_SENSITIVITY_TRANSITIONS = Object.freeze(
  new Set(
    TRANSITIONS.filter(t => t.severity === 'critical' || t.severity === 'high').map(t => t.id)
  )
);

// ─── Helpers ───────────────────────────────────────────────────────

// Wave 94 — state-machine primitives delegated to workflow.lib so the
// platform's 5 parallel workflows can share one validator. We preserve
// findTransition + getAllowedTransitionsFrom over the local TRANSITIONS
// array so callers that compare transition object identity (e.g., the
// service's `reg.findTransition(id) === t` patterns) continue to work
// — the lib's frozen copy would be a different reference.
const { defineWorkflow } = require('./workflow.lib');
const _workflow = defineWorkflow({
  id: 'beneficiary-lifecycle',
  states: [...STATES],
  transitions: TRANSITIONS.map(t => ({ id: t.id, from: [...t.from], to: t.to })),
  finalStates: [LIFECYCLE_STATES.DELETED],
});

function findTransition(transitionId) {
  return TRANSITION_BY_ID[transitionId] || null;
}

function getAllowedTransitionsFrom(currentState) {
  return TRANSITIONS.filter(t => t.from.includes(currentState));
}

function validateTransitionRequest({ fromState, transitionId }) {
  const r = _workflow.validateTransition({ fromState, transitionId });
  if (!r.valid) return r;
  // The lib returned its frozen copy; swap to the registry's original
  // transition object so existing callers that read transition.severity /
  // .mfaTier / .sideEffects / etc. (fields beyond the state-machine
  // contract) keep working unchanged.
  return { valid: true, transition: TRANSITION_BY_ID[transitionId] };
}

function requiresNafath(transitionId) {
  const t = findTransition(transitionId);
  return !!(t && t.requiresNafath);
}

function getRequiredApprovers(transitionId) {
  const t = findTransition(transitionId);
  return t ? [...t.requiredApproverRoles] : [];
}

function isHighSensitivity(transitionId) {
  return HIGH_SENSITIVITY_TRANSITIONS.has(transitionId);
}

function getMfaTier(transitionId) {
  const t = findTransition(transitionId);
  return t ? t.mfaTier : null;
}

function getAllowedReasonCodes(transitionId) {
  const t = findTransition(transitionId);
  return t && t.allowedReasonCodes ? [...t.allowedReasonCodes] : null;
}

function isValidReasonCode(transitionId, code) {
  const allowed = getAllowedReasonCodes(transitionId);
  if (allowed === null) return true; // no allowlist → any code OK (or none required)
  return allowed.includes(code);
}

function getSideEffects(transitionId) {
  const t = findTransition(transitionId);
  return t ? [...t.sideEffects] : [];
}

function getCompensatingOps(transitionId) {
  const t = findTransition(transitionId);
  return t && Array.isArray(t.compensatingOps) ? [...t.compensatingOps] : [];
}

module.exports = {
  LIFECYCLE_STATES,
  STATES,
  TRANSITION_STATUS,
  STATUSES,
  REASON_CODES,
  TRANSITIONS,
  TRANSITION_BY_ID,
  HIGH_SENSITIVITY_TRANSITIONS,
  findTransition,
  getAllowedTransitionsFrom,
  validateTransitionRequest,
  requiresNafath,
  getRequiredApprovers,
  isHighSensitivity,
  getMfaTier,
  getAllowedReasonCodes,
  isValidReasonCode,
  getSideEffects,
  getCompensatingOps,
};
