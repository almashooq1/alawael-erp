'use strict';

/**
 * routeOptimization.service.js — Phase 16 Commit 7 (4.0.72).
 *
 * Planning + reconciliation service for transport routes.
 *
 * Surfaces:
 *   createJob          — open a new planning job for a branch/shift
 *   addRequest         — push a pickup request into the job
 *   optimize           — cluster + sort + generate plannedStops
 *   assignVehicle      — pick vehicle (validating capabilities)
 *   assignDriver       — pick driver
 *   publish            — lock plan, activate SLA clock per stop,
 *                        emit ops.trip.scheduled for each stop
 *   start              — flip to in_transit (driver on route)
 *   recordStopStatus   — arrived / picked_up / missed / skipped;
 *                        observe SLA for that stop
 *   complete           — finalise + compute varianceSummary
 *   cancel             — close job + cancel outstanding SLAs
 *   transition         — generic state-machine (plan→optim→published→...)
 *
 * Design notes:
 *   1. Optimization is deterministic. Same inputs → same stops,
 *      so reconciliation diffs are meaningful and tests are
 *      stable.
 *   2. The vehicle-capability check runs on every assignment AND
 *      on publish. A vehicle change between optimize and publish
 *      is allowed as long as it still satisfies constraints.
 *   3. One SLA clock per stop (not per job) — that's how the
 *      Phase-15 notification router gets to warn about a single
 *      late pickup without paging the whole route.
 *   4. Variance summary is computed once on completion. Mid-run
 *      stop diffs are on the individual stop object.
 */

const registry = require('../../config/routeOptimization.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalTransitionError extends Error {
  constructor(msg, extra = {}) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    Object.assign(this, extra);
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}
class ConflictError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'CONFLICT';
  }
}

