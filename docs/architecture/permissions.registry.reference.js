'use strict';
/**
 * permissions.registry.reference.js — GENERATED from role-permissions.seed.json
 * by gen-permissions-artifacts.js. Do NOT edit by hand; edit the seed + re-run.
 *
 * This is the TARGET shape for a centralized permission registry + a pure
 * reference can(). It is a DESIGN REFERENCE — it is NOT wired into the live
 * Express app (the live authz is backend/config/rbac.config.js with its own
 * 51-role model; reconciling the two is an explicit, separate step).
 */

/** Canonical permission keys (use P.X, never the raw string). */
const P = Object.freeze({
  "DASHBOARD_VIEW_READ": "dashboard:view:read",
  "BRANCH_ORG_READ": "branch:org:read",
  "BRANCH_ORG_CREATE": "branch:org:create",
  "BRANCH_ORG_UPDATE": "branch:org:update",
  "BRANCH_ORG_DELETE": "branch:org:delete",
  "BRANCH_SETTINGS_UPDATE": "branch:settings:update",
  "BENEFICIARY_DEMOGRAPHICS_READ": "beneficiary:demographics:read",
  "BENEFICIARY_DEMOGRAPHICS_CREATE": "beneficiary:demographics:create",
  "BENEFICIARY_DEMOGRAPHICS_UPDATE": "beneficiary:demographics:update",
  "BENEFICIARY_CLINICAL_READ": "beneficiary:clinical:read",
  "BENEFICIARY_BILLING_READ": "beneficiary:billing:read",
  "BENEFICIARY_BILLING_CREATE": "beneficiary:billing:create",
  "BENEFICIARY_BILLING_UPDATE": "beneficiary:billing:update",
  "BENEFICIARY_BILLING_APPROVE": "beneficiary:billing:approve",
  "BENEFICIARY_RECORD_DEACTIVATE": "beneficiary:record:deactivate",
  "ASSESSMENT_RECORD_READ": "assessment:record:read",
  "ASSESSMENT_RECORD_CREATE": "assessment:record:create",
  "ASSESSMENT_RECORD_UPDATE": "assessment:record:update",
  "ASSESSMENT_RECORD_APPROVE": "assessment:record:approve",
  "TREATMENT_PLAN_PLAN_READ": "treatment_plan:plan:read",
  "TREATMENT_PLAN_PLAN_CREATE": "treatment_plan:plan:create",
  "TREATMENT_PLAN_PLAN_UPDATE": "treatment_plan:plan:update",
  "TREATMENT_PLAN_PLAN_APPROVE": "treatment_plan:plan:approve",
  "TREATMENT_PLAN_PLAN_SUPERSEDE": "treatment_plan:plan:supersede",
  "SESSION_NOTE_READ": "session:note:read",
  "SESSION_NOTE_CREATE": "session:note:create",
  "SESSION_NOTE_UPDATE": "session:note:update",
  "SESSION_NOTE_APPROVE": "session:note:approve",
  "SESSION_SCHEDULE_READ": "session:schedule:read",
  "SESSION_SCHEDULE_CREATE": "session:schedule:create",
  "SESSION_SCHEDULE_UPDATE": "session:schedule:update",
  "APPOINTMENT_BOOKING_READ": "appointment:booking:read",
  "APPOINTMENT_BOOKING_CREATE": "appointment:booking:create",
  "APPOINTMENT_BOOKING_UPDATE": "appointment:booking:update",
  "APPOINTMENT_BOOKING_DELETE": "appointment:booking:delete",
  "ATTENDANCE_RECORD_READ": "attendance:record:read",
  "ATTENDANCE_RECORD_CREATE": "attendance:record:create",
  "ATTENDANCE_RECORD_UPDATE": "attendance:record:update",
  "EMPLOYEE_PROFILE_READ": "employee:profile:read",
  "EMPLOYEE_PROFILE_CREATE": "employee:profile:create",
  "EMPLOYEE_PROFILE_UPDATE": "employee:profile:update",
  "EMPLOYEE_PROFILE_DELETE": "employee:profile:delete",
  "HR_LEAVE_READ": "hr:leave:read",
  "HR_LEAVE_CREATE": "hr:leave:create",
  "HR_LEAVE_APPROVE": "hr:leave:approve",
  "HR_PAYROLL_READ": "hr:payroll:read",
  "HR_PAYROLL_PROCESS": "hr:payroll:process",
  "HR_PAYROLL_APPROVE": "hr:payroll:approve",
  "HR_PERFORMANCE_READ": "hr:performance:read",
  "HR_PERFORMANCE_CREATE": "hr:performance:create",
  "HR_PERFORMANCE_APPROVE": "hr:performance:approve",
  "REPORT_OPERATIONAL_READ": "report:operational:read",
  "REPORT_OPERATIONAL_EXPORT": "report:operational:export",
  "REPORT_CLINICAL_READ": "report:clinical:read",
  "REPORT_CLINICAL_EXPORT": "report:clinical:export",
  "REPORT_FINANCIAL_READ": "report:financial:read",
  "REPORT_FINANCIAL_EXPORT": "report:financial:export",
  "REPORT_HR_READ": "report:hr:read",
  "REPORT_HR_EXPORT": "report:hr:export",
  "REPORT_AUDIT_READ": "report:audit:read",
  "REPORT_AUDIT_EXPORT": "report:audit:export",
  "APPROVAL_REQUEST_READ": "approval:request:read",
  "APPROVAL_REQUEST_CREATE": "approval:request:create",
  "APPROVAL_DECISION_APPROVE": "approval:decision:approve",
  "USER_ACCOUNT_READ": "user:account:read",
  "USER_ACCOUNT_CREATE": "user:account:create",
  "USER_ACCOUNT_UPDATE": "user:account:update",
  "USER_ACCOUNT_DISABLE": "user:account:disable",
  "USER_ROLE_GRANT_ASSIGN": "user:role_grant:assign",
  "USER_ROLE_GRANT_REVOKE": "user:role_grant:revoke",
  "RBAC_POLICY_MANAGE": "rbac:policy:manage",
  "AUDIT_LOG_READ": "audit:log:read",
  "AUDIT_LOG_EXPORT": "audit:log:export",
  "AUDIT_LOG_UPDATE": "audit:log:update",
  "AUDIT_LOG_DELETE": "audit:log:delete"
});

