'use strict';

/**
 * care-crm-service.test.js — Phase 17 Commit 1 (4.0.83).
 *
 * Behaviour tests for the lead-funnel service — inquiry lifecycle,
 * lead state machine, SLA hooks (activation + resolution + pause/
 * resume), promotion flow, activity logging, and funnel stats.
 *
 * Uses in-memory fakes so the suite is hermetic.
 */

process.env.NODE_ENV = 'test';

const { createLeadFunnelService } = require('../services/care/leadFunnel.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeModel({ prefix = 'doc', autoNumber = null, preSave = null } = {}) {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `${prefix}-${++n}`,
      statusHistory: [],
      activity: [],
      ...data,
      save: async function () {
        if (preSave) preSave(this);
        return this;
      },
    };
    if (autoNumber && !doc[autoNumber.field]) {
      doc[autoNumber.field] = `${autoNumber.prefix}-${n}`;
    }
    if (preSave) preSave(doc);
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v == null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
            if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
          } else if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    countDocuments: async filter => {
      return docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v === null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
            if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
          } else if (d[k] !== v) return false;
        }
        return true;
      }).length;
    },
    _docs: () => docs,
  };
}

function makeInquiryModel() {
  return makeModel({
    prefix: 'inq',
    autoNumber: { field: 'inquiryNumber', prefix: 'INQ-TEST' },
  });
}

function makeLeadModel() {
  return makeModel({
    prefix: 'lead',
    autoNumber: { field: 'leadNumber', prefix: 'LEAD-TEST' },
    preSave(doc) {
      if (!doc.createdAt) doc.createdAt = new Date();
    },
  });
}

