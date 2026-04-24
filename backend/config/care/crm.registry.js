'use strict';

/**
 * care/crm.registry.js — Phase 17 Commit 1 (4.0.83).
 *
 * Canonical vocabulary + state machines for the CRM acquisition
 * funnel: Inquiry → Lead → (qualified/converted/lost). Pure data,
 * validated at boot.
 *
 * Context — the existing `CrmLead` + `Complaint` + `CrmSurvey`
 * models cover pieces of CRM but there's no formal funnel, no
 * Inquiry model (every touch starts as a Lead, which is wrong —
 * most inquiries never qualify), and no SLA wiring. This commit
 * adds:
 *
 *   • **Inquiry** — every inbound touch (call / email / WhatsApp
 *     / website form / walk-in) lands here first. Lightweight
 *     state machine (new → acknowledged → routed → closed) with
 *     a 1-hour acknowledgement SLA.
 *
 *   • **Lead** — inquiries that look like real prospects get
 *     promoted to Lead with a full funnel (new → contacted →
 *     qualified → interested → assessment_scheduled → converted
 *     / lost). Each transition emits an `ops.crm.lead.*` event
 *     and drives the `crm.lead.first_response` and
 *     `crm.lead.conversion` SLAs from the registry.
 *
 *   • Legacy `CrmLead` continues to work — this module adds
 *     fresh models alongside rather than modifying the existing
 *     schema. Callers migrate at their own pace.
 */

// ── Inquiry ─────────────────────────────────────────────────────────

const INQUIRY_STATUSES = Object.freeze([
  'new', // just arrived
  'acknowledged', // CRM team confirmed receipt
  'routed', // assigned to an owner / team
  'promoted_to_lead', // converted into a Lead
  'closed', // resolved with no further action
  'spam',
]);

const INQUIRY_TERMINAL_STATUSES = Object.freeze(['promoted_to_lead', 'closed', 'spam']);

const INQUIRY_TRANSITIONS = Object.freeze({
  new: [
    { to: 'acknowledged', event: 'acknowledged' },
    { to: 'spam', event: 'marked_spam' },
  ],
  acknowledged: [
    { to: 'routed', event: 'routed', required: ['ownerUserId'] },
    { to: 'promoted_to_lead', event: 'promoted' },
    { to: 'closed', event: 'closed', required: ['closureReason'] },
  ],
  routed: [
    { to: 'promoted_to_lead', event: 'promoted' },
    { to: 'closed', event: 'closed', required: ['closureReason'] },
  ],
  promoted_to_lead: [],
  closed: [],
  spam: [],
});

const INQUIRY_CHANNELS = Object.freeze([
  'phone',
  'email',
  'whatsapp',
  'sms',
  'website_form',
  'walk_in',
  'social_media',
  'referral_partner',
  'other',
]);

// ── Lead ────────────────────────────────────────────────────────────

const LEAD_STATUSES = Object.freeze([
  'new', // just created (from inquiry or direct)
  'contacted', // CRM reached out
  'qualified', // meets criteria (age, area, condition, budget)
  'interested', // guardian confirmed interest
  'awaiting_guardian_callback', // pause state — guardian asked for callback
  'awaiting_documents', // pause state — waiting for required docs
  'assessment_scheduled', // clinical intake booked
  'converted', // onboarded as Beneficiary
  'lost', // did not convert
  'cancelled',
]);

const LEAD_TERMINAL_STATUSES = Object.freeze(['converted', 'lost', 'cancelled']);

// Statuses that pause the crm.lead.first_response + conversion SLAs.
// MUST match pauseOnStates in the matching sla.registry policies.
const LEAD_PAUSE_STATUSES = Object.freeze(['awaiting_guardian_callback', 'awaiting_documents']);