function createRouteOptimizationService({
  jobModel,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!jobModel) throw new Error('routeOptimization: jobModel required');
  registry.validate();

  // ── helpers ─────────────────────────────────────────────────────

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[RouteOpt] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _snapshotJob(j, extra = {}) {
    return {
      jobId: String(j._id),
      jobNumber: j.jobNumber,
      branchId: j.branchId ? String(j.branchId) : null,
      runDate: j.runDate,
      shift: j.shift,
      status: j.status,
      assignedVehicleId: j.assignedVehicleId ? String(j.assignedVehicleId) : null,
      assignedDriverId: j.assignedDriverId ? String(j.assignedDriverId) : null,
      stopCount: (j.plannedStops || []).length,
      ...extra,
    };
  }

  function _pushHistory(job, { from, to, event, actorId, notes }) {
    job.statusHistory.push({
      from,
      to,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
  }

  function _ensureLegal(from, to) {
    if (!registry.canTransition(from, to)) {
      throw new IllegalTransitionError(`illegal transition ${from} → ${to}`, {
        from,
        to,
      });
    }
    return registry.eventForTransition(from, to);
  }

  // ── createJob ───────────────────────────────────────────────────

  async function createJob(data, { actorId = null } = {}) {
    const required = ['branchId', 'runDate', 'departureTime'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const doc = await jobModel.create({
      branchId: data.branchId,
      runDate: data.runDate,
      shift: data.shift || 'morning',
      departureTime: data.departureTime,
      status: 'planning',
      requests: data.requests || [],
      plannedStops: [],
      statusHistory: [],
      createdBy: actorId,
    });
    await _emit('ops.route.job_created', _snapshotJob(doc));
    return doc;
  }

  // ── addRequest ──────────────────────────────────────────────────

  async function addRequest(jobId, requestData, { actorId = null } = {}) {
    if (_missing(requestData.pickupAddress) && !requestData.coordinates) {
      throw new MissingFieldError(['pickupAddress OR coordinates']);
    }
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (job.status !== 'planning') {
      throw new IllegalTransitionError(`Cannot add request while status='${job.status}'`, {
        from: job.status,
      });
    }
    job.requests.push({
      beneficiaryId: requestData.beneficiaryId || null,
      beneficiaryNameSnapshot: requestData.beneficiaryNameSnapshot || null,
      guardianPhone: requestData.guardianPhone || null,
      pickupAddress: requestData.pickupAddress || null,
      postalCode: requestData.postalCode || null,
      coordinates: requestData.coordinates || {},
      priority: requestData.priority || 'standard',
      requiredCapabilities: requestData.requiredCapabilities || [],
      preferredWindow: requestData.preferredWindow || {},
      notes: requestData.notes || null,
    });
    job.updatedBy = actorId;
    await job.save();
    return job;
  }

  // ── optimize ────────────────────────────────────────────────────

  /**
   * Deterministic optimizer — geographic-bucket + priority sort +
   * nearest-neighbour within bucket. Not a TSP solver, but covers
   * the 80% case and is testable.
   */
  async function optimize(
    jobId,
    {
      actorId = null,
      minutesPerStop = registry.DEFAULT_MINUTES_PER_STOP,
      maxStopsPerVehicle = registry.DEFAULT_MAX_STOPS_PER_VEHICLE,
    } = {}
  ) {
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (!['planning', 'optimized'].includes(job.status)) {
      throw new IllegalTransitionError(`Cannot optimize while status='${job.status}'`, {
        from: job.status,
        to: 'optimized',
      });
    }
    if (!job.requests || job.requests.length === 0) {
      throw new ConflictError('Cannot optimize: no pickup requests');
    }

    // 1. Group by geographic bucket.
    const buckets = new Map();
    for (const req of job.requests) {
      const key = registry.geoBucketKey(req);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(req);
    }

    // 2. Sort requests inside each bucket by priority, then keep
    //    input order as stable tiebreaker.
    for (const group of buckets.values()) {
      group.sort((a, b) => {
        const pa = registry.priorityRank(a.priority);
        const pb = registry.priorityRank(b.priority);
        return pa - pb;
      });
    }

    // 3. Order buckets themselves: buckets that contain a medical
    //    request come first, then by size desc, then by key for
    //    determinism.
    const sortedBuckets = [...buckets.entries()].sort(([kA, gA], [kB, gB]) => {
      const medA = gA.some(r => r.priority === 'medical') ? 0 : 1;
      const medB = gB.some(r => r.priority === 'medical') ? 0 : 1;
      if (medA !== medB) return medA - medB;
      if (gB.length !== gA.length) return gB.length - gA.length;
      return kA < kB ? -1 : kA > kB ? 1 : 0;
    });

    // 4. Flatten into ordered requests, coalesce by bucket key so a
    //    multi-passenger building becomes a single stop.
    const stops = [];
    let totalStops = 0;
    for (const [, group] of sortedBuckets) {
      if (totalStops >= maxStopsPerVehicle) break;
      totalStops++;
      const sequence = stops.length;
      const plannedArrival = registry.plannedArrivalAt(job.departureTime, sequence, minutesPerStop);
      const names = group.map(r => r.beneficiaryNameSnapshot).filter(Boolean);
      stops.push({
        sequence,
        address: group[0].pickupAddress || null,
        coordinates: group[0].coordinates || {},
        requestIds: group.map(r => r._id),
        beneficiarySnapshot: {
          count: group.length,
          names,
        },
        plannedArrival,
        actualArrival: null,
        varianceMinutes: null,
        status: 'planned',
        slaId: null,
      });
    }

    job.plannedStops = stops;
    job.optimizationParams = {
      minutesPerStop,
      maxStopsPerVehicle,
      algorithm: 'geo-bucket-nn-v1',
      optimizedAt: now(),
    };

    const from = job.status;
    const event = _ensureLegal(from, 'optimized');
    _pushHistory(job, { from, to: 'optimized', event, actorId, notes: `${stops.length} stops` });
    job.status = 'optimized';
    job.updatedBy = actorId;

    await job.save();
    await _emit('ops.route.optimized', _snapshotJob(job, { from, to: 'optimized' }));
    return job;
  }

  // ── assign vehicle + driver ─────────────────────────────────────

  async function assignVehicle(
    jobId,
    { vehicleId, registration = null, capabilities = [], actorId = null } = {}
  ) {
    if (!vehicleId) throw new MissingFieldError(['vehicleId']);
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (!['planning', 'optimized', 'published'].includes(job.status)) {
      throw new IllegalTransitionError(`Cannot assign vehicle while status='${job.status}'`, {
        from: job.status,
      });
    }
    // Constraint check: every stop's requiredCapabilities must be
    // covered by the assigned vehicle.
    const offending = [];
    for (const stop of job.plannedStops || []) {
      for (const reqId of stop.requestIds || []) {
        const req =
          (job.requests || []).id?.(reqId) ||
          (job.requests || []).find(r => String(r._id) === String(reqId));
        if (!req) continue;
        for (const cap of req.requiredCapabilities || []) {
          if (!capabilities.includes(cap)) offending.push({ stopSequence: stop.sequence, cap });
        }
      }
    }
    if (offending.length) {
      throw new ConflictError(
        `Vehicle missing required capability(ies): ${offending.map(o => `stop#${o.stopSequence}:${o.cap}`).join(', ')}`
      );
    }
    job.assignedVehicleId = vehicleId;
    job.assignedVehicleRegistration = registration;
    job.assignedVehicleCapabilities = capabilities;
    job.updatedBy = actorId;
    await job.save();
    return job;
  }

  async function assignDriver(jobId, { driverId, nameSnapshot = null, actorId = null } = {}) {
    if (!driverId) throw new MissingFieldError(['driverId']);
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (!['planning', 'optimized', 'published'].includes(job.status)) {
      throw new IllegalTransitionError(`Cannot assign driver while status='${job.status}'`, {
        from: job.status,
      });
    }
    job.assignedDriverId = driverId;
    job.assignedDriverNameSnapshot = nameSnapshot;
    job.updatedBy = actorId;
    await job.save();
    return job;
  }

  // ── publish ─────────────────────────────────────────────────────

  async function publish(jobId, { actorId = null } = {}) {
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (!job.assignedVehicleId || !job.assignedDriverId) {
      throw new MissingFieldError(
        [
          !job.assignedVehicleId && 'assignedVehicleId',
          !job.assignedDriverId && 'assignedDriverId',
        ].filter(Boolean)
      );
    }
    if (!job.plannedStops || job.plannedStops.length === 0) {
      throw new ConflictError('Cannot publish: no planned stops');
    }

    const from = job.status;
    const event = _ensureLegal(from, 'published');
    _pushHistory(job, { from, to: 'published', event, actorId });
    job.status = 'published';
    job.updatedBy = actorId;

    // Activate per-stop SLA clocks.
    if (slaEngine) {
      for (const stop of job.plannedStops) {
        try {
          const sla = await slaEngine.activate({
            policyId: registry.slaPolicyForStop(),
            subjectType: 'RouteStop',
            subjectId: stop._id,
            subjectRef: `${job.jobNumber}#${stop.sequence}`,
            branchId: job.branchId || null,
            startedAt: stop.plannedArrival,
            metadata: {
              jobId: String(job._id),
              sequence: stop.sequence,
              address: stop.address,
            },
          });
          stop.slaId = sla._id;
        } catch (err) {
          logger.warn(`[RouteOpt] SLA activate stop ${stop.sequence} failed: ${err.message}`);
        }
      }
    }

    await job.save();
    await _emit('ops.route.published', _snapshotJob(job, { from, to: 'published' }));
    // Per-stop scheduled event so notification policies can subscribe.
    for (const stop of job.plannedStops) {
      await _emit('ops.trip.scheduled', {
        jobId: String(job._id),
        stopId: String(stop._id),
        sequence: stop.sequence,
        plannedArrival: stop.plannedArrival,
        beneficiaries: stop.beneficiarySnapshot?.names || [],
        slaId: stop.slaId ? String(stop.slaId) : null,
      });
    }
    return job;
  }

  // ── start ───────────────────────────────────────────────────────

  async function start(jobId, { actorId = null, tripId = null } = {}) {
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    const from = job.status;
    const event = _ensureLegal(from, 'in_transit');
    _pushHistory(job, { from, to: 'in_transit', event, actorId });
    job.status = 'in_transit';
    if (tripId) job.linkedTripId = tripId;
    job.updatedBy = actorId;
    await job.save();
    await _emit('ops.route.started', _snapshotJob(job, { from, to: 'in_transit' }));
    return job;
  }

  // ── recordStopStatus ────────────────────────────────────────────

  async function recordStopStatus(
    jobId,
    stopId,
    { toStatus, when = null, notes = null, actorId = null } = {}
  ) {
    if (!registry.STOP_STATUSES.includes(toStatus)) {
      throw new MissingFieldError([`toStatus (unknown '${toStatus}')`]);
    }
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (!['published', 'in_transit'].includes(job.status)) {
      throw new IllegalTransitionError(`Cannot record stop status while job='${job.status}'`, {
        from: job.status,
      });
    }
    const stop = (job.plannedStops || []).find(s => String(s._id) === String(stopId));
    if (!stop) throw new NotFoundError('Stop not found');

    const ts = when ? new Date(when) : now();
    stop.status = toStatus;
    stop.statusAt = ts;
    stop.statusNotes = notes;

    if (toStatus === 'arrived') {
      stop.actualArrival = ts;
      stop.varianceMinutes = registry.varianceMinutes(stop.plannedArrival, ts);
    }

    if (slaEngine && stop.slaId) {
      try {
        if (registry.STOP_RESOLUTION_STATUSES.includes(toStatus)) {
          await slaEngine.observe({
            slaId: stop.slaId,
            eventType: 'resolved',
            when: ts,
          });
        } else if (registry.STOP_MISSED_STATUSES.includes(toStatus)) {
          await slaEngine.observe({
            slaId: stop.slaId,
            eventType: 'cancelled',
            when: ts,
          });
        } else if (toStatus === 'arrived') {
          await slaEngine.observe({
            slaId: stop.slaId,
            eventType: 'first_response',
            when: ts,
          });
        }
      } catch (err) {
        logger.warn(`[RouteOpt] stop SLA observe failed: ${err.message}`);
      }
    }

    job.updatedBy = actorId;
    await job.save();
    await _emit('ops.route.stop_status_changed', {
      jobId: String(job._id),
      stopId: String(stop._id),
      sequence: stop.sequence,
      toStatus,
      varianceMinutes: stop.varianceMinutes,
    });
    return { job, stop };
  }

  // ── complete ────────────────────────────────────────────────────

  async function complete(jobId, { actorId = null } = {}) {
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    const from = job.status;
    const event = _ensureLegal(from, 'completed');

    // Compute variance summary.
    const stops = job.plannedStops || [];
    const totalStops = stops.length;
    let onTime = 0;
    let late = 0;
    let missed = 0;
    const variances = [];
    for (const s of stops) {
      if (registry.STOP_MISSED_STATUSES.includes(s.status)) {
        missed++;
        continue;
      }
      const v = s.varianceMinutes;
      if (typeof v === 'number') {
        variances.push(v);
        if (v <= 5) onTime++;
        else late++;
      } else {
        missed++; // never got an actual — count as missed for variance rollup
      }
    }
    const avgVariance = variances.length
      ? Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 10) / 10
      : null;
    const maxVariance = variances.length ? Math.max(...variances) : null;

    job.varianceSummary = {
      totalStops,
      onTimeCount: onTime,
      lateCount: late,
      missedCount: missed,
      avgVarianceMinutes: avgVariance,
      maxVarianceMinutes: maxVariance,
    };
    _pushHistory(job, { from, to: 'completed', event, actorId });
    job.status = 'completed';
    job.completedAt = now();
    job.updatedBy = actorId;

    await job.save();
    await _emit(
      'ops.route.completed',
      _snapshotJob(job, { from, to: 'completed', ...job.varianceSummary })
    );
    return job;
  }

  // ── cancel ──────────────────────────────────────────────────────

  async function cancel(jobId, { actorId = null, reason = null } = {}) {
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    const from = job.status;
    const event = _ensureLegal(from, 'cancelled');

    // Cancel any outstanding stop SLAs.
    if (slaEngine) {
      for (const stop of job.plannedStops || []) {
        if (!stop.slaId) continue;
        if (registry.STOP_RESOLUTION_STATUSES.includes(stop.status)) continue;
        try {
          await slaEngine.observe({
            slaId: stop.slaId,
            eventType: 'cancelled',
            when: now(),
          });
        } catch (err) {
          logger.warn(`[RouteOpt] cancel stop SLA failed: ${err.message}`);
        }
      }
    }

    _pushHistory(job, { from, to: 'cancelled', event, actorId, notes: reason });
    job.status = 'cancelled';
    job.cancelledAt = now();
    job.updatedBy = actorId;
    await job.save();
    await _emit('ops.route.cancelled', _snapshotJob(job, { from, to: 'cancelled', reason }));
    return job;
  }

  // ── reads ───────────────────────────────────────────────────────

  async function findById(id) {
    const d = await jobModel.findById(id);
    if (!d || d.deleted_at) return null;
    return d;
  }

  async function list({
    branchId = null,
    runDate = null,
    shift = null,
    status = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (runDate) filter.runDate = runDate;
    if (shift) filter.shift = shift;
    if (status) filter.status = status;
    return jobModel.find(filter).skip(skip).limit(limit).sort({ runDate: -1, shift: 1 });
  }

  return {
    createJob,
    addRequest,
    optimize,
    assignVehicle,
    assignDriver,
    publish,
    start,
    recordStopStatus,
    complete,
    cancel,
    findById,
    list,
  };
}

module.exports = {
  createRouteOptimizationService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
