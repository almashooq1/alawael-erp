'use strict';

/**
 * sla-engine.test.js — Phase 16 Commit 1 (4.0.66).
 *
 * Behaviour tests for the unified ops SLA engine. Uses in-memory
 * fake models (mongoose-memory-server is heavyweight and the
 * engine's contract is simple) so the tests stay fast + hermetic.
 *
 * Coverage:
 *   • activate() creates idempotent clock
 *   • observe('state_changed') pauses/resumes correctly
 *   • observe('first_response') flags response breach when late
 *   • observe('resolved') closes met vs breached
 *   • observe('cancelled') closes without outcome
 *   • tick() fires warning at warnAtPct, breach at 100%, escalation steps
 *   • breach audit rows are written idempotently
 */

process.env.NODE_ENV = 'test';

const { createSlaEngine } = require('../services/operations/slaEngine.service');

// ── fake models ───────────────────────────────────────────────────────

function makeFakeSlaModel() {
  const docs = [];
  let id = 0;

  function shape(data) {
    const doc = {
      _id: `sla-${++id}`,
      ...data,
      pauseWindows: data.pauseWindows || [],
      totalPausedMs: data.totalPausedMs || 0,
      escalationHistory: data.escalationHistory || [],
      responseBreached: data.responseBreached || false,
      resolutionBreached: data.resolutionBreached || false,
      warningFired: data.warningFired || false,
      firstResponseAt: data.firstResponseAt || null,
      resolvedAt: data.resolvedAt || null,
      cancelledAt: data.cancelledAt || null,
      lastCheckedAt: data.lastCheckedAt || null,
      status: data.status || 'active',
      save: async function () {
        return this;
      },
    };
    // Live methods mirroring schema — must use this.* so callers can rebind.
    doc.elapsedActiveMs = function (now = new Date()) {
      const end = this.resolvedAt || this.cancelledAt || now;
      const total = end.getTime() - this.startedAt.getTime();
      let paused = this.totalPausedMs || 0;
      const openWindow = this.pauseWindows.find(w => !w.endedAt);
      if (openWindow) paused += now.getTime() - openWindow.startedAt.getTime();
      return Math.max(0, total - paused);
    };
    doc.percentOfTarget = function (now = new Date()) {
      const elapsedMin = this.elapsedActiveMs(now) / 60000;
      const target = this.targets.resolutionTargetMinutes || 1;
      return Math.round((elapsedMin / target) * 10000) / 100;
    };
    return doc;
  }

  return {
    docs,
    findOne: async query => {
      return (
        docs.find(d => {
          for (const [k, v] of Object.entries(query)) {
            if (d[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        sort: () => api,
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    countDocuments: async filter => {
      return docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (k === 'warningFired' && d.warningFired !== v) return false;
          if (d[k] !== undefined && d[k] !== v) return false;
        }
        return true;
      }).length;
    },
    _docs: () => docs,
  };
}

function makeFakeBreachModel() {
  const docs = [];
  let id = 0;
  return {
    docs,
    create: async data => {
      const d = { _id: `breach-${++id}`, ...data };
      docs.push(d);
      return d;
    },
    find: filter => {
      const rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        limit: () => api,
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
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

function makeSubjectId(i = 1) {
  // Fake 24-char hex id; engine does not validate format.
  return `0000000000000000000000${String(i).padStart(2, '0')}`;
}

// ── tests ─────────────────────────────────────────────────────────────

describe('SLA Engine — activate()', () => {
  it('creates a clock with snapshot targets from the registry', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    const sla = await engine.activate({
      policyId: 'helpdesk.ticket.critical',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(1),
    });

    expect(sla.policyId).toBe('helpdesk.ticket.critical');
    expect(sla.module).toBe('helpdesk');
    expect(sla.severity).toBe('critical');
    expect(sla.targets.resolutionTargetMinutes).toBe(240); // 4h
    expect(sla.status).toBe('active');
    expect(dispatcher.events.some(e => e.name === 'ops.sla.activated')).toBe(true);
  });

  it('is idempotent: second call returns existing doc', async () => {
    const slaModel = makeFakeSlaModel();
    const engine = createSlaEngine({
      slaModel,
      breachModel: makeFakeBreachModel(),
      dispatcher: makeDispatcher(),
    });

    const a = await engine.activate({
      policyId: 'helpdesk.ticket.normal',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(2),
    });
    const b = await engine.activate({
      policyId: 'helpdesk.ticket.normal',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(2),
    });

    expect(a._id).toBe(b._id);
    expect(slaModel._docs().length).toBe(1);
  });

  it('throws on unknown policyId', async () => {
    const engine = createSlaEngine({
      slaModel: makeFakeSlaModel(),
      breachModel: makeFakeBreachModel(),
    });
    await expect(
      engine.activate({
        policyId: 'does-not-exist',
        subjectType: 'X',
        subjectId: makeSubjectId(99),
      })
    ).rejects.toThrow(/unknown policyId/);
  });
});

describe('SLA Engine — observe()', () => {
  it('pauses the clock when state is in pauseOnStates, resumes on exit', async () => {
    const slaModel = makeFakeSlaModel();
    const engine = createSlaEngine({
      slaModel,
      breachModel: makeFakeBreachModel(),
      dispatcher: makeDispatcher(),
    });

    const sla = await engine.activate({
      policyId: 'helpdesk.ticket.normal',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(3),
    });

    const pausedAt = new Date();
    await engine.observe({
      slaId: sla._id,
      eventType: 'state_changed',
      state: 'waiting_on_requester',
      when: pausedAt,
    });
    expect(slaModel._docs()[0].status).toBe('paused');
    expect(slaModel._docs()[0].pauseWindows.length).toBe(1);

    const resumedAt = new Date(pausedAt.getTime() + 60 * 1000);
    await engine.observe({
      slaId: sla._id,
      eventType: 'state_changed',
      state: 'in_progress',
      when: resumedAt,
    });
    const after = slaModel._docs()[0];
    expect(after.status).toBe('active');
    expect(after.pauseWindows[0].endedAt).toEqual(resumedAt);
    expect(after.totalPausedMs).toBe(60 * 1000);
  });

  it('marks firstResponseAt and fires response-breached when late', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    const startedAt = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
    await engine.activate({
      policyId: 'helpdesk.ticket.critical', // response target = 15min
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(4),
      startedAt,
    });
    const sla = slaModel._docs()[0];

    await engine.observe({ slaId: sla._id, eventType: 'first_response' });
    expect(slaModel._docs()[0].firstResponseAt).toBeInstanceOf(Date);
    expect(slaModel._docs()[0].responseBreached).toBe(true);
    expect(breachModel._docs().some(b => b.kind === 'response_breached')).toBe(true);
  });

  it('resolves as met when within target', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    const startedAt = new Date(Date.now() - 10 * 60 * 1000); // 10min ago
    await engine.activate({
      policyId: 'helpdesk.ticket.critical', // resolution 240min
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(5),
      startedAt,
    });
    const sla = slaModel._docs()[0];

    await engine.observe({ slaId: sla._id, eventType: 'resolved' });
    expect(slaModel._docs()[0].status).toBe('met');
    expect(dispatcher.events.some(e => e.name === 'ops.sla.met')).toBe(true);
  });

  it('resolves as breached when past target', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    const startedAt = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6h ago, target 4h
    await engine.activate({
      policyId: 'helpdesk.ticket.critical',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(6),
      startedAt,
    });
    const sla = slaModel._docs()[0];

    await engine.observe({ slaId: sla._id, eventType: 'resolved' });
    expect(slaModel._docs()[0].status).toBe('breached');
    expect(dispatcher.events.some(e => e.name === 'ops.sla.breached')).toBe(true);
    expect(breachModel._docs().some(b => b.kind === 'resolution_breached')).toBe(true);
  });

  it('cancels clock cleanly', async () => {
    const slaModel = makeFakeSlaModel();
    const engine = createSlaEngine({
      slaModel,
      breachModel: makeFakeBreachModel(),
      dispatcher: makeDispatcher(),
    });
    await engine.activate({
      policyId: 'helpdesk.ticket.normal',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(7),
    });
    const sla = slaModel._docs()[0];
    await engine.observe({ slaId: sla._id, eventType: 'cancelled' });
    expect(slaModel._docs()[0].status).toBe('cancelled');
  });
});

describe('SLA Engine — tick()', () => {
  it('fires warning once at warnAtPct', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    // helpdesk.ticket.critical: 240min target, warn at 80% → 192min
    const startedAt = new Date(Date.now() - 200 * 60 * 1000);
    await engine.activate({
      policyId: 'helpdesk.ticket.critical',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(10),
      startedAt,
    });

    const r1 = await engine.tick();
    expect(r1.warningsFired).toBe(1);
    expect(slaModel._docs()[0].warningFired).toBe(true);

    // second tick — idempotent, no duplicate warning
    const r2 = await engine.tick();
    expect(r2.warningsFired).toBe(0);
  });

  it('fires breach once when past target', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    const startedAt = new Date(Date.now() - 300 * 60 * 1000); // 300min on 240-min target
    await engine.activate({
      policyId: 'helpdesk.ticket.critical',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(11),
      startedAt,
    });

    const r1 = await engine.tick();
    expect(r1.resolutionBreaches).toBe(1);
    expect(slaModel._docs()[0].resolutionBreached).toBe(true);
    expect(breachModel._docs().some(b => b.kind === 'resolution_breached' && b.emittedEvent)).toBe(
      true
    );

    const r2 = await engine.tick();
    expect(r2.resolutionBreaches).toBe(0);
  });

  it('fires escalation steps in order, idempotent per step', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const dispatcher = makeDispatcher();
    const engine = createSlaEngine({ slaModel, breachModel, dispatcher });

    // helpdesk.ticket.critical escalation: 30min, 120min, 240min
    const startedAt = new Date(Date.now() - 150 * 60 * 1000);
    await engine.activate({
      policyId: 'helpdesk.ticket.critical',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(12),
      startedAt,
    });

    const r1 = await engine.tick();
    // Should have fired steps at 30min + 120min (150 > 120 but < 240)
    expect(r1.escalationsFired).toBe(2);
    expect(slaModel._docs()[0].escalationHistory.length).toBe(2);

    const r2 = await engine.tick();
    expect(r2.escalationsFired).toBe(0);
  });
});

describe('SLA Engine — getStatus()', () => {
  it('returns counts of active / at-risk / breached', async () => {
    const slaModel = makeFakeSlaModel();
    const breachModel = makeFakeBreachModel();
    const engine = createSlaEngine({
      slaModel,
      breachModel,
      dispatcher: makeDispatcher(),
    });

    // One fresh active
    await engine.activate({
      policyId: 'helpdesk.ticket.normal',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(20),
    });
    // One past warning → tick will flip warningFired
    await engine.activate({
      policyId: 'helpdesk.ticket.critical',
      subjectType: 'HelpDeskTicket',
      subjectId: makeSubjectId(21),
      startedAt: new Date(Date.now() - 200 * 60 * 1000),
    });
    await engine.tick();

    const status = await engine.getStatus();
    expect(status.active).toBeGreaterThanOrEqual(1);
    expect(status.atRisk).toBeGreaterThanOrEqual(1);
  });
});