/** Per-permission metadata: assurance tier, PHI flag, HQ-only, SoD ref. */
const META = Object.freeze({
  "dashboard:view:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "branch:org:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "branch:org:create": {
    "tier": 3,
    "phi": false,
    "hqOnly": true,
    "sod": null
  },
  "branch:org:update": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "branch:org:delete": {
    "tier": 3,
    "phi": false,
    "hqOnly": true,
    "sod": null
  },
  "branch:settings:update": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:demographics:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:demographics:create": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:demographics:update": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:clinical:read": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:billing:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:billing:create": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:billing:update": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:billing:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "beneficiary:record:deactivate": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "assessment:record:read": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "assessment:record:create": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "assessment:record:update": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "assessment:record:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "treatment_plan:plan:read": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "treatment_plan:plan:create": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "treatment_plan:plan:update": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "treatment_plan:plan:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": "S2"
  },
  "treatment_plan:plan:supersede": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "session:note:read": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "session:note:create": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "session:note:update": {
    "tier": 2,
    "phi": true,
    "hqOnly": false,
    "sod": null
  },
  "session:note:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "session:schedule:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "session:schedule:create": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "session:schedule:update": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "appointment:booking:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "appointment:booking:create": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "appointment:booking:update": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "appointment:booking:delete": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "attendance:record:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "attendance:record:create": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "attendance:record:update": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "employee:profile:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "employee:profile:create": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "employee:profile:update": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "employee:profile:delete": {
    "tier": 3,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "hr:leave:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "hr:leave:create": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "hr:leave:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": "S3"
  },
  "hr:payroll:read": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "hr:payroll:process": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": "S4"
  },
  "hr:payroll:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": "S4"
  },
  "hr:performance:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "hr:performance:create": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "hr:performance:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:operational:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:operational:export": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:clinical:read": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:clinical:export": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:financial:read": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:financial:export": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:hr:read": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:hr:export": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:audit:read": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "report:audit:export": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "approval:request:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "approval:request:create": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "approval:decision:approve": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": "S8"
  },
  "user:account:read": {
    "tier": 1,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "user:account:create": {
    "tier": 3,
    "phi": false,
    "hqOnly": true,
    "sod": null
  },
  "user:account:update": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "user:account:disable": {
    "tier": 3,
    "phi": false,
    "hqOnly": true,
    "sod": null
  },
  "user:role_grant:assign": {
    "tier": 3,
    "phi": false,
    "hqOnly": false,
    "sod": "S6"
  },
  "user:role_grant:revoke": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "rbac:policy:manage": {
    "tier": 3,
    "phi": false,
    "hqOnly": true,
    "sod": null
  },
  "audit:log:read": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "audit:log:export": {
    "tier": 2,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "audit:log:update": {
    "tier": null,
    "phi": false,
    "hqOnly": false,
    "sod": null
  },
  "audit:log:delete": {
    "tier": null,
    "phi": false,
    "hqOnly": false,
    "sod": null
  }
});

