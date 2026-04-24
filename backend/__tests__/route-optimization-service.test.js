'use strict';

/**
 * route-optimization-service.test.js — Phase 16 Commit 7 (4.0.72).
 *
 * Behaviour tests for the route-optimization service including:
 *  - createJob + addRequest + optimize (deterministic output)
 *  - vehicle-capability enforcement on assignment
 *  - publish activates per-stop SLAs + emits ops.trip.scheduled
 *  - recordStopStatus → SLA resolve/cancel hooks
 *  - complete computes variance summary
 *  - cancel cancels outstanding stop SLAs
 */

process.env.NODE_ENV = 'test';

const {
  createRouteOptimizationService,
} = require('../services/operations/routeOptimization.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeFakeJobModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = {
        _id: `job-${++counter}`,
        jobNumber: `ROJ-TEST-${counter}`,
        requests: [],
        plannedStops: [],
        statusHistory: [],
        optimizationParams: {},
        varianceSummary: {},
        ...data,
        save: async function () {
          // stamp a fake _id on each request/stop sub-doc when missing
          for (const arr of [this.requests, this.plannedStops]) {
            if (!Array.isArray(arr)) continue;
            for (const x of arr) {
              if (!x._id) x._id = `sub-${Math.random().toString(36).slice(2, 10)}`;
            }
          }
          return this;
        },
      };
      // Stamp ids on sub-docs now too
      for (const arr of [d.requests, d.plannedStops]) {
        for (const x of arr) {
          if (!x._id) x._id = `sub-${Math.random().toString(36).slice(2, 10)}`;
        }
      }
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
          if (d[k] !== v) return false;
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

