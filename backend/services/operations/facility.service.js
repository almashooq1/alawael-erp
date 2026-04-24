'use strict';

/**
 * facility.service.js — Phase 16 Commit 3 (4.0.68).
 *
 * Two services in one module:
 *
 *   1. `createFacilityService` — CRUD over the Facility model plus
 *      a `getComplianceSnapshot(facilityId)` helper used by the
 *      ops control tower to render the per-building compliance
 *      tile.
 *
 *   2. `createFacilityInspectionService` — schedule an inspection,
 *      record findings, and close findings. The service owns the
 *      SLA wiring: every finding activates a
 *      `facility.inspection.closeout` clock; critical/major
 *      findings additionally spawn a corrective-maintenance WO via
 *      the injected work-order state-machine. Closing a finding
 *      resolves the SLA.
 *
 * Both services accept injected dependencies (model, slaEngine,
 * workOrderStateMachine, dispatcher, logger) so the bootstrap can
 * wire the real singletons and the tests can swap in recorders.
 *
 * Error codes returned on the thrown error's `.code` field:
 *   - NOT_FOUND
 *   - ILLEGAL_TRANSITION   (re-used semantics)
 *   - MISSING_FIELD
 */

const registry = require('../../config/facility.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalStateError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}

// ── Facility service ────────────────────────────────────────────────

function createFacilityService({ facilityModel, inspectionModel = null, logger = console } = {}) {
  if (!facilityModel) throw new Error('facility.service: facilityModel required');
  registry.validate();

  async function create(data, { actorId = null } = {}) {
    const required = ['code', 'nameAr', 'nameEn', 'branchId', 'type'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const doc = await facilityModel.create({
      ...data,
      createdBy: actorId || null,
    });
    return doc;
  }

  async function update(id, patch, { actorId = null } = {}) {
    const doc = await facilityModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Facility not found');
    for (const [k, v] of Object.entries(patch || {})) {
      if (k === '_id' || k === 'code') continue; // immutable
      doc[k] = v;
    }
    if (actorId) doc.updatedBy = actorId;
    return doc.save();
  }

  async function softDelete(id) {
    const doc = await facilityModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Facility not found');
    doc.deleted_at = new Date();
    doc.status = 'decommissioned';
    doc.decommissionedAt = new Date();
    return doc.save();
  }

  async function findById(id) {
    const doc = await facilityModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function list({ branchId = null, type = null, status = null, limit = 100, skip = 0 } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    return facilityModel.find(filter).skip(skip).limit(limit).sort({ code: 1 });
  }

  /**
   * Roll up finding counts from open FacilityInspections for a
   * given facility. Updates the stored snapshot for fast reads,
   * and returns the computed shape.
   */
  async function recomputeComplianceSnapshot(facilityId) {
    if (!inspectionModel) return null;
    const doc = await facilityModel.findById(facilityId);
    if (!doc) return null;

    const inspections = await inspectionModel.find({
      facilityId: doc._id,
      deleted_at: null,
    });

    let lastInspectionAt = null;
    let openFindings = 0;
    let criticalFindings = 0;
    for (const insp of inspections) {
      if (insp.completedAt) {
        if (!lastInspectionAt || insp.completedAt > lastInspectionAt) {
          lastInspectionAt = insp.completedAt;
        }
      }
      for (const f of insp.findings || []) {
        if (['open', 'in_progress', 'awaiting_vendor'].includes(f.status)) {
          openFindings++;
          if (f.severity === 'critical') criticalFindings++;
        }
      }
    }

    doc.compliance = {
      ...doc.compliance,
      lastInspectionAt,
      openFindings,
      criticalFindings,
    };
    await doc.save();
    return doc.compliance;
  }

  return {
    create,
    update,
    softDelete,
    findById,
    list,
    recomputeComplianceSnapshot,
  };
}

// ── Inspection service ──────────────────────────────────────────────

function createFacilityInspectionService({
  inspectionModel,
  facilityModel,
  slaEngine = null, // { activate, observe }
  workOrderStateMachine = null, // { createWorkOrder }
  workOrderModel = null, // used when SM absent — create raw WO
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!inspectionModel) throw new Error('facilityInspection: inspectionModel required');
  if (!facilityModel) throw new Error('facilityInspection: facilityModel required');
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[FacilityInspection] emit ${name} failed: ${err.message}`);
    }
  }

  async function schedule({ facilityId, type, scheduledFor, inspectorId = null, actorId = null }) {
    const facility = await facilityModel.findById(facilityId);
    if (!facility || facility.deleted_at) throw new NotFoundError('Facility not found');
    if (!registry.inspectionTypeByCode(type)) {
      throw new MissingFieldError([`type (unknown '${type}')`]);
    }
    const doc = await inspectionModel.create({
      facilityId: facility._id,
      branchId: facility.branchId,
      type,
      status: 'scheduled',
      scheduledFor: scheduledFor || new Date(),
      inspectorId,
      findings: [],
      createdBy: actorId,
    });
    await _emit('ops.facility.inspection_scheduled', {
      inspectionId: String(doc._id),
      facilityId: String(facility._id),
      type,
      scheduledFor: doc.scheduledFor,
    });
    return doc;
  }

  async function start(inspectionId, { actorId = null } = {}) {
    const doc = await inspectionModel.findById(inspectionId);
    if (!doc) throw new NotFoundError('Inspection not found');
    if (doc.status !== 'scheduled') {
      throw new IllegalStateError(`Cannot start from status '${doc.status}'`);
    }
    doc.status = 'in_progress';
    doc.startedAt = now();
    if (actorId) doc.inspectorId = doc.inspectorId || actorId;
    await doc.save();
    await _emit('ops.facility.inspection_started', {
      inspectionId: String(doc._id),
      facilityId: String(doc.facilityId),
    });
    return doc;
  }

  /**
   * Record a finding and activate its SLA clock. If the severity
   * is critical/major (or the caller explicitly sets `spawnWorkOrder`),
   * also spawn a corrective-maintenance WO and link it back.
   */
  async function raiseFinding(
    inspectionId,
    findingData,
    { actorId = null, spawnWorkOrder = null, assetId = null } = {}
  ) {
    const required = ['description', 'severity'];
    const missing = required.filter(f => _missing(findingData[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.FINDING_SEVERITIES.includes(findingData.severity)) {
      throw new MissingFieldError([`severity (unknown '${findingData.severity}')`]);
    }

    const doc = await inspectionModel.findById(inspectionId);
    if (!doc) throw new NotFoundError('Inspection not found');
    if (!['scheduled', 'in_progress', 'completed'].includes(doc.status)) {
      throw new IllegalStateError(`Cannot raise finding while inspection is '${doc.status}'`);
    }

    doc.findings.push({
      ...findingData,
      status: 'open',
      raisedBy: actorId,
      raisedAt: now(),
    });
    await doc.save();
    const finding = doc.findings[doc.findings.length - 1];

    // ── SLA clock ───────────────────────────────────────────────
    if (slaEngine) {
      const policyId = registry.slaPolicyForFinding(finding);
      try {
        const sla = await slaEngine.activate({
          policyId,
          subjectType: 'FacilityInspectionFinding',
          subjectId: finding._id,
          subjectRef: `${doc.inspectionNumber}#${finding._id}`,
          branchId: doc.branchId,
          startedAt: finding.raisedAt,
          metadata: {
            severity: finding.severity,
            inspectionId: String(doc._id),
            facilityId: String(doc.facilityId),
          },
        });
        finding.slaId = sla._id;
      } catch (err) {
        logger.warn(`[FacilityInspection] SLA activate failed: ${err.message}`);
      }
    }

    // ── auto work-order spawn ───────────────────────────────────
    const shouldSpawn =
      spawnWorkOrder === true ||
      (spawnWorkOrder !== false && registry.shouldSpawnWorkOrder(finding));
    if (shouldSpawn) {
      try {
        const woData = {
          workOrderNumber: `WO-AUTO-${String(Date.now()).slice(-8)}`,
          branchId: doc.branchId,
          assetId: assetId || null,
          type: 'corrective',
          priority: registry.workOrderPriorityForSeverity(finding.severity),
          title: `Inspection finding: ${finding.description.slice(0, 80)}`,
          description: `Auto-spawned from ${doc.inspectionNumber} finding ${finding._id}.\nSeverity: ${finding.severity}\nRecommendation: ${finding.recommendation || 'n/a'}`,
          scheduledDate: new Date(),
        };

        let wo = null;
        if (workOrderStateMachine) {
          wo = await workOrderStateMachine.createWorkOrder(woData, {
            actorId,
            autoSubmit: true,
          });
        } else if (workOrderModel) {
          wo = await workOrderModel.create({ ...woData, status: 'submitted' });
        }
        if (wo) finding.workOrderId = wo._id;
      } catch (err) {
        logger.warn(`[FacilityInspection] WO spawn failed: ${err.message}`);
      }
    }

    await doc.save();
    await _emit('ops.facility.finding_raised', {
      inspectionId: String(doc._id),
      findingId: String(finding._id),
      severity: finding.severity,
      facilityId: String(doc.facilityId),
      workOrderId: finding.workOrderId ? String(finding.workOrderId) : null,
    });
    return { inspection: doc, finding };
  }

  /**
   * Mark a finding as in-progress / awaiting_vendor / closed /
   * deferred. Drives the SLA engine observe() for each state.
   */
  async function updateFindingStatus(
    inspectionId,
    findingId,
    { toStatus, closureNotes = null, actorId = null }
  ) {
    if (!registry.FINDING_STATUSES.includes(toStatus)) {
      throw new MissingFieldError([`toStatus (unknown '${toStatus}')`]);
    }
    const doc = await inspectionModel.findById(inspectionId);
    if (!doc) throw new NotFoundError('Inspection not found');
    const finding = doc.findings.id(findingId);
    if (!finding) throw new NotFoundError('Finding not found');

    const fromStatus = finding.status;
    finding.status = toStatus;
    if (registry.FINDING_RESOLUTION_STATUSES.includes(toStatus)) {
      finding.closedAt = now();
      finding.closedBy = actorId;
      if (closureNotes) finding.closureNotes = closureNotes;
    }

    // ── SLA hook ────────────────────────────────────────────────
    if (slaEngine && finding.slaId) {
      try {
        if (registry.FINDING_RESOLUTION_STATUSES.includes(toStatus)) {
          await slaEngine.observe({
            slaId: finding.slaId,
            eventType: 'resolved',
            when: finding.closedAt,
          });
        } else {
          await slaEngine.observe({
            slaId: finding.slaId,
            eventType: 'state_changed',
            state: toStatus,
            when: now(),
          });
        }
      } catch (err) {
        logger.warn(`[FacilityInspection] SLA observe failed: ${err.message}`);
      }
    }

    await doc.save();
    await _emit('ops.facility.finding_status_changed', {
      inspectionId: String(doc._id),
      findingId: String(finding._id),
      from: fromStatus,
      to: toStatus,
      facilityId: String(doc.facilityId),
    });
    return { inspection: doc, finding };
  }

  async function complete(inspectionId, { summary = null, actorId = null } = {}) {
    const doc = await inspectionModel.findById(inspectionId);
    if (!doc) throw new NotFoundError('Inspection not found');
    if (doc.status !== 'in_progress') {
      throw new IllegalStateError(`Cannot complete from status '${doc.status}'`);
    }
    doc.status = 'completed';
    doc.completedAt = now();
    doc.summary = summary || doc.summary;
    if (actorId) doc.reviewerId = doc.reviewerId || actorId;
    await doc.save();
    await _emit('ops.facility.inspection_completed', {
      inspectionId: String(doc._id),
      facilityId: String(doc.facilityId),
      openFindings: doc.openFindingsCount,
      criticalFindings: doc.criticalFindingsCount,
    });
    return doc;
  }

  async function close(inspectionId, { actorId = null } = {}) {
    const doc = await inspectionModel.findById(inspectionId);
    if (!doc) throw new NotFoundError('Inspection not found');
    if (doc.status !== 'completed') {
      throw new IllegalStateError(`Cannot close from status '${doc.status}'`);
    }
    const stillOpen = doc.findings.filter(f =>
      ['open', 'in_progress', 'awaiting_vendor'].includes(f.status)
    );
    if (stillOpen.length) {
      throw new IllegalStateError(`Cannot close — ${stillOpen.length} findings still open`);
    }
    doc.status = 'closed';
    doc.closedAt = now();
    if (actorId) doc.reviewerId = doc.reviewerId || actorId;
    await doc.save();
    await _emit('ops.facility.inspection_closed', {
      inspectionId: String(doc._id),
      facilityId: String(doc.facilityId),
    });
    return doc;
  }

  async function findById(id) {
    return inspectionModel.findById(id);
  }

  async function list({
    facilityId = null,
    branchId = null,
    type = null,
    status = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (facilityId) filter.facilityId = facilityId;
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    return inspectionModel.find(filter).skip(skip).limit(limit).sort({ scheduledFor: -1 });
  }

  return {
    schedule,
    start,
    raiseFinding,
    updateFindingStatus,
    complete,
    close,
    findById,
    list,
  };
}

function _missing(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

module.exports = {
  createFacilityService,
  createFacilityInspectionService,
  NotFoundError,
  IllegalStateError,
  MissingFieldError,
};