/** role → { permissionKey: scopePredicate } (grants only). */
const ROLE_GRANTS = Object.freeze({
  "HQA": {
    "dashboard:view:read": "own",
    "branch:org:read": "G",
    "branch:org:create": "G",
    "branch:org:update": "G",
    "branch:org:delete": "G",
    "branch:settings:update": "G",
    "beneficiary:demographics:read": "G",
    "beneficiary:billing:read": "G",
    "beneficiary:record:deactivate": "G",
    "employee:profile:read": "G",
    "employee:profile:delete": "G",
    "hr:leave:create": "SELF",
    "hr:payroll:read": "G",
    "report:operational:read": "G",
    "report:operational:export": "G",
    "report:financial:read": "G",
    "report:financial:export": "G",
    "report:hr:read": "G",
    "report:hr:export": "G",
    "report:audit:read": "G",
    "report:audit:export": "G",
    "approval:request:read": "G",
    "user:account:read": "G",
    "user:account:create": "G",
    "user:account:update": "G",
    "user:account:disable": "G",
    "user:role_grant:assign": "G",
    "user:role_grant:revoke": "G",
    "rbac:policy:manage": "G",
    "audit:log:read": "G",
    "audit:log:export": "G"
  },
  "EXD": {
    "dashboard:view:read": "own",
    "branch:org:read": "G",
    "beneficiary:demographics:read": "G",
    "beneficiary:clinical:read": "G·BG",
    "beneficiary:billing:approve": "G·!=req",
    "assessment:record:read": "G",
    "treatment_plan:plan:read": "G",
    "session:note:read": "G",
    "employee:profile:read": "G",
    "hr:leave:create": "SELF",
    "hr:leave:approve": "G·!=req",
    "hr:payroll:read": "G",
    "hr:payroll:approve": "G·!=processor",
    "hr:performance:approve": "G",
    "report:operational:read": "G",
    "report:operational:export": "G",
    "report:clinical:read": "G",
    "report:clinical:export": "G",
    "report:financial:read": "G",
    "report:financial:export": "G",
    "report:hr:read": "G",
    "report:hr:export": "G",
    "report:audit:read": "G",
    "approval:request:read": "G",
    "approval:decision:approve": "G·!=req",
    "user:account:read": "G",
    "audit:log:read": "G"
  },
  "BRM": {
    "dashboard:view:read": "own",
    "branch:org:read": "B",
    "branch:settings:update": "B",
    "beneficiary:demographics:read": "B",
    "beneficiary:demographics:create": "B",
    "beneficiary:demographics:update": "B",
    "beneficiary:clinical:read": "B",
    "beneficiary:billing:read": "B",
    "beneficiary:billing:approve": "B·<=lim,!=req",
    "beneficiary:record:deactivate": "B·!=req",
    "assessment:record:read": "B",
    "treatment_plan:plan:read": "B",
    "session:note:read": "B",
    "session:schedule:read": "B",
    "appointment:booking:read": "B",
    "appointment:booking:delete": "B",
    "attendance:record:read": "B",
    "employee:profile:read": "B",
    "hr:leave:read": "B",
    "hr:leave:create": "SELF",
    "hr:leave:approve": "B·<=14d,!=req",
    "hr:payroll:approve": "B·!=processor",
    "hr:performance:read": "B",
    "hr:performance:create": "B",
    "hr:performance:approve": "B·!=author",
    "report:operational:read": "B",
    "report:operational:export": "B",
    "report:clinical:read": "B",
    "report:clinical:export": "B",
    "report:financial:read": "B",
    "report:financial:export": "B",
    "report:hr:read": "B",
    "report:hr:export": "B",
    "approval:request:read": "B",
    "approval:request:create": "B",
    "approval:decision:approve": "B·<=lim,!=req",
    "user:account:read": "B",
    "user:role_grant:assign": "B·existing-roles,via-approval·T2",
    "user:role_grant:revoke": "B",
    "audit:log:read": "B"
  },
  "UNS": {
    "dashboard:view:read": "own",
    "beneficiary:demographics:read": "U",
    "beneficiary:clinical:read": "U",
    "assessment:record:read": "U",
    "assessment:record:create": "U",
    "assessment:record:update": "U",
    "assessment:record:approve": "U·!=author",
    "treatment_plan:plan:read": "U",
    "treatment_plan:plan:update": "U·[draft,pending]",
    "treatment_plan:plan:approve": "U·!=author",
    "session:note:read": "U",
    "session:note:update": "U",
    "session:note:approve": "U·!=author",
    "session:schedule:read": "U",
    "session:schedule:create": "U",
    "session:schedule:update": "U",
    "appointment:booking:read": "U",
    "attendance:record:read": "U",
    "attendance:record:update": "U",
    "employee:profile:read": "U",
    "hr:leave:read": "U",
    "hr:leave:create": "SELF",
    "hr:leave:approve": "U·<=3d,!=req",
    "hr:performance:read": "U",
    "hr:performance:create": "U",
    "report:operational:read": "U",
    "report:operational:export": "U",
    "report:clinical:read": "U",
    "report:clinical:export": "U",
    "approval:request:read": "U",
    "approval:request:create": "U",
    "approval:decision:approve": "U·!=req"
  },
  "THR": {
    "dashboard:view:read": "own",
    "beneficiary:demographics:read": "S",
    "beneficiary:demographics:create": "S",
    "beneficiary:demographics:update": "S",
    "beneficiary:clinical:read": "S",
    "assessment:record:read": "S",
    "assessment:record:create": "S",
    "assessment:record:update": "S",
    "treatment_plan:plan:read": "S",
    "treatment_plan:plan:create": "S",
    "treatment_plan:plan:update": "S·[draft]",
    "treatment_plan:plan:supersede": "S",
    "session:note:read": "S",
    "session:note:create": "S",
    "session:note:update": "S·[draft]",
    "session:schedule:read": "S",
    "session:schedule:create": "S",
    "session:schedule:update": "S",
    "appointment:booking:read": "S",
    "appointment:booking:create": "S",
    "appointment:booking:update": "S",
    "attendance:record:read": "S",
    "attendance:record:create": "S",
    "employee:profile:read": "SELF",
    "hr:leave:read": "SELF",
    "hr:leave:create": "SELF",
    "hr:performance:read": "SELF",
    "report:clinical:read": "S",
    "approval:request:read": "S",
    "approval:request:create": "S"
  },
  "REC": {
    "dashboard:view:read": "own",
    "beneficiary:demographics:read": "B",
    "beneficiary:demographics:create": "B",
    "beneficiary:demographics:update": "B",
    "session:schedule:read": "B",
    "session:schedule:create": "B",
    "session:schedule:update": "B",
    "appointment:booking:read": "B",
    "appointment:booking:create": "B",
    "appointment:booking:update": "B",
    "appointment:booking:delete": "B",
    "attendance:record:read": "B",
    "attendance:record:create": "B",
    "attendance:record:update": "B",
    "employee:profile:read": "SELF",
    "hr:leave:read": "SELF",
    "hr:leave:create": "SELF",
    "hr:performance:read": "SELF",
    "report:operational:read": "B",
    "approval:request:read": "B",
    "approval:request:create": "B"
  },
  "HRO": {
    "dashboard:view:read": "own",
    "attendance:record:read": "B",
    "employee:profile:read": "B",
    "employee:profile:create": "B",
    "employee:profile:update": "B·!=self",
    "employee:profile:delete": "B·!=req",
    "hr:leave:read": "B",
    "hr:leave:create": "SELF",
    "hr:payroll:read": "B",
    "hr:payroll:process": "B",
    "hr:performance:read": "B",
    "report:hr:read": "B",
    "report:hr:export": "B",
    "approval:request:read": "B",
    "approval:request:create": "B"
  },
  "FIN": {
    "dashboard:view:read": "own",
    "beneficiary:demographics:read": "B",
    "beneficiary:billing:read": "B",
    "beneficiary:billing:create": "B",
    "beneficiary:billing:update": "B",
    "appointment:booking:read": "B",
    "hr:leave:read": "SELF",
    "hr:leave:create": "SELF",
    "hr:payroll:read": "B",
    "report:financial:read": "B",
    "report:financial:export": "B",
    "approval:request:read": "B",
    "approval:request:create": "B"
  },
  "AUD": {
    "dashboard:view:read": "own",
    "branch:org:read": "G",
    "beneficiary:demographics:read": "G",
    "beneficiary:clinical:read": "G",
    "beneficiary:billing:read": "G",
    "assessment:record:read": "G",
    "treatment_plan:plan:read": "G",
    "session:note:read": "G",
    "session:schedule:read": "G",
    "appointment:booking:read": "G",
    "attendance:record:read": "G",
    "employee:profile:read": "G",
    "hr:leave:read": "G",
    "hr:payroll:read": "G",
    "hr:performance:read": "G",
    "report:operational:read": "G",
    "report:operational:export": "G",
    "report:clinical:read": "G",
    "report:clinical:export": "G",
    "report:financial:read": "G",
    "report:financial:export": "G",
    "report:hr:read": "G",
    "report:hr:export": "G",
    "report:audit:read": "G",
    "report:audit:export": "G",
    "approval:request:read": "G",
    "user:account:read": "G",
    "audit:log:read": "G",
    "audit:log:export": "G"
  }
});

