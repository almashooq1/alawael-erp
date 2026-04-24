'use strict';

/**
 * care-crm-registry.test.js — Phase 17 Commit 1 (4.0.83).
 *
 * Shape + drift invariants over the CRM funnel registry.
 */

const {
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
} = require('../config/care/crm.registry');

describe('CRM registry — sanity', () => {
  it('frozen taxonomies', () => {
    expect(Object.isFrozen(INQUIRY_STATUSES)).toBe(true);
    expect(Object.isFrozen(INQUIRY_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(INQUIRY_CHANNELS)).toBe(true);
    expect(Object.isFrozen(LEAD_STATUSES)).toBe(true);
    expect(Object.isFrozen(LEAD_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(REFERRAL_SOURCES)).toBe(true);
    expect(Object.isFrozen(LOST_REASONS)).toBe(true);
  });

  it('validate() passes on shipped registry', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });

  it('has ≥ 6 inquiry statuses + ≥ 8 lead statuses', () => {
    expect(INQUIRY_STATUSES.length).toBeGreaterThanOrEqual(6);
    expect(LEAD_STATUSES.length).toBeGreaterThanOrEqual(8);
  });

  it('has ≥ 7 referral sources + ≥ 6 lost reasons + ≥ 7 channels', () => {
    expect(REFERRAL_SOURCES.length).toBeGreaterThanOrEqual(7);
    expect(LOST_REASONS.length).toBeGreaterThanOrEqual(6);
    expect(INQUIRY_CHANNELS.length).toBeGreaterThanOrEqual(7);
  });
});

describe('CRM registry — Inquiry transitions', () => {
  it('new → acknowledged legal', () => {
    expect(canTransitionInquiry('new', 'acknowledged')).toBe(true);
  });

  it('new → promoted_to_lead illegal (must go through acknowledged/routed first)', () => {
    expect(canTransitionInquiry('new', 'promoted_to_lead')).toBe(false);
  });

  it('acknowledged → routed requires ownerUserId', () => {
    expect(inquiryRequiredFields('acknowledged', 'routed')).toContain('ownerUserId');
  });

  it('acknowledged → closed requires closureReason', () => {
    expect(inquiryRequiredFields('acknowledged', 'closed')).toContain('closureReason');
  });

  it('promoted_to_lead / closed / spam are terminal', () => {
    for (const t of ['promoted_to_lead', 'closed', 'spam']) {
      expect(INQUIRY_TRANSITIONS[t]).toEqual([]);
      expect(isInquiryTerminal(t)).toBe(true);
    }
    expect(isInquiryTerminal('new')).toBe(false);
  });

  it('eventForInquiryTransition returns event name', () => {
    expect(eventForInquiryTransition('new', 'acknowledged')).toBe('acknowledged');
    expect(eventForInquiryTransition('new', 'promoted_to_lead')).toBeNull();
  });
});

describe('CRM registry — Lead transitions', () => {
  it('new → contacted legal', () => {
    expect(canTransitionLead('new', 'contacted')).toBe(true);
  });

  it('new → converted illegal (must go through funnel)', () => {
    expect(canTransitionLead('new', 'converted')).toBe(false);
  });

  it('assessment_scheduled → converted requires beneficiaryId', () => {
    expect(leadRequiredFields('assessment_scheduled', 'converted')).toContain('beneficiaryId');
  });

  it('any status → lost requires lostReason', () => {
    expect(leadRequiredFields('contacted', 'lost')).toContain('lostReason');
    expect(leadRequiredFields('qualified', 'lost')).toContain('lostReason');
    expect(leadRequiredFields('interested', 'lost')).toContain('lostReason');
  });

  it('interested → assessment_scheduled requires assessmentAt', () => {
    expect(leadRequiredFields('interested', 'assessment_scheduled')).toContain('assessmentAt');
  });

  it('converted / lost / cancelled are terminal', () => {
    for (const t of ['converted', 'lost', 'cancelled']) {
      expect(LEAD_TRANSITIONS[t]).toEqual([]);
      expect(isLeadTerminal(t)).toBe(true);
    }
    expect(isLeadTerminal('new')).toBe(false);
  });

  it('pause statuses correctly identified', () => {
    for (const p of LEAD_PAUSE_STATUSES) {
      expect(isLeadPaused(p)).toBe(true);
      expect(LEAD_STATUSES).toContain(p);
    }
    expect(isLeadPaused('new')).toBe(false);
    expect(isLeadPaused('converted')).toBe(false);
  });

  it('pause → active transitions use event=resumed', () => {
    expect(eventForLeadTransition('awaiting_guardian_callback', 'contacted')).toBe('resumed');
    expect(eventForLeadTransition('awaiting_documents', 'interested')).toBe('resumed');
  });
});

describe('CRM registry — SLA wiring', () => {
  it('exposes SLA policy ids', () => {
    expect(slaPolicyForInquiry()).toBe('crm.inquiry.acknowledge');
    expect(slaPolicyForLeadFirstResponse()).toBe('crm.lead.first_response');
    expect(slaPolicyForLeadConversion()).toBe('crm.lead.conversion');
  });

  it('all 3 CRM SLA policies exist in sla.registry', () => {
    const sla = require('../config/sla.registry');
    expect(sla.byId('crm.inquiry.acknowledge')).toBeTruthy();
    expect(sla.byId('crm.lead.first_response')).toBeTruthy();
    expect(sla.byId('crm.lead.conversion')).toBeTruthy();
  });

  it('crm.lead.first_response pauseOnStates ⊇ LEAD_PAUSE_STATUSES', () => {
    const sla = require('../config/sla.registry').byId('crm.lead.first_response');
    for (const p of LEAD_PAUSE_STATUSES) {
      expect(sla.pauseOnStates).toContain(p);
    }
  });

  it('crm.lead.conversion pauseOnStates ⊇ LEAD_PAUSE_STATUSES', () => {
    const sla = require('../config/sla.registry').byId('crm.lead.conversion');
    for (const p of LEAD_PAUSE_STATUSES) {
      expect(sla.pauseOnStates).toContain(p);
    }
  });
});

describe('CRM registry — graph reachability', () => {
  function reachable(transitions, from) {
    const r = new Set([from]);
    let added = true;
    while (added) {
      added = false;
      for (const [f, edges] of Object.entries(transitions)) {
        if (!r.has(f)) continue;
        for (const e of edges) {
          if (!r.has(e.to)) {
            r.add(e.to);
            added = true;
          }
        }
      }
    }
    return r;
  }

  it('every inquiry status reachable from new', () => {
    const r = reachable(INQUIRY_TRANSITIONS, 'new');
    for (const s of INQUIRY_STATUSES) expect(r.has(s)).toBe(true);
  });

  it('every lead status reachable from new', () => {
    const r = reachable(LEAD_TRANSITIONS, 'new');
    for (const s of LEAD_STATUSES) expect(r.has(s)).toBe(true);
  });
});

describe('CRM registry — unique vocabularies', () => {
  it('referral sources are unique', () => {
    expect(new Set(REFERRAL_SOURCES).size).toBe(REFERRAL_SOURCES.length);
  });
  it('lost reasons are unique', () => {
    expect(new Set(LOST_REASONS).size).toBe(LOST_REASONS.length);
  });
  it('channels are unique', () => {
    expect(new Set(INQUIRY_CHANNELS).size).toBe(INQUIRY_CHANNELS.length);
  });
});