const LEAD_TRANSITIONS = Object.freeze({
  new: [
    { to: 'contacted', event: 'contacted' },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  contacted: [
    { to: 'qualified', event: 'qualified' },
    { to: 'interested', event: 'interested' }, // skip qualification if clear
    { to: 'awaiting_guardian_callback', event: 'awaiting_callback' },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  qualified: [
    { to: 'interested', event: 'interested' },
    { to: 'awaiting_guardian_callback', event: 'awaiting_callback' },
    { to: 'awaiting_documents', event: 'awaiting_documents' },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  interested: [
    { to: 'awaiting_documents', event: 'awaiting_documents' },
    { to: 'assessment_scheduled', event: 'assessment_scheduled', required: ['assessmentAt'] },
    { to: 'awaiting_guardian_callback', event: 'awaiting_callback' },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  awaiting_guardian_callback: [
    { to: 'contacted', event: 'resumed' },
    { to: 'interested', event: 'interested' },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  awaiting_documents: [
    { to: 'interested', event: 'resumed' },
    { to: 'assessment_scheduled', event: 'assessment_scheduled', required: ['assessmentAt'] },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  assessment_scheduled: [
    { to: 'converted', event: 'converted', required: ['beneficiaryId'] },
    { to: 'lost', event: 'lost', required: ['lostReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  converted: [],
  lost: [],
  cancelled: [],
});

// ── Referral sources + lost reasons (closed vocabulary) ─────────────

const REFERRAL_SOURCES = Object.freeze([
  'moh_referral', // Ministry of Health
  'hrsd_referral', // Human Resources + Social Development
  'charity_partner',
  'hospital_referral',
  'school_referral',
  'pediatrician',
  'direct_walk_in',
  'social_media',
  'website',
  'word_of_mouth',
  'previous_beneficiary',
  'other',
]);

const LOST_REASONS = Object.freeze([
  'no_response', // guardian stopped responding
  'not_qualified', // did not meet intake criteria
  'budget', // could not afford
  'distance', // location inconvenient
  'competitor',
  'out_of_scope', // condition we don't treat
  'guardian_declined',
  'waitlist_too_long',
  'other',
]);

// ── helpers ─────────────────────────────────────────────────────────

function canTransitionInquiry(from, to) {
  const edges = INQUIRY_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function canTransitionLead(from, to) {
  const edges = LEAD_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForInquiryTransition(from, to) {
  const edges = INQUIRY_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function eventForLeadTransition(from, to) {
  const edges = LEAD_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function inquiryRequiredFields(from, to) {
  const edges = INQUIRY_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function leadRequiredFields(from, to) {
  const edges = LEAD_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isInquiryTerminal(status) {
  return INQUIRY_TERMINAL_STATUSES.includes(status);
}

function isLeadTerminal(status) {
  return LEAD_TERMINAL_STATUSES.includes(status);
}

function isLeadPaused(status) {
  return LEAD_PAUSE_STATUSES.includes(status);
}

function slaPolicyForInquiry() {
  return 'crm.inquiry.acknowledge';
}

function slaPolicyForLeadFirstResponse() {
  return 'crm.lead.first_response';
}

function slaPolicyForLeadConversion() {
  return 'crm.lead.conversion';
}

// ── validation ──────────────────────────────────────────────────────

function validate() {
  for (const [from, edges] of Object.entries(INQUIRY_TRANSITIONS)) {
    if (!INQUIRY_STATUSES.includes(from)) {
      throw new Error(`CRM registry: inquiry source '${from}' unknown`);
    }
    for (const e of edges) {
      if (!INQUIRY_STATUSES.includes(e.to)) {
        throw new Error(`CRM registry: inquiry ${from}→${e.to} unknown target`);
      }
      if (!e.event) throw new Error(`CRM registry: inquiry ${from}→${e.to} missing event`);
    }
  }
  for (const [from, edges] of Object.entries(LEAD_TRANSITIONS)) {
    if (!LEAD_STATUSES.includes(from)) {
      throw new Error(`CRM registry: lead source '${from}' unknown`);
    }
    for (const e of edges) {
      if (!LEAD_STATUSES.includes(e.to)) {
        throw new Error(`CRM registry: lead ${from}→${e.to} unknown target`);
      }
      if (!e.event) throw new Error(`CRM registry: lead ${from}→${e.to} missing event`);
    }
  }
  for (const p of LEAD_PAUSE_STATUSES) {
    if (!LEAD_STATUSES.includes(p)) {
      throw new Error(`CRM registry: pause status '${p}' unknown`);
    }
  }
  return true;
}

module.exports = {
  INQUIRY_STATUSES,
  INQUIRY_TERMINAL_STATUSES,
  INQUIRY_TRANSITIONS,
  INQUIRY_CHANNELS,
  LEAD_STATUSES,
  LEAD_TERMINAL_STATUSES,
  LEAD_PAUSE_STATUSES,
  LEAD_TRANSITIONS,
  REFERRAL_SOURCES,
  LOST_REASONS,
  canTransitionInquiry,
  canTransitionLead,
  eventForInquiryTransition,
  eventForLeadTransition,
  inquiryRequiredFields,
  leadRequiredFields,
  isInquiryTerminal,
  isLeadTerminal,
  isLeadPaused,
  slaPolicyForInquiry,
  slaPolicyForLeadFirstResponse,
  slaPolicyForLeadConversion,
  validate,
};
