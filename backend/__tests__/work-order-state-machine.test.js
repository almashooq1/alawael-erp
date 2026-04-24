'use strict';

/**
 * work-order-state-machine.test.js — Phase 16 Commit 2 (4.0.67).
 *
 * Behaviour tests for the WO state-machine service, including its
 * integration with a recorder SLA engine. Uses in-memory fake
 * models so the tests stay fast + hermetic.
 */

process.env.NODE_ENV = 'test';

const {
  createWorkOrderStateMachine,
  IllegalTransitionError,
  MissingFieldError,
} = require('../services/operations/workOrderStateMachine.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeFakeWoModel() {
  const docs = [];
  let counter = 0;
  function shape(data) {
    const doc = {
      _id: `wo-${++counter}`,
      statusHistory: [],
      slaId: null,
      ...data,
      save: async function () {
        return this;
      },
    };
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
    _docs: () => docs,
  };
}

function makeRecorderEngine() {
  const calls = [];
  let slaCounter = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++slaCounter}`, ...args };
      calls.push({ kind: 'activate', args, result: sla });
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

function baseData(overrides = {}) {
  return {
    workOrderNumber: 'WO-TEST-0001',
    assetId: 'asset-1',
    type: 'corrective',
    priority: 'critical',
    title: 'fix hvac',
    description: 'hvac unit not cooling',
    scheduledDate: new Date(),
    status: 'draft',
    createdAt: new Date(),
    ...overrides,
  };
}

// ── tests ─────────────────────────────────────────────────────────

describe('WO state machine — transitions', () => {
  it('moves draft → submitted', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await woModel.create(baseData());

    await sm.transition({ workOrder: wo, toState: 'submitted' });
    expect(wo.status).toBe('submitted');
    expect(wo.statusHistory).toHaveLength(1);
    expect(wo.statusHistory[0].from).toBe('draft');
    expect(wo.statusHistory[0].to).toBe('submitted');
    expect(wo.statusHistory[0].event).toBe('submitted');
  });

  it('accepts legacy alias "pending" on current state', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await woModel.create(baseData({ status: 'pending' }));
    await sm.transition({ workOrder: wo, toState: 'approved' });
    expect(wo.status).toBe('approved');
  });

  it('rejects illegal transitions with code=ILLEGAL_TRANSITION', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await woModel.create(baseData());
    await expect(sm.transition({ workOrder: wo, toState: 'completed' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('enforces required fields — completed needs resolution', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await woModel.create(baseData({ status: 'in_progress' }));
    await expect(sm.transition({ workOrder: wo, toState: 'completed' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('patch unlocks a required-field transition', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await woModel.create(baseData({ status: 'in_progress' }));
    await sm.transition({
      workOrder: wo,
      toState: 'completed',
      patch: { resolution: 'replaced capacitor' },
    });
    expect(wo.status).toBe('completed');
    expect(wo.resolution).toBe('replaced capacitor');
    expect(wo.completedDate).toBeTruthy();
  });

  it('mirrors startedDate on entry to in_progress', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await woModel.create(baseData({ status: 'approved' }));
    await sm.transition({
      workOrder: wo,
      toState: 'in_progress',
    });
    expect(wo.startedDate).toBeTruthy();
  });
});

describe('WO state machine — bus events', () => {
  it('emits ops.wo.<event> and ops.wo.transitioned on each transition', async () => {
    const woModel = makeFakeWoModel();
    const bus = makeDispatcher();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel, dispatcher: bus });
    const wo = await woModel.create(baseData());

    await sm.transition({ workOrder: wo, toState: 'submitted' });
    const names = bus.events.map(e => e.name);
    expect(names).toEqual(expect.arrayContaining(['ops.wo.submitted', 'ops.wo.transitioned']));
  });

  it('payload contains subject identity + state transition fields', async () => {
    const woModel = makeFakeWoModel();
    const bus = makeDispatcher();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel, dispatcher: bus });
    const wo = await woModel.create(baseData());
    await sm.transition({ workOrder: wo, toState: 'submitted' });
    const evt = bus.events.find(e => e.name === 'ops.wo.submitted');
    expect(evt.payload).toMatchObject({
      workOrderId: wo._id,
      workOrderNumber: 'WO-TEST-0001',
      from: 'draft',
      to: 'submitted',
      event: 'submitted',
    });
  });
});

describe('WO state machine — SLA integration', () => {
  it('activates SLA on first transition for critical priority', async () => {
    const woModel = makeFakeWoModel();
    const engine = makeRecorderEngine();
    const sm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine: engine,
      dispatcher: makeDispatcher(),
    });
    const wo = await woModel.create(baseData({ priority: 'critical' }));
    await sm.transition({ workOrder: wo, toState: 'submitted' });

    const activate = engine.calls.find(c => c.kind === 'activate');
    expect(activate).toBeDefined();
    expect(activate.args.policyId).toBe('maintenance.wo.critical');
    expect(activate.args.subjectType).toBe('MaintenanceWorkOrder');
    expect(wo.slaId).toBeTruthy();
  });

  it('does NOT activate SLA for normal-priority corrective WO', async () => {
    const woModel = makeFakeWoModel();
    const engine = makeRecorderEngine();
    const sm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine: engine,
    });
    const wo = await woModel.create(baseData({ priority: 'normal' }));
    await sm.transition({ workOrder: wo, toState: 'submitted' });
    expect(engine.calls.find(c => c.kind === 'activate')).toBeUndefined();
    expect(wo.slaId).toBeFalsy();
  });

  it('fires observe(first_response) when entering triaged', async () => {
    const woModel = makeFakeWoModel();
    const engine = makeRecorderEngine();
    const sm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine: engine,
    });
    const wo = await woModel.create(baseData({ status: 'submitted' }));
    await sm.transition({ workOrder: wo, toState: 'triaged' });
    expect(
      engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'first_response')
    ).toBe(true);
  });

  it('fires observe(resolved) when entering completed', async () => {
    const woModel = makeFakeWoModel();
    const engine = makeRecorderEngine();
    const sm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine: engine,
    });
    const wo = await woModel.create(baseData({ status: 'in_progress', slaId: 'sla-preexisting' }));
    await sm.transition({
      workOrder: wo,
      toState: 'completed',
      patch: { resolution: 'done' },
    });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('fires observe(cancelled) when entering cancelled', async () => {
    const woModel = makeFakeWoModel();
    const engine = makeRecorderEngine();
    const sm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine: engine,
    });
    const wo = await woModel.create(baseData({ status: 'in_progress', slaId: 'sla-x' }));
    await sm.transition({ workOrder: wo, toState: 'cancelled' });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'cancelled')).toBe(
      true
    );
  });

  it('fires observe(state_changed) for pause states (on_hold)', async () => {
    const woModel = makeFakeWoModel();
    const engine = makeRecorderEngine();
    const sm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine: engine,
    });
    const wo = await woModel.create(baseData({ status: 'in_progress', slaId: 'sla-y' }));
    await sm.transition({ workOrder: wo, toState: 'on_hold' });
    const obs = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'state_changed'
    );
    expect(obs).toBeDefined();
    expect(obs.args.state).toBe('on_hold');
  });
});

describe('WO state machine — createWorkOrder convenience', () => {
  it('creates and auto-submits', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await sm.createWorkOrder(baseData({ status: undefined }));
    expect(wo.status).toBe('submitted');
    expect(wo.statusHistory).toHaveLength(1);
  });

  it('creates without auto-submit when flag off', async () => {
    const woModel = makeFakeWoModel();
    const sm = createWorkOrderStateMachine({ workOrderModel: woModel });
    const wo = await sm.createWorkOrder(baseData(), { autoSubmit: false });
    expect(wo.status).toBe('draft');
  });
});