/** role → [explicitly denied permission keys] (hard, overrides inheritance). */
const ROLE_DENY = Object.freeze({
  "HQA": [
    "beneficiary:clinical:read",
    "assessment:record:read",
    "treatment_plan:plan:read",
    "session:note:read",
    "report:clinical:read",
    "report:clinical:export",
    "audit:log:update",
    "audit:log:delete"
  ],
  "REC": [
    "beneficiary:clinical:read",
    "beneficiary:billing:create",
    "beneficiary:billing:update",
    "assessment:record:read",
    "treatment_plan:plan:read",
    "session:note:read",
    "report:clinical:read",
    "report:clinical:export",
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "HRO": [
    "beneficiary:clinical:read",
    "assessment:record:read",
    "treatment_plan:plan:read",
    "session:note:read",
    "report:clinical:read",
    "report:clinical:export",
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "FIN": [
    "beneficiary:clinical:read",
    "assessment:record:read",
    "treatment_plan:plan:read",
    "session:note:read",
    "report:clinical:read",
    "report:clinical:export",
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "THR": [
    "beneficiary:billing:create",
    "beneficiary:billing:update",
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "UNS": [
    "beneficiary:billing:create",
    "beneficiary:billing:update",
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "EXD": [
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "BRM": [
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ],
  "AUD": [
    "user:account:create",
    "rbac:policy:manage",
    "audit:log:update",
    "audit:log:delete"
  ]
});

const ALL = Object.freeze(Object.values(P));

/**
 * Pure reference decision. Real enforcement also evaluates scope against the
 * row, lifecycle state, threshold, maker!=checker, and the SoD engine — this
 * returns the static grant/deny + the predicate to evaluate at the call site.
 * @returns {{allow:boolean, scope?:string, tier:(number|null), reason:string}}
 */
function can(roleCode, permissionKey) {
  const m = META[permissionKey];
  if (!m) return { allow: false, tier: null, reason: 'unknown-permission' };
  if ((ROLE_DENY[roleCode] || []).includes(permissionKey))
    return { allow: false, tier: m.tier, reason: 'explicit-deny' };
  const scope = (ROLE_GRANTS[roleCode] || {})[permissionKey];
  if (!scope) return { allow: false, tier: m.tier, reason: 'ungranted' };
  return { allow: true, scope, tier: m.tier, reason: 'granted' };
}

module.exports = { P, META, ROLE_GRANTS, ROLE_DENY, ALL, can };