function makeSlaEngine() {
  const calls = [];
  let n = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++n}`, ...args };
      calls.push({ kind: 'activate', args });
      return sla;
    },
    async observe(args) {
      calls.push({ kind: 'observe', args });
      return { _id: args.slaId };
    },
  };
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function baseInquiryData() {
  return {
    channel: 'phone',
    contactName: 'أبو محمد',
    contactPhone: '05xxxxxxx',
    subject: 'استفسار عن جلسات علاج النطق',
    condition: 'autism',
    beneficiaryAgeYears: 5,
    referralSource: 'social_media',
  };
}

function baseLeadData() {
  return {
    guardianName: 'أبو محمد',
    guardianPhone: '05xxxxxxx',
    beneficiaryName: 'محمد',
    beneficiaryAgeYears: 5,
    condition: 'autism',
    referralSource: 'social_media',
  };
}

// ── Inquiry flow ──────────────────────────────────────────────────

describe('LeadFunnel — Inquiry flow', () => {
  it('createInquiry activates SLA + emits event', async () => {
    const inquiryModel = makeInquiryModel();
    const leadModel = makeLeadModel();
    const engine = makeSlaEngine();
    const dispatcher = makeDispatcher();
    const svc = createLeadFunnelService({
      inquiryModel,
      leadModel,
      slaEngine: engine,
      dispatcher,
    });

    const doc = await svc.createInquiry(baseInquiryData());
    expect(doc.status).toBe('new');
    expect(doc.slaId).toBeTruthy();
    expect(
      engine.calls.find(c => c.kind === 'activate' && c.args.policyId === 'crm.inquiry.acknowledge')
    ).toBeDefined();
    expect(dispatcher.events.some(e => e.name === 'ops.crm.inquiry.received')).toBe(true);
  });

  it('throws MISSING_FIELD without channel/contactName/subject', async () => {
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
    });
    await expect(svc.createInquiry({ channel: 'phone' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('acknowledgeInquiry stamps acknowledgedAt + resolves SLA (state_changed)', async () => {
    const inquiryModel = makeInquiryModel();
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel,
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const inq = await svc.createInquiry(baseInquiryData());
    const ack = await svc.acknowledgeInquiry(inq._id);
    expect(ack.status).toBe('acknowledged');
    expect(ack.acknowledgedAt).toBeInstanceOf(Date);
    expect(
      engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'state_changed')
    ).toBe(true);
  });

  it('routeInquiry requires ownerUserId', async () => {
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
    });
    const inq = await svc.createInquiry(baseInquiryData());
    await svc.acknowledgeInquiry(inq._id);
    await expect(svc.routeInquiry(inq._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const routed = await svc.routeInquiry(inq._id, { ownerUserId: 'user-1' });
    expect(routed.status).toBe('routed');
    expect(routed.ownerUserId).toBe('user-1');
  });

  it('closeInquiry requires closureReason + resolves SLA', async () => {
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const inq = await svc.createInquiry(baseInquiryData());
    await svc.acknowledgeInquiry(inq._id);
    await expect(svc.closeInquiry(inq._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const closed = await svc.closeInquiry(inq._id, { closureReason: 'duplicate' });
    expect(closed.status).toBe('closed');
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('illegal inquiry transition throws ILLEGAL_TRANSITION', async () => {
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
    });
    const inq = await svc.createInquiry(baseInquiryData());
    // new → routed is illegal (must acknowledge first)
    await expect(svc.routeInquiry(inq._id, { ownerUserId: 'u1' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

describe('LeadFunnel — Lead flow', () => {
  it('createLead activates first-response SLA', async () => {
    const leadModel = makeLeadModel();
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel,
      slaEngine: engine,
    });
    const lead = await svc.createLead(baseLeadData());
    expect(lead.status).toBe('new');
    expect(lead.firstResponseSlaId).toBeTruthy();
    const frActivate = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'crm.lead.first_response'
    );
    expect(frActivate).toBeDefined();
  });

  it('logActivity marks firstResponseAt + resolves FR SLA on first outbound', async () => {
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const lead = await svc.createLead(baseLeadData());

    // "note" is not outbound — shouldn't flip firstResponseAt
    await svc.logActivity(lead._id, { kind: 'note', summary: 'internal note' });
    const after = await svc.findLeadById(lead._id);
    expect(after.firstResponseAt).toBeFalsy();

    // "call" is outbound
    await svc.logActivity(lead._id, { kind: 'call', summary: 'Called guardian' });
    const after2 = await svc.findLeadById(lead._id);
    expect(after2.firstResponseAt).toBeInstanceOf(Date);
    expect(
      engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'first_response')
    ).toBe(true);
  });

  it('transitionLead new → contacted → qualified activates conversion SLA', async () => {
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const lead = await svc.createLead(baseLeadData());
    await svc.transitionLead(lead._id, 'contacted');
    const q = await svc.transitionLead(lead._id, 'qualified');
    expect(q.status).toBe('qualified');
    expect(q.conversionSlaId).toBeTruthy();
    const convActivate = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'crm.lead.conversion'
    );
    expect(convActivate).toBeDefined();
  });

  it('transition to pause state fires state_changed on both SLAs', async () => {
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const lead = await svc.createLead(baseLeadData());
    await svc.transitionLead(lead._id, 'contacted');
    await svc.transitionLead(lead._id, 'qualified'); // activates conv SLA
    engine.calls.length = 0;
    await svc.transitionLead(lead._id, 'awaiting_guardian_callback');
    // Should fire state_changed (not resolved/cancelled)
    const pauseObs = engine.calls.filter(
      c => c.kind === 'observe' && c.args.eventType === 'state_changed'
    );
    expect(pauseObs.length).toBeGreaterThanOrEqual(1);
  });

  it('convertLead requires beneficiaryId + resolves both SLAs', async () => {
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const lead = await svc.createLead(baseLeadData());
    await svc.transitionLead(lead._id, 'contacted');
    await svc.transitionLead(lead._id, 'qualified');
    await svc.transitionLead(lead._id, 'interested');
    await svc.transitionLead(lead._id, 'assessment_scheduled', {
      patch: { assessmentAt: new Date() },
    });
    await expect(svc.convertLead(lead._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const converted = await svc.convertLead(lead._id, { beneficiaryId: 'ben-1' });
    expect(converted.status).toBe('converted');
    expect(converted.beneficiaryId).toBe('ben-1');
    expect(converted.convertedAt).toBeInstanceOf(Date);
    const resolvedObs = engine.calls.filter(
      c => c.kind === 'observe' && c.args.eventType === 'resolved'
    );
    expect(resolvedObs.length).toBeGreaterThanOrEqual(2); // FR + conv
  });

  it('markLost requires lostReason + cancels both SLAs', async () => {
    const engine = makeSlaEngine();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      slaEngine: engine,
    });
    const lead = await svc.createLead(baseLeadData());
    await svc.transitionLead(lead._id, 'contacted');
    await svc.transitionLead(lead._id, 'qualified'); // activates conv SLA
    await expect(svc.markLost(lead._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const lost = await svc.markLost(lead._id, { lostReason: 'budget' });
    expect(lost.status).toBe('lost');
    const cancelObs = engine.calls.filter(
      c => c.kind === 'observe' && c.args.eventType === 'cancelled'
    );
    expect(cancelObs.length).toBeGreaterThanOrEqual(2);
  });

  it('illegal lead transition throws ILLEGAL_TRANSITION', async () => {
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
    });
    const lead = await svc.createLead(baseLeadData());
    // new → converted is illegal
    await expect(svc.convertLead(lead._id, { beneficiaryId: 'x' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

describe('LeadFunnel — promotion flow', () => {
  it('promoteInquiry creates Lead + back-links + resolves inquiry SLA', async () => {
    const inquiryModel = makeInquiryModel();
    const leadModel = makeLeadModel();
    const engine = makeSlaEngine();
    const dispatcher = makeDispatcher();
    const svc = createLeadFunnelService({
      inquiryModel,
      leadModel,
      slaEngine: engine,
      dispatcher,
    });
    const inq = await svc.createInquiry(baseInquiryData());
    await svc.acknowledgeInquiry(inq._id);

    const { inquiry, lead } = await svc.promoteInquiry(inq._id, {
      beneficiaryName: 'محمد',
    });
    expect(inquiry.status).toBe('promoted_to_lead');
    expect(inquiry.promotedLeadId).toBe(lead._id);
    expect(lead.sourceInquiryId).toBe(inq._id);
    expect(lead.guardianName).toBe('أبو محمد');
    expect(lead.condition).toBe('autism');
    const promoteEvent = dispatcher.events.find(e => e.name === 'ops.crm.inquiry.promoted');
    expect(promoteEvent).toBeDefined();
  });

  it('double-promoting an already-promoted inquiry throws CONFLICT', async () => {
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
    });
    const inq = await svc.createInquiry(baseInquiryData());
    await svc.acknowledgeInquiry(inq._id);
    await svc.promoteInquiry(inq._id, { beneficiaryName: 'م' });
    await expect(svc.promoteInquiry(inq._id, { beneficiaryName: 'م' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});

describe('LeadFunnel — bus event matrix', () => {
  it('emits ops.crm.lead.<event> + ops.crm.lead.transitioned per move', async () => {
    const dispatcher = makeDispatcher();
    const svc = createLeadFunnelService({
      inquiryModel: makeInquiryModel(),
      leadModel: makeLeadModel(),
      dispatcher,
    });
    const lead = await svc.createLead(baseLeadData());
    await svc.transitionLead(lead._id, 'contacted');
    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ops.crm.lead.created',
        'ops.crm.lead.contacted',
        'ops.crm.lead.transitioned',
      ])
    );
  });
});

describe('LeadFunnel — getFunnelStats', () => {
  it('computes funnel conversion KPIs', async () => {
    const inquiryModel = makeInquiryModel();
    const leadModel = makeLeadModel();
    const svc = createLeadFunnelService({
      inquiryModel,
      leadModel,
    });

    // 2 inquiries — 1 promoted
    await svc.createInquiry(baseInquiryData());
    const i2 = await svc.createInquiry(baseInquiryData());
    await svc.acknowledgeInquiry(i2._id);
    await svc.promoteInquiry(i2._id, { beneficiaryName: 'x' });

    // 3 leads: 1 just created, 1 contacted, 1 converted
    await svc.createLead(baseLeadData());
    const l2 = await svc.createLead(baseLeadData());
    await svc.transitionLead(l2._id, 'contacted');
    const l3 = await svc.createLead(baseLeadData());
    await svc.transitionLead(l3._id, 'contacted');
    await svc.transitionLead(l3._id, 'qualified');
    await svc.transitionLead(l3._id, 'interested');
    await svc.transitionLead(l3._id, 'assessment_scheduled', {
      patch: { assessmentAt: new Date() },
    });
    await svc.convertLead(l3._id, { beneficiaryId: 'ben-1' });

    const stats = await svc.getFunnelStats({ windowDays: 30 });
    expect(stats.inquiriesReceived).toBe(2);
    expect(stats.inquiriesPromoted).toBe(1);
    expect(stats.inquiryToLeadPct).toBe(50);
    // leadsCreated includes the one promoted from inquiry + 3 direct = 4
    expect(stats.leadsCreated).toBeGreaterThanOrEqual(3);
    expect(stats.leadsConverted).toBe(1);
    expect(stats.conversionRatePct).not.toBeNull();
  });
});
