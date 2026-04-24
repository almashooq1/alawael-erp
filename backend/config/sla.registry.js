'use strict';

/**
 * sla.registry.js — Phase 16 Commit 1 (4.0.66).
 *
 * Central, read-only catalogue of every Service Level Agreement /
 * Operational Level Agreement the ops layer cares about. Pure data,
 * no I/O. Consumed by:
 *
 *   • `services/operations/slaEngine.service.js` — uses the registry
 *     to know what to watch, what the targets are, and what events
 *     to emit at warning/pre-breach/breach crossings.
 *
 *   • `routes/operations/slaEngine.routes.js` — exposes the catalogue
 *     (`GET /reference`) so admin UIs can render the list and the
 *     current runtime stats side-by-side.
 *
 *   • `config/notification-policies.registry.js` — Phase 15 policies
 *     subscribe to `ops.sla.breached` and `ops.sla.pre_breach` so the
 *     escalation matrix hooks into the existing notification router.
 *
 * Definition shape:
 *
 *   {
 *     id,                    // stable, kebab-case, globally unique
 *     module,                // OPS_MODULES member
 *     event,                 // source event that starts the clock
 *                            // (matches bus.on patterns)
 *     label,                 // EN label (short)
 *     labelAr,               // AR label (short)
 *     severity,              // SEVERITIES member
 *     responseTargetMinutes, // time-to-first-response (0 to disable)
 *     resolutionTargetMinutes, // time-to-close (required, > response)
 *     businessHoursOnly,     // pause clock outside business hours
 *     pauseOnStates,         // ticket/WO/PR states that freeze the clock
 *     escalation,            // [{ afterMinutes, notifyRoles }, …]
 *     warnAtPct,             // emit pre-breach at this % of target (default 80)
 *     breachEvent,           // event name to emit on breach
 *     preBreachEvent,        // event name to emit on warning
 *     metadata,              // free-form (e.g. { cbahi: '...', source: '...' })
 *   }
 *
 * Every entry MUST reference a module from OPS_MODULES and a severity
 * from SEVERITIES. The engine validates this on boot.
 *
 * Why the engine doesn't hard-code these: ops SLAs change by contract,
 * by regulator, by branch. Keeping them as frozen data means a policy
 * tweak is a one-line diff, not a schema migration.
 */

// ── taxonomy ────────────────────────────────────────────────────────

const OPS_MODULES = Object.freeze([
  'helpdesk',
  'maintenance',
  'procurement',
  'appointment',
  'session',
  'transport',
  'meeting',
  'inventory',
  'correspondence',
  'facility',
  'crm', // Phase 17 C1
  'social', // Phase 17 C2
  'psych', // Phase 17 C5
]);

const SEVERITIES = Object.freeze(['critical', 'high', 'normal', 'low']);

const MIN = 1;
const HOUR = 60;
const DAY = 24 * HOUR;

// ── registry ────────────────────────────────────────────────────────

