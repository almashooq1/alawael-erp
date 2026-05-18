'use strict';

/**
 * access-review-templates.registry.js — Wave 80.
 *
 * Static catalog of pre-built cycle templates for the User Access
 * Review & Recertification Program. Each template encodes the
 * "pick-actors-for-this-cycle" recipe so a DPO doesn't have to
 * hand-curate the actor list every time — they pick a template,
 * the resolver narrows the universe of users down to the matching
 * subset, the scheduler builds queues, and the cron host notifies
 * reviewers.
 *
 * A template is INTENTIONALLY static (registry, not DB). The set of
 * recertification programs is bounded by regulation (PDPL + ISO
 * 27001) and the program design in Wave 38 — adding a new template
 * is a code change, not a runtime config knob. This keeps the
 * "what cycles are even possible" surface auditable.
 *
 * Template shape:
 *   id              — kebab-case unique key
 *   nameAr/nameEn   — operator-facing label
 *   descriptionAr   — what it does
 *   reviewType      — one of REVIEW_TYPE.* (drives the default
 *                     attestation type the scheduler suggests)
 *   defaultCadence  — quarterly | monthly | weekly | continuous |
 *                     event-driven (informational; cron host decides
 *                     the actual schedule)
 *   filter          — declarative actor filter:
 *                     { roles?: string[]    — actor.roles must include AT LEAST ONE
 *                       rolesAll?: string[] — actor.roles must include ALL of these
 *                       highSensitivityOnly?: boolean
 *                       serviceAccountsOnly?: boolean
 *                       tempElevatedOnly?: boolean
 *                       scopes?: string[]   — actor.scope must match one of these
 *                       branchIds?: string[]
 *                       dormantAtLeastDays?: number
 *                                            — actor.lastUsedAt older than N days
 *                     }
 *   thresholds?     — DORMANT-only: { dormantDays, expiredDays, retiredDays }
 *
 * The resolver in access-review-templates.service.js consumes the
 * filter against an actor list the caller provides (typically the
 * IAM team's `User.find()` projection at cycle-open time).
 */

const reg = require('./access-review.registry');

