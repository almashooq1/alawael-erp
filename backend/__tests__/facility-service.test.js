'use strict';

/**
 * facility-service.test.js — Phase 16 Commit 3 (4.0.68).
 *
 * Behaviour tests for the Facility + FacilityInspection services,
 * including SLA + work-order integration. Uses in-memory fake
 * models + recorders so everything is hermetic.
 */

process.env.NODE_ENV = 'test';

const {
  createFacilityService,
  createFacilityInspectionService,
} = require('../services/operations/facility.service');

// ── fake models ───────────────────────────────────────────────────

function makeFakeModel({ prefix = 'doc', hooks = {} } = {}) {
  const docs = [];
  let counter = 0;
  function shape(data) {
    const doc = {
      _id: `${prefix}-${++counter}`,
      ...data,
      save: async function () {
        if (hooks.preSave) hooks.preSave(this);
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
      if (hooks.preSave) hooks.preSave(d);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (k === 'deleted_at' && v === null) {
            if (d.deleted_at) return false;
            continue;
          }
          if (d[k] === undefined && v !== undefined) return false;
          if (d[k] !== v && v !== undefined) return false;
        }
        return true;
      });
      const api = {
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        sort: () => api,
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
  };
}

function makeInspectionModel() {
  return makeFakeModel({
    prefix: 'insp',
    hooks: {
      preSave(doc) {
        if (!doc.inspectionNumber) doc.inspectionNumber = `INSP-TEST-${doc._id}`;
        if (!Array.isArray(doc.findings)) doc.findings = [];
        // Auto-assign _id to each finding so .id(x) behaves
        for (const f of doc.findings) {
          if (!f._id) f._id = `finding-${Math.random().toString(36).slice(2, 10)}`;
        }
        // Mirror .id(findingId) helper used by mongoose sub-docs.
        Object.defineProperty(doc.findings, 'id', {
          value: function (id) {
            return doc.findings.find(f => f._id === id);
          },
          configurable: true,
          enumerable: false,
        });
        // Recompute counts.
        const open = doc.findings.filter(f =>
          ['open', 'in_progress', 'awaiting_vendor'].includes(f.status)
        );
        doc.openFindingsCount = open.length;
        doc.criticalFindingsCount = open.filter(f => f.severity === 'critical').length;
      },
    },
  });
}