function makeSlaEngineRecorder() {
  const calls = [];
  let counter = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++counter}`, ...args };
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

function baseJob() {
  return {
    branchId: 'branch-1',
    runDate: new Date('2026-05-01T00:00:00Z'),
    departureTime: new Date('2026-05-01T07:00:00Z'),
    shift: 'morning',
  };
}

function makeRequest(overrides = {}) {
  return {
    beneficiaryId: null,
    beneficiaryNameSnapshot: overrides.name || 'Ali',
    pickupAddress: overrides.address || 'Street A',
    postalCode: overrides.postalCode || null,
    coordinates: overrides.coordinates || {},
    priority: overrides.priority || 'standard',
    requiredCapabilities: overrides.requiredCapabilities || [],
  };
}

// ── createJob + addRequest ────────────────────────────────────────

describe('RouteOptimization — createJob + addRequest', () => {
  it('creates a job in planning with empty stops', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    expect(j.status).toBe('planning');
    expect(j.plannedStops.length).toBe(0);
    expect(j.shift).toBe('morning');
  });

  it('throws MISSING_FIELD when branchId is missing', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const bad = baseJob();
    delete bad.branchId;
    await expect(svc.createJob(bad)).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('addRequest rejected outside planning status', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    j.status = 'published';
    await j.save();
    await expect(svc.addRequest(j._id, makeRequest())).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('addRequest requires address OR coordinates', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await expect(svc.addRequest(j._id, { priority: 'standard' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── optimize ──────────────────────────────────────────────────────

describe('RouteOptimization — optimize', () => {
  it('clusters by postalCode and puts medical-priority bucket first', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    // Bucket A: two standard passengers at same postcode
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111-AA', name: 'A1' }));
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111-AA', name: 'A2' }));
    // Bucket B: one medical passenger
    await svc.addRequest(
      j._id,
      makeRequest({ postalCode: '2222-BB', name: 'B1', priority: 'medical' })
    );
    // Bucket C: one standard passenger
    await svc.addRequest(j._id, makeRequest({ postalCode: '3333-CC', name: 'C1' }));

    const optimized = await svc.optimize(j._id);
    expect(optimized.status).toBe('optimized');
    // Medical bucket should be first
    expect(optimized.plannedStops[0].beneficiarySnapshot.names).toContain('B1');
    // Bucket A (size 2) should come before bucket C (size 1)
    const aIdx = optimized.plannedStops.findIndex(s => s.beneficiarySnapshot.names.includes('A1'));
    const cIdx = optimized.plannedStops.findIndex(s => s.beneficiarySnapshot.names.includes('C1'));
    expect(aIdx).toBeLessThan(cIdx);
    // Stop A coalesces both A1 and A2
    expect(optimized.plannedStops[aIdx].beneficiarySnapshot.count).toBe(2);
  });

  it('stamps plannedArrival at departure + index * minutesPerStop', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111' }));
    await svc.addRequest(j._id, makeRequest({ postalCode: '2222' }));
    const opt = await svc.optimize(j._id, { minutesPerStop: 10 });
    const diffMs =
      new Date(opt.plannedStops[1].plannedArrival).getTime() -
      new Date(opt.plannedStops[0].plannedArrival).getTime();
    expect(diffMs).toBe(10 * 60 * 1000);
  });

  it('refuses to optimize with no requests', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await expect(svc.optimize(j._id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('is deterministic — same inputs give same output', async () => {
    async function run() {
      const jobModel = makeFakeJobModel();
      const svc = createRouteOptimizationService({ jobModel });
      const j = await svc.createJob(baseJob());
      await svc.addRequest(j._id, makeRequest({ postalCode: 'AAAA', name: 'x' }));
      await svc.addRequest(j._id, makeRequest({ postalCode: 'BBBB', name: 'y' }));
      const opt = await svc.optimize(j._id, { minutesPerStop: 10 });
      return opt.plannedStops.map(s => s.beneficiarySnapshot.names.join(','));
    }
    const r1 = await run();
    const r2 = await run();
    expect(r1).toEqual(r2);
  });
});

// ── assignVehicle / assignDriver ─────────────────────────────────

describe('RouteOptimization — assignments', () => {
  it('assignVehicle enforces required capabilities', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(
      j._id,
      makeRequest({ postalCode: '1111', requiredCapabilities: ['wheelchair_lift'] })
    );
    await svc.optimize(j._id);

    await expect(
      svc.assignVehicle(j._id, { vehicleId: 'v1', capabilities: [] })
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const assigned = await svc.assignVehicle(j._id, {
      vehicleId: 'v1',
      capabilities: ['wheelchair_lift'],
    });
    expect(assigned.assignedVehicleId).toBe('v1');
  });

  it('assignDriver works', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111' }));
    await svc.optimize(j._id);
    const assigned = await svc.assignDriver(j._id, { driverId: 'd1', nameSnapshot: 'Driver Ali' });
    expect(assigned.assignedDriverId).toBe('d1');
    expect(assigned.assignedDriverNameSnapshot).toBe('Driver Ali');
  });
});

// ── publish ──────────────────────────────────────────────────────

describe('RouteOptimization — publish', () => {
  async function optimizedJob() {
    const jobModel = makeFakeJobModel();
    const engine = makeSlaEngineRecorder();
    const dispatcher = makeDispatcher();
    const svc = createRouteOptimizationService({
      jobModel,
      slaEngine: engine,
      dispatcher,
    });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111', name: 'A' }));
    await svc.addRequest(j._id, makeRequest({ postalCode: '2222', name: 'B' }));
    await svc.optimize(j._id);
    await svc.assignVehicle(j._id, { vehicleId: 'v1', capabilities: [] });
    await svc.assignDriver(j._id, { driverId: 'd1' });
    return { svc, jobId: j._id, engine, dispatcher };
  }

  it('activates one SLA per stop and emits ops.trip.scheduled each', async () => {
    const { svc, jobId, engine, dispatcher } = await optimizedJob();
    const published = await svc.publish(jobId);
    expect(published.status).toBe('published');
    expect(engine.calls.filter(c => c.kind === 'activate').length).toBe(2);
    const tripScheduled = dispatcher.events.filter(e => e.name === 'ops.trip.scheduled');
    expect(tripScheduled.length).toBe(2);
    for (const stop of published.plannedStops) {
      expect(stop.slaId).toBeTruthy();
    }
  });

  it('blocks publish without vehicle/driver', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111' }));
    await svc.optimize(j._id);
    await expect(svc.publish(j._id)).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });
});

// ── recordStopStatus ─────────────────────────────────────────────

describe('RouteOptimization — recordStopStatus', () => {
  async function publishedJob() {
    const jobModel = makeFakeJobModel();
    const engine = makeSlaEngineRecorder();
    const svc = createRouteOptimizationService({
      jobModel,
      slaEngine: engine,
    });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111' }));
    await svc.optimize(j._id);
    await svc.assignVehicle(j._id, { vehicleId: 'v1', capabilities: [] });
    await svc.assignDriver(j._id, { driverId: 'd1' });
    await svc.publish(j._id);
    const refreshed = await jobModel.findById(j._id);
    return { svc, jobId: j._id, engine, stop: refreshed.plannedStops[0] };
  }

  it('arrived fires SLA first_response and records variance', async () => {
    const { svc, jobId, engine, stop } = await publishedJob();
    const actual = new Date(new Date(stop.plannedArrival).getTime() + 3 * 60 * 1000);
    await svc.recordStopStatus(jobId, stop._id, { toStatus: 'arrived', when: actual });
    expect(
      engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'first_response')
    ).toBe(true);
  });

  it('picked_up resolves SLA', async () => {
    const { svc, jobId, engine, stop } = await publishedJob();
    await svc.recordStopStatus(jobId, stop._id, { toStatus: 'picked_up', when: new Date() });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('missed cancels SLA', async () => {
    const { svc, jobId, engine, stop } = await publishedJob();
    await svc.recordStopStatus(jobId, stop._id, { toStatus: 'missed', when: new Date() });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'cancelled')).toBe(
      true
    );
  });

  it('rejects recordStopStatus when job is still in planning', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111' }));
    await svc.optimize(j._id);
    const refreshed = await jobModel.findById(j._id);
    await expect(
      svc.recordStopStatus(j._id, refreshed.plannedStops[0]._id, { toStatus: 'arrived' })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });
});

// ── complete ─────────────────────────────────────────────────────

describe('RouteOptimization — complete', () => {
  it('computes onTime / late / missed / avgVariance', async () => {
    const jobModel = makeFakeJobModel();
    const svc = createRouteOptimizationService({ jobModel });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111', name: 'A' }));
    await svc.addRequest(j._id, makeRequest({ postalCode: '2222', name: 'B' }));
    await svc.addRequest(j._id, makeRequest({ postalCode: '3333', name: 'C' }));
    await svc.optimize(j._id);
    await svc.assignVehicle(j._id, { vehicleId: 'v1', capabilities: [] });
    await svc.assignDriver(j._id, { driverId: 'd1' });
    await svc.publish(j._id);
    await svc.start(j._id);
    const refreshed = await jobModel.findById(j._id);

    // Stop 0: on-time (+2)
    await svc.recordStopStatus(j._id, refreshed.plannedStops[0]._id, {
      toStatus: 'arrived',
      when: new Date(new Date(refreshed.plannedStops[0].plannedArrival).getTime() + 2 * 60 * 1000),
    });
    // Stop 1: late (+12)
    await svc.recordStopStatus(j._id, refreshed.plannedStops[1]._id, {
      toStatus: 'arrived',
      when: new Date(new Date(refreshed.plannedStops[1].plannedArrival).getTime() + 12 * 60 * 1000),
    });
    // Stop 2: missed
    await svc.recordStopStatus(j._id, refreshed.plannedStops[2]._id, {
      toStatus: 'missed',
      when: new Date(),
    });

    const completed = await svc.complete(j._id);
    expect(completed.status).toBe('completed');
    expect(completed.varianceSummary.totalStops).toBe(3);
    expect(completed.varianceSummary.onTimeCount).toBe(1);
    expect(completed.varianceSummary.lateCount).toBe(1);
    expect(completed.varianceSummary.missedCount).toBe(1);
    expect(completed.varianceSummary.avgVarianceMinutes).toBeCloseTo(7, 1);
    expect(completed.varianceSummary.maxVarianceMinutes).toBe(12);
  });
});

// ── cancel ───────────────────────────────────────────────────────

describe('RouteOptimization — cancel', () => {
  it('cancels outstanding stop SLAs for unresolved stops', async () => {
    const jobModel = makeFakeJobModel();
    const engine = makeSlaEngineRecorder();
    const svc = createRouteOptimizationService({
      jobModel,
      slaEngine: engine,
    });
    const j = await svc.createJob(baseJob());
    await svc.addRequest(j._id, makeRequest({ postalCode: '1111' }));
    await svc.addRequest(j._id, makeRequest({ postalCode: '2222' }));
    await svc.optimize(j._id);
    await svc.assignVehicle(j._id, { vehicleId: 'v1', capabilities: [] });
    await svc.assignDriver(j._id, { driverId: 'd1' });
    await svc.publish(j._id);
    const refreshed = await jobModel.findById(j._id);
    // First stop resolved; second still planned
    await svc.recordStopStatus(j._id, refreshed.plannedStops[0]._id, {
      toStatus: 'picked_up',
      when: new Date(),
    });

    const cancelled = await svc.cancel(j._id, { reason: 'weather' });
    expect(cancelled.status).toBe('cancelled');
    // Among observe() calls, we should see at least one 'cancelled'
    // for the still-open stop. And the resolved stop should NOT get
    // a second cancel call.
    const cancelObs = engine.calls.filter(
      c => c.kind === 'observe' && c.args.eventType === 'cancelled'
    );
    expect(cancelObs.length).toBe(1);
  });
});