const TEMPLATES = Object.freeze({
  // ── Quarterly therapist + branch staff ──────────────────────
  'quarterly-clinical': {
    id: 'quarterly-clinical',
    nameAr: 'مراجعة ربعية — الفريق السريري',
    nameEn: 'Quarterly — Clinical staff',
    descriptionAr:
      'يستهدف كل المعالجين والمشرفين السريريين وأخصائيي القبول لمراجعة الصلاحيات الأساسية',
    reviewType: reg.REVIEW_TYPE.QUARTERLY,
    defaultCadence: reg.CADENCE.QUARTERLY,
    filter: {
      roles: [
        'therapist',
        'clinical_supervisor',
        'supervisor',
        'admissions_officer',
        'receptionist',
        'social_worker',
      ],
    },
  },

  // ── Quarterly HR + finance ──────────────────────────────────
  'quarterly-back-office': {
    id: 'quarterly-back-office',
    nameAr: 'مراجعة ربعية — الإدارة والمالية',
    nameEn: 'Quarterly — Back office',
    descriptionAr: 'يستهدف موظفي HR والمالية وحفظ السجلات للمراجعة الدورية',
    reviewType: reg.REVIEW_TYPE.QUARTERLY,
    defaultCadence: reg.CADENCE.QUARTERLY,
    filter: {
      roles: ['hr_admin', 'hr_director', 'finance.payer', 'finance.approver_l1', 'records_clerk'],
    },
  },

  // ── Monthly privileged review ───────────────────────────────
  'monthly-privileged': {
    id: 'monthly-privileged',
    nameAr: 'مراجعة شهرية — الصلاحيات الحساسة',
    nameEn: 'Monthly — Privileged access',
    descriptionAr:
      'يستهدف كل الأدوار الحساسة (IAM, finance L2, audit, DPO, CISO, إلخ) لمراجعة شهرية إلزامية',
    reviewType: reg.REVIEW_TYPE.PRIVILEGED,
    defaultCadence: reg.CADENCE.MONTHLY,
    filter: {
      highSensitivityOnly: true,
    },
  },

  // ── HQ recertification ──────────────────────────────────────
  'hq-recertification': {
    id: 'hq-recertification',
    nameAr: 'إعادة اعتماد المقر الرئيسي',
    nameEn: 'HQ Recertification',
    descriptionAr: 'لأدوار الـGLOBAL/REGION التي تتجاوز نطاق الفروع — تتطلب توقيع تنفيذي وLegal',
    reviewType: reg.REVIEW_TYPE.HQ,
    defaultCadence: reg.CADENCE.QUARTERLY,
    filter: {
      scopes: ['GLOBAL', 'REGION'],
    },
  },

  // ── Branch attestation ──────────────────────────────────────
  'branch-attestation': {
    id: 'branch-attestation',
    nameAr: 'اعتماد فرع',
    nameEn: 'Branch attestation',
    descriptionAr: 'كل موظفي فرع محدد — يقودها مدير الفرع وdirector إقليمي',
    reviewType: reg.REVIEW_TYPE.BRANCH,
    defaultCadence: reg.CADENCE.QUARTERLY,
    filter: {
      scopes: ['BRANCH'],
    },
  },

  // ── Service-account audit ───────────────────────────────────
  'service-accounts': {
    id: 'service-accounts',
    nameAr: 'مراجعة حسابات الخدمة',
    nameEn: 'Service-account audit',
    descriptionAr:
      'كل حسابات الخدمة (integrations, APIs) — مراجعة ربعية بقيادة CISO + security team lead',
    reviewType: reg.REVIEW_TYPE.PRIVILEGED,
    defaultCadence: reg.CADENCE.QUARTERLY,
    filter: {
      serviceAccountsOnly: true,
    },
  },

  // ── Temporarily-elevated access ─────────────────────────────
  'temp-elevated-weekly': {
    id: 'temp-elevated-weekly',
    nameAr: 'الصلاحيات المرفوعة مؤقتًا — أسبوعي',
    nameEn: 'Temp-elevated weekly review',
    descriptionAr: 'كل الأكاونتات التي تحمل صلاحيات مرفوعة مؤقتًا — لا يجب أن تتجاوز أسبوعًا',
    reviewType: reg.REVIEW_TYPE.HIGH_RISK,
    defaultCadence: reg.CADENCE.WEEKLY,
    filter: {
      tempElevatedOnly: true,
    },
  },

  // ── Dormancy: 90 / 180 / 365 default thresholds ────────────
  'dormancy-standard': {
    id: 'dormancy-standard',
    nameAr: 'فحص الخمول — العتبات الافتراضية',
    nameEn: 'Dormancy scan — default thresholds',
    descriptionAr:
      'يحدد الحسابات الخاملة لـ90+ يوم لإعادة الاعتماد أو الإلغاء — يستخدمها cron host ليليًا',
    reviewType: reg.REVIEW_TYPE.DORMANT,
    defaultCadence: reg.CADENCE.CONTINUOUS,
    filter: {
      dormantAtLeastDays: 90,
    },
    thresholds: { dormantDays: 90, expiredDays: 180, retiredDays: 365 },
  },

  // ── Dormancy: aggressive (30/60/120) for high-sec ──────────
  'dormancy-aggressive-privileged': {
    id: 'dormancy-aggressive-privileged',
    nameAr: 'فحص خمول مكثف — للحسابات الحساسة',
    nameEn: 'Dormancy scan — aggressive (privileged)',
    descriptionAr: 'عتبات أضيق (30/60/120) للأدوار الحساسة فقط — تقليل نافذة الاستغلال',
    reviewType: reg.REVIEW_TYPE.DORMANT,
    defaultCadence: reg.CADENCE.CONTINUOUS,
    filter: {
      highSensitivityOnly: true,
      dormantAtLeastDays: 30,
    },
    thresholds: { dormantDays: 30, expiredDays: 60, retiredDays: 120 },
  },

  // ── Mover review (event-driven) ─────────────────────────────
  'mover-event-driven': {
    id: 'mover-event-driven',
    nameAr: 'مراجعة المنقولين — حسب الحدث',
    nameEn: 'Mover review — event-driven',
    descriptionAr:
      'يُستخدم من قبل HR webhook عند نقل موظف بين الأدوار/الفروع — مراجعة فورية للصلاحيات الموروثة',
    reviewType: reg.REVIEW_TYPE.MOVER,
    defaultCadence: reg.CADENCE.EVENT_DRIVEN,
    filter: {
      // No filter — caller supplies the moved actors directly via
      // /events/mover; this template is mainly for the metadata
      // and review-type hint.
    },
  },
});

// ─── API ────────────────────────────────────────────────────────

function listTemplates() {
  return Object.values(TEMPLATES).map(t => ({ ...t }));
}

function getTemplate(id) {
  return TEMPLATES[id] || null;
}

function hasTemplate(id) {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id);
}

function listTemplateIds() {
  return Object.keys(TEMPLATES);
}

module.exports = {
  TEMPLATES,
  listTemplates,
  getTemplate,
  hasTemplate,
  listTemplateIds,
};