const SLAS = Object.freeze([
  // ── Helpdesk (internal IT + facilities support) ─────────────────
  {
    id: 'helpdesk.ticket.critical',
    module: 'helpdesk',
    event: 'ops.ticket.created',
    label: 'Critical helpdesk ticket',
    labelAr: 'بلاغ دعم حرج',
    severity: 'critical',
    responseTargetMinutes: 15 * MIN,
    resolutionTargetMinutes: 4 * HOUR,
    businessHoursOnly: false,
    pauseOnStates: ['waiting_on_requester'],
    escalation: [
      { afterMinutes: 30 * MIN, notifyRoles: ['helpdesk_lead'] },
      { afterMinutes: 2 * HOUR, notifyRoles: ['ops_manager'] },
      { afterMinutes: 4 * HOUR, notifyRoles: ['coo'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { filterBy: { priority: 'critical' } },
  },
  {
    id: 'helpdesk.ticket.high',
    module: 'helpdesk',
    event: 'ops.ticket.created',
    label: 'High-priority helpdesk ticket',
    labelAr: 'بلاغ دعم عالٍ',
    severity: 'high',
    responseTargetMinutes: 60 * MIN,
    resolutionTargetMinutes: 8 * HOUR,
    businessHoursOnly: true,
    pauseOnStates: ['waiting_on_requester'],
    escalation: [
      { afterMinutes: 4 * HOUR, notifyRoles: ['helpdesk_lead'] },
      { afterMinutes: 8 * HOUR, notifyRoles: ['ops_manager'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { filterBy: { priority: 'high' } },
  },
  {
    id: 'helpdesk.ticket.normal',
    module: 'helpdesk',
    event: 'ops.ticket.created',
    label: 'Normal helpdesk ticket',
    labelAr: 'بلاغ دعم عادي',
    severity: 'normal',
    responseTargetMinutes: 4 * HOUR,
    resolutionTargetMinutes: 2 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['waiting_on_requester'],
    escalation: [{ afterMinutes: 1 * DAY, notifyRoles: ['helpdesk_lead'] }],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { filterBy: { priority: 'normal' } },
  },

  // ── Maintenance work orders ─────────────────────────────────────
  {
    id: 'maintenance.wo.critical',
    module: 'maintenance',
    event: 'ops.wo.created',
    label: 'Critical maintenance work order',
    labelAr: 'أمر صيانة حرج',
    severity: 'critical',
    responseTargetMinutes: 30 * MIN,
    resolutionTargetMinutes: 4 * HOUR,
    businessHoursOnly: false,
    pauseOnStates: ['on_hold', 'blocked'],
    escalation: [
      { afterMinutes: 1 * HOUR, notifyRoles: ['maintenance_supervisor'] },
      { afterMinutes: 2 * HOUR, notifyRoles: ['facility_manager'] },
      { afterMinutes: 4 * HOUR, notifyRoles: ['coo'] },
    ],
    warnAtPct: 75,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { filterBy: { priority: 'critical' } },
  },
  {
    id: 'maintenance.wo.high',
    module: 'maintenance',
    event: 'ops.wo.created',
    label: 'High-priority work order',
    labelAr: 'أمر صيانة عالٍ',
    severity: 'high',
    responseTargetMinutes: 2 * HOUR,
    resolutionTargetMinutes: 1 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['on_hold', 'blocked'],
    escalation: [
      { afterMinutes: 8 * HOUR, notifyRoles: ['maintenance_supervisor'] },
      { afterMinutes: 1 * DAY, notifyRoles: ['facility_manager'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { filterBy: { priority: 'high' } },
  },
  {
    id: 'maintenance.wo.preventive',
    module: 'maintenance',
    event: 'ops.wo.created',
    label: 'Preventive maintenance work order',
    labelAr: 'صيانة وقائية',
    severity: 'normal',
    responseTargetMinutes: 0, // no response SLA for scheduled PM
    resolutionTargetMinutes: 7 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['on_hold', 'blocked'],
    escalation: [{ afterMinutes: 5 * DAY, notifyRoles: ['maintenance_supervisor'] }],
    warnAtPct: 85,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { filterBy: { type: 'preventive' } },
  },

  // ── Procurement (PR → PO) ───────────────────────────────────────
  {
    id: 'procurement.pr.approval',
    module: 'procurement',
    event: 'ops.pr.submitted',
    label: 'Purchase request approval cycle',
    labelAr: 'اعتماد طلب الشراء',
    severity: 'high',
    responseTargetMinutes: 4 * HOUR,
    resolutionTargetMinutes: 2 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['returned_for_clarification'],
    escalation: [
      { afterMinutes: 1 * DAY, notifyRoles: ['procurement_manager'] },
      { afterMinutes: 2 * DAY, notifyRoles: ['cfo'] },
    ],
    warnAtPct: 75,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },
  {
    id: 'procurement.po.issuance',
    module: 'procurement',
    event: 'ops.pr.approved',
    label: 'PO issuance after PR approval',
    labelAr: 'إصدار أمر شراء بعد الاعتماد',
    severity: 'normal',
    responseTargetMinutes: 0,
    resolutionTargetMinutes: 3 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_quotes'],
    escalation: [{ afterMinutes: 2 * DAY, notifyRoles: ['procurement_manager'] }],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },

  // ── Appointments (external SLA — beneficiary facing) ────────────
  {
    id: 'appointment.confirmation',
    module: 'appointment',
    event: 'ops.appointment.requested',
    label: 'Appointment confirmation',
    labelAr: 'تأكيد الموعد',
    severity: 'high',
    responseTargetMinutes: 2 * HOUR,
    resolutionTargetMinutes: 4 * HOUR,
    businessHoursOnly: true,
    pauseOnStates: [],
    escalation: [
      { afterMinutes: 3 * HOUR, notifyRoles: ['scheduling_coordinator'] },
      { afterMinutes: 4 * HOUR, notifyRoles: ['branch_manager'] },
    ],
    warnAtPct: 75,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: true },
  },

  // ── Sessions (runtime delay) ────────────────────────────────────
  {
    id: 'session.start_delay',
    module: 'session',
    event: 'ops.session.scheduled',
    label: 'Session start (on-time)',
    labelAr: 'انطلاق الجلسة في موعدها',
    severity: 'high',
    responseTargetMinutes: 15 * MIN, // allow 15min grace after scheduled start
    resolutionTargetMinutes: 30 * MIN,
    businessHoursOnly: false,
    pauseOnStates: ['cancelled', 'rescheduled'],
    escalation: [
      { afterMinutes: 20 * MIN, notifyRoles: ['therapist_supervisor'] },
      { afterMinutes: 30 * MIN, notifyRoles: ['branch_manager'] },
    ],
    warnAtPct: 70,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: true, triggersAt: 'scheduledStart' },
  },

  // ── Transport ───────────────────────────────────────────────────
  {
    id: 'transport.trip.pickup',
    module: 'transport',
    event: 'ops.trip.scheduled',
    label: 'Beneficiary pickup on-time',
    labelAr: 'التقاط المستفيد في موعده',
    severity: 'critical',
    responseTargetMinutes: 10 * MIN,
    resolutionTargetMinutes: 20 * MIN,
    businessHoursOnly: false,
    pauseOnStates: ['cancelled'],
    escalation: [
      { afterMinutes: 15 * MIN, notifyRoles: ['dispatcher'] },
      { afterMinutes: 20 * MIN, notifyRoles: ['fleet_manager'] },
    ],
    warnAtPct: 60,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: true, triggersAt: 'scheduledPickup' },
  },

  // ── Meetings (governance) ───────────────────────────────────────
  {
    id: 'meeting.minutes.publish',
    module: 'meeting',
    event: 'ops.meeting.ended',
    label: 'Meeting minutes publication',
    labelAr: 'نشر محضر الاجتماع',
    severity: 'normal',
    responseTargetMinutes: 0,
    resolutionTargetMinutes: 2 * DAY,
    businessHoursOnly: true,
    pauseOnStates: [],
    escalation: [{ afterMinutes: 2 * DAY, notifyRoles: ['meeting_secretary'] }],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },
  {
    id: 'meeting.decision.execution',
    module: 'meeting',
    event: 'ops.meeting.decision_assigned',
    label: 'Meeting decision execution',
    labelAr: 'تنفيذ قرار الاجتماع',
    severity: 'high',
    responseTargetMinutes: 0,
    resolutionTargetMinutes: 14 * DAY, // default — actual clock uses decision.dueDate when provided
    businessHoursOnly: true,
    pauseOnStates: ['cancelled'],
    escalation: [
      { afterMinutes: 10 * DAY, notifyRoles: ['decision_owner'] },
      { afterMinutes: 14 * DAY, notifyRoles: ['meeting_chair'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { dueDateField: 'dueDate' },
  },

  // ── Inventory ───────────────────────────────────────────────────
  {
    id: 'inventory.stockout.replenishment',
    module: 'inventory',
    event: 'ops.inventory.below_min',
    label: 'Stockout replenishment',
    labelAr: 'إعادة تموين نفاد المخزون',
    severity: 'high',
    responseTargetMinutes: 4 * HOUR,
    resolutionTargetMinutes: 2 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['ordered'],
    escalation: [
      { afterMinutes: 1 * DAY, notifyRoles: ['warehouse_supervisor'] },
      { afterMinutes: 2 * DAY, notifyRoles: ['procurement_manager'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },

  // ── Facility (inspection / compliance rounds) ───────────────────
  {
    id: 'facility.inspection.closeout',
    module: 'facility',
    event: 'ops.facility.inspection_raised',
    label: 'Facility inspection finding closeout',
    labelAr: 'إغلاق ملاحظة تفتيش المرفق',
    severity: 'high',
    responseTargetMinutes: 1 * DAY,
    resolutionTargetMinutes: 7 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_vendor'],
    escalation: [
      { afterMinutes: 3 * DAY, notifyRoles: ['facility_manager'] },
      { afterMinutes: 7 * DAY, notifyRoles: ['compliance_officer'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },

  // ── CRM (Phase 17 C1) ───────────────────────────────────────────
  {
    id: 'crm.inquiry.acknowledge',
    module: 'crm',
    event: 'ops.crm.inquiry.received',
    label: 'CRM inquiry acknowledgement',
    labelAr: 'إشعار استلام استفسار',
    severity: 'high',
    responseTargetMinutes: 30 * MIN,
    resolutionTargetMinutes: 1 * HOUR,
    businessHoursOnly: true,
    pauseOnStates: [],
    escalation: [
      { afterMinutes: 45 * MIN, notifyRoles: ['crm_coordinator'] },
      { afterMinutes: 1 * HOUR, notifyRoles: ['crm_manager'] },
    ],
    warnAtPct: 75,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: true },
  },
  {
    id: 'crm.lead.first_response',
    module: 'crm',
    event: 'ops.crm.lead.created',
    label: 'CRM lead first response',
    labelAr: 'أول رد على عميل محتمل',
    severity: 'high',
    responseTargetMinutes: 2 * HOUR,
    resolutionTargetMinutes: 4 * HOUR,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_guardian_callback', 'awaiting_documents'],
    escalation: [
      { afterMinutes: 3 * HOUR, notifyRoles: ['crm_coordinator'] },
      { afterMinutes: 4 * HOUR, notifyRoles: ['crm_manager'] },
    ],
    warnAtPct: 75,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: true },
  },
  {
    id: 'crm.lead.conversion',
    module: 'crm',
    event: 'ops.crm.lead.qualified',
    label: 'CRM lead to onboarding (conversion window)',
    labelAr: 'تحويل العميل المحتمل إلى مستفيد',
    severity: 'normal',
    responseTargetMinutes: 0,
    resolutionTargetMinutes: 14 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_guardian_callback', 'awaiting_documents'],
    escalation: [
      { afterMinutes: 7 * DAY, notifyRoles: ['crm_coordinator'] },
      { afterMinutes: 14 * DAY, notifyRoles: ['crm_manager'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: true },
  },

  // ── Social Services (Phase 17 C2) ───────────────────────────────
  {
    id: 'social.case.intake_to_assessment',
    module: 'social',
    event: 'ops.care.social.case_opened',
    label: 'Social case intake → assessment window',
    labelAr: 'من فتح الحالة إلى التقييم الاجتماعي',
    severity: 'high',
    responseTargetMinutes: 1 * DAY,
    resolutionTargetMinutes: 5 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_family_consent', 'awaiting_documents'],
    escalation: [
      { afterMinutes: 3 * DAY, notifyRoles: ['social_supervisor'] },
      { afterMinutes: 5 * DAY, notifyRoles: ['social_manager'] },
    ],
    warnAtPct: 75,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },
  {
    id: 'social.case.assessment_to_plan',
    module: 'social',
    event: 'ops.care.social.assessment_completed',
    label: 'Social assessment → intervention plan',
    labelAr: 'من تقييم الاحتياج إلى خطة التدخل',
    severity: 'normal',
    responseTargetMinutes: 0,
    resolutionTargetMinutes: 3 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_family_consent', 'awaiting_documents'],
    escalation: [{ afterMinutes: 2 * DAY, notifyRoles: ['social_supervisor'] }],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },
  {
    id: 'social.home_visit.followup',
    module: 'social',
    event: 'ops.care.social.home_visit_completed',
    label: 'Home-visit follow-up actions',
    labelAr: 'إجراءات المتابعة بعد الزيارة المنزلية',
    severity: 'high',
    responseTargetMinutes: 0,
    resolutionTargetMinutes: 14 * DAY,
    businessHoursOnly: true,
    pauseOnStates: ['awaiting_family_consent'],
    escalation: [
      { afterMinutes: 7 * DAY, notifyRoles: ['social_supervisor'] },
      { afterMinutes: 14 * DAY, notifyRoles: ['social_manager'] },
    ],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },
  {
    id: 'social.case.high_risk_review',
    module: 'social',
    event: 'ops.care.social.case_flagged_high_risk',
    label: 'High-risk social case review',
    labelAr: 'مراجعة حالة اجتماعية عالية المخاطر',
    severity: 'critical',
    responseTargetMinutes: 2 * HOUR,
    resolutionTargetMinutes: 1 * DAY,
    businessHoursOnly: false, // 24/7 — safety
    pauseOnStates: [],
    escalation: [
      { afterMinutes: 4 * HOUR, notifyRoles: ['social_supervisor'] },
      { afterMinutes: 8 * HOUR, notifyRoles: ['social_manager'] },
      { afterMinutes: 24 * HOUR, notifyRoles: ['coo'] },
    ],
    warnAtPct: 70,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: false },
  },

  // ── Psychological risk flag — 1h critical response, 24/7 ─────────
  {
    id: 'psych.risk_flag.response',
    module: 'psych',
    event: 'ops.care.psych.risk_flag_raised',
    label: 'Psychological risk flag response',
    labelAr: 'الاستجابة لتنبيه المخاطر النفسية',
    severity: 'critical',
    responseTargetMinutes: 1 * HOUR,
    resolutionTargetMinutes: 4 * HOUR,
    businessHoursOnly: false, // 24/7 — safety
    pauseOnStates: ['monitoring'], // once a plan is in place, clock pauses
    escalation: [
      { afterMinutes: 30 * MIN, notifyRoles: ['psychologist', 'care_manager'] },
      { afterMinutes: 1 * HOUR, notifyRoles: ['psychiatrist'] },
      { afterMinutes: 2 * HOUR, notifyRoles: ['medical_director', 'coo'] },
    ],
    warnAtPct: 60,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: { external: false, severityScope: ['critical'] },
  },

  // ── Correspondence ──────────────────────────────────────────────
  {
    id: 'correspondence.incoming.assignment',
    module: 'correspondence',
    event: 'ops.correspondence.received',
    label: 'Incoming correspondence routing',
    labelAr: 'توجيه المراسلات الواردة',
    severity: 'normal',
    responseTargetMinutes: 4 * HOUR,
    resolutionTargetMinutes: 1 * DAY,
    businessHoursOnly: true,
    pauseOnStates: [],
    escalation: [{ afterMinutes: 8 * HOUR, notifyRoles: ['admin_office_head'] }],
    warnAtPct: 80,
    breachEvent: 'ops.sla.breached',
    preBreachEvent: 'ops.sla.pre_breach',
    metadata: {},
  },
]);

// ── lookups ─────────────────────────────────────────────────────────

function byId(id) {
  return SLAS.find(s => s.id === id) || null;
}

function byModule(module) {
  return SLAS.filter(s => s.module === module);
}

function byEvent(eventName) {
  return SLAS.filter(s => _matches(s.event, eventName));
}

function bySeverity(sev) {
  return SLAS.filter(s => s.severity === sev);
}

/**
 * Pattern matcher — same semantics as qualityEventBus. Exact,
 * `a.b.*` suffix, or `*` wildcard.
 */
function _matches(pattern, name) {
  if (pattern === '*') return true;
  if (pattern === name) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return name === prefix || name.startsWith(prefix + '.');
  }
  return false;
}

// ── validation ──────────────────────────────────────────────────────

/**
 * Boot-time drift check. Throws on the first violation so a bad
 * registry edit fails loudly instead of silently misbehaving.
 */
function validate() {
  const seen = new Set();
  for (const s of SLAS) {
    if (!s.id || typeof s.id !== 'string') throw new Error(`SLA: missing id`);
    if (seen.has(s.id)) throw new Error(`SLA: duplicate id '${s.id}'`);
    seen.add(s.id);

    if (!OPS_MODULES.includes(s.module)) {
      throw new Error(`SLA ${s.id}: unknown module '${s.module}'`);
    }
    if (!SEVERITIES.includes(s.severity)) {
      throw new Error(`SLA ${s.id}: unknown severity '${s.severity}'`);
    }
    if (typeof s.event !== 'string' || !s.event) {
      throw new Error(`SLA ${s.id}: event required`);
    }
    if (typeof s.resolutionTargetMinutes !== 'number' || s.resolutionTargetMinutes <= 0) {
      throw new Error(`SLA ${s.id}: resolutionTargetMinutes must be > 0`);
    }
    if (s.responseTargetMinutes && s.responseTargetMinutes > s.resolutionTargetMinutes) {
      throw new Error(`SLA ${s.id}: responseTargetMinutes > resolutionTargetMinutes`);
    }
    if (!Array.isArray(s.escalation)) {
      throw new Error(`SLA ${s.id}: escalation must be array`);
    }
    for (const step of s.escalation) {
      if (typeof step.afterMinutes !== 'number' || step.afterMinutes <= 0) {
        throw new Error(`SLA ${s.id}: escalation.afterMinutes invalid`);
      }
      if (!Array.isArray(step.notifyRoles)) {
        throw new Error(`SLA ${s.id}: escalation.notifyRoles must be array`);
      }
    }
    if (typeof s.warnAtPct !== 'number' || s.warnAtPct <= 0 || s.warnAtPct >= 100) {
      throw new Error(`SLA ${s.id}: warnAtPct must be in (0, 100)`);
    }
  }
  return true;
}

module.exports = {
  SLAS,
  OPS_MODULES,
  SEVERITIES,
  byId,
  byModule,
  byEvent,
  bySeverity,
  validate,
  _matches,
};