function makeSlaEngineRecorder() {
  const calls = [];
  let slaCounter = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++slaCounter}`, ...args };
      calls.push({ kind: 'activate', args });
      return sla;
    },
    async observe(args) {
      calls.push({ kind: 'observe', args });
      return { _id: args.slaId };
    },
  };
}

function makeWoStateMachineRecorder() {
  const calls = [];
  let woCounter = 0;
  return {
    calls,
    async createWorkOrder(data, opts) {
      const wo = {
        _id: `wo-${++woCounter}`,
        ...data,
        opts,
        status: opts?.autoSubmit ? 'submitted' : 'draft',
      };
      calls.push({ kind: 'createWorkOrder', data, opts });
      return wo;
    },
  };
}

function makeDispatcherRecorder() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function baseFacility() {
  return {
    code: 'RY-MAIN-B1',
    nameAr: 'مبنى الرياض الرئيسي',
    nameEn: 'Riyadh Main Building',
    branchId: 'branch-1',
    type: 'clinic',
    status: 'active',
    compliance: {},
    findings: [],
    deleted_at: null,
    createdAt: new Date(),
  };
}

// ── Facility service tests ────────────────────────────────────────

describe('FacilityService — CRUD', () => {
  it('creates a facility when all required fields are present', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    const doc = await svc.create(baseFacility());
    expect(doc._id).toBeTruthy();
    expect(doc.code).toBe('RY-MAIN-B1');
    expect(facilityModel._docs().length).toBe(1);
  });

  it('throws MISSING_FIELD when required field is missing', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    const partial = baseFacility();
    delete partial.nameEn;
    await expect(svc.create(partial)).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('throws NOT_FOUND when updating nonexistent facility', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    await expect(svc.update('does-not-exist', { nameEn: 'x' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('does not allow mutating code via update', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    const created = await svc.create(baseFacility());
    const updated = await svc.update(created._id, { code: 'CHANGED', nameEn: 'Updated' });
    expect(updated.code).toBe('RY-MAIN-B1');
    expect(updated.nameEn).toBe('Updated');
  });

  it('softDelete sets deleted_at and status=decommissioned', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    const created = await svc.create(baseFacility());
    const del = await svc.softDelete(created._id);
    expect(del.deleted_at).toBeTruthy();
    expect(del.status).toBe('decommissioned');
  });

  it('findById returns null for deleted facility', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    const created = await svc.create(baseFacility());
    await svc.softDelete(created._id);
    expect(await svc.findById(created._id)).toBeNull();
  });

  it('list filters out deleted facilities', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const svc = createFacilityService({ facilityModel });
    const a = await svc.create({ ...baseFacility(), code: 'A' });
    await svc.create({ ...baseFacility(), code: 'B' });
    await svc.softDelete(a._id);
    const rows = await svc.list();
    expect(rows.length).toBe(1);
    expect(rows[0].code).toBe('B');
  });
});

describe('FacilityService — compliance snapshot', () => {
  it('recomputes openFindings / criticalFindings from inspections', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const svc = createFacilityService({ facilityModel, inspectionModel });

    const facility = await svc.create(baseFacility());

    // Two inspections for this facility
    await inspectionModel.create({
      facilityId: facility._id,
      branchId: facility.branchId,
      type: 'fire_safety',
      status: 'completed',
      completedAt: new Date('2026-03-01'),
      findings: [
        { _id: 'f1', severity: 'critical', status: 'open', description: 'x' },
        { _id: 'f2', severity: 'minor', status: 'closed', description: 'y' },
      ],
      deleted_at: null,
    });
    await inspectionModel.create({
      facilityId: facility._id,
      branchId: facility.branchId,
      type: 'hvac',
      status: 'in_progress',
      completedAt: null,
      findings: [{ _id: 'f3', severity: 'major', status: 'awaiting_vendor', description: 'z' }],
      deleted_at: null,
    });

    const snap = await svc.recomputeComplianceSnapshot(facility._id);
    expect(snap.openFindings).toBe(2);
    expect(snap.criticalFindings).toBe(1);
    expect(snap.lastInspectionAt).toEqual(new Date('2026-03-01'));
  });
});

// ── Inspection service tests ──────────────────────────────────────

describe('FacilityInspectionService — schedule + lifecycle', () => {
  it('schedules an inspection and emits event', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const dispatcher = makeDispatcherRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      dispatcher,
    });
    const facility = await facilityModel.create(baseFacility());

    const doc = await svc.schedule({
      facilityId: facility._id,
      type: 'fire_safety',
      scheduledFor: new Date(),
    });
    expect(doc.facilityId).toBe(facility._id);
    expect(doc.type).toBe('fire_safety');
    expect(doc.status).toBe('scheduled');
    expect(dispatcher.events.some(e => e.name === 'ops.facility.inspection_scheduled')).toBe(true);
  });

  it('throws MISSING_FIELD for unknown type', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const svc = createFacilityInspectionService({ inspectionModel, facilityModel });
    const facility = await facilityModel.create(baseFacility());
    await expect(
      svc.schedule({ facilityId: facility._id, type: 'not_a_type' })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('start → in_progress, complete → completed, close → closed', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const svc = createFacilityInspectionService({ inspectionModel, facilityModel });
    const facility = await facilityModel.create(baseFacility());

    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);
    expect((await svc.findById(doc._id)).status).toBe('in_progress');
    await svc.complete(doc._id, { summary: 'all good' });
    expect((await svc.findById(doc._id)).status).toBe('completed');
    await svc.close(doc._id);
    expect((await svc.findById(doc._id)).status).toBe('closed');
  });

  it('cannot close while findings are still open', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const svc = createFacilityInspectionService({ inspectionModel, facilityModel });
    const facility = await facilityModel.create(baseFacility());

    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);
    await svc.raiseFinding(
      doc._id,
      { description: 'x', severity: 'minor' },
      { spawnWorkOrder: false }
    );
    await svc.complete(doc._id);
    await expect(svc.close(doc._id)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

describe('FacilityInspectionService — raiseFinding SLA + WO integration', () => {
  it('activates SLA clock on every new finding', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const engine = makeSlaEngineRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      slaEngine: engine,
    });
    const facility = await facilityModel.create(baseFacility());
    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);

    const { finding } = await svc.raiseFinding(
      doc._id,
      { description: 'blocked exit', severity: 'major' },
      { spawnWorkOrder: false }
    );

    const activate = engine.calls.find(c => c.kind === 'activate');
    expect(activate).toBeDefined();
    expect(activate.args.policyId).toBe('facility.inspection.closeout');
    expect(activate.args.subjectType).toBe('FacilityInspectionFinding');
    expect(finding.slaId).toBeTruthy();
  });

  it('spawns a WO for critical findings and back-links', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const wosm = makeWoStateMachineRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      workOrderStateMachine: wosm,
    });
    const facility = await facilityModel.create(baseFacility());
    const doc = await svc.schedule({ facilityId: facility._id, type: 'fire_safety' });
    await svc.start(doc._id);

    const { finding } = await svc.raiseFinding(doc._id, {
      description: 'fire extinguisher expired',
      severity: 'critical',
    });
    expect(wosm.calls.length).toBe(1);
    expect(wosm.calls[0].data.priority).toBe('critical');
    expect(finding.workOrderId).toBeTruthy();
  });

  it('does NOT spawn a WO for observation severity', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const wosm = makeWoStateMachineRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      workOrderStateMachine: wosm,
    });
    const facility = await facilityModel.create(baseFacility());
    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);

    const { finding } = await svc.raiseFinding(doc._id, {
      description: 'dust in filter',
      severity: 'observation',
    });
    expect(wosm.calls.length).toBe(0);
    expect(finding.workOrderId).toBeFalsy();
  });

  it('closing a finding fires SLA observe(resolved)', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const engine = makeSlaEngineRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      slaEngine: engine,
    });
    const facility = await facilityModel.create(baseFacility());
    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);
    const { finding } = await svc.raiseFinding(
      doc._id,
      { description: 'x', severity: 'major' },
      { spawnWorkOrder: false }
    );

    await svc.updateFindingStatus(doc._id, finding._id, {
      toStatus: 'closed',
      closureNotes: 'fixed by contractor',
    });

    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('moving a finding to awaiting_vendor fires SLA state_changed', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const engine = makeSlaEngineRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      slaEngine: engine,
    });
    const facility = await facilityModel.create(baseFacility());
    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);
    const { finding } = await svc.raiseFinding(
      doc._id,
      { description: 'x', severity: 'major' },
      { spawnWorkOrder: false }
    );

    await svc.updateFindingStatus(doc._id, finding._id, {
      toStatus: 'awaiting_vendor',
    });

    const obs = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'state_changed'
    );
    expect(obs).toBeDefined();
    expect(obs.args.state).toBe('awaiting_vendor');
  });

  it('emits ops.facility.finding_raised on raiseFinding', async () => {
    const facilityModel = makeFakeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const dispatcher = makeDispatcherRecorder();
    const svc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      dispatcher,
    });
    const facility = await facilityModel.create(baseFacility());
    const doc = await svc.schedule({ facilityId: facility._id, type: 'hvac' });
    await svc.start(doc._id);
    await svc.raiseFinding(
      doc._id,
      { description: 'x', severity: 'major' },
      { spawnWorkOrder: false }
    );
    expect(dispatcher.events.some(e => e.name === 'ops.facility.finding_raised')).toBe(true);
  });
});
