'use strict';

/**
 * capa-producers.service.js — W346 (CAPA Pass 5).
 *
 * Producer functions that translate upstream quality findings into CapaItem
 * creation requests. Each producer takes a parent doc + a sub-doc identifier,
 * extracts the relevant context (title, owner, due date, priority), and
 * delegates to capaService.createCapaItem.
 *
 * No model mutation here — callers must update the linkedCapaId on the parent
 * sub-doc themselves after the producer returns. This keeps the producers
 * pure-transformation (input → CapaItem) and side-effect-free.
 *
 * Public surface (3 functions):
 *   createCapaFromAuditFinding({ occurrenceDoc, findingId, ownerUserId, dueDate, createdBy })
 *     — converts AuditOccurrence.findings[<findingId>] into a CapaItem.
 *       Priority derived from finding.type (major_nc → high, minor_nc → medium,
 *       observation/opportunity → low). Source: { module:'audit', refId: occurrenceDoc._id }.
 *
 *   createCapaFromRcaRootCause({ rcaDoc, rootCauseId, ownerUserId, dueDate, createdBy })
 *     — converts RcaInvestigation.rootCauses[<rootCauseId>] into a CapaItem.
 *       Priority derived from rootCause.severity (1-2 → low, 3-4 → medium, 5-6 → high
 *       critical when severity≥6 AND parent rca.severity≥6). Source: { module:'rca', refId: rcaDoc._id }.
 *
 *   createCapaFromFmeaAction({ fmeaDoc, rowId, actionId, ownerUserId, dueDate, createdBy })
 *     — converts FmeaWorksheet.rows[<rowId>].actions[<actionId>] into a CapaItem.
 *       Priority derived from row.actionPriority (high|medium|low). Source: { module:'fmea', refId: fmeaDoc._id }.
 *
 * All producers return the persisted CapaItem document. Callers are responsible
 * for setting linkedCapaId on the source sub-doc and saving the parent.
 *
 * Errors thrown carry .code: SOURCE_NOT_FOUND, MISSING_SUB_DOC, INVALID_INPUT.
 * createCapaItem errors propagate transparently with their lib codes.
 */

const lib = require('../../intelligence/capa-lifecycle.lib');

const DEFAULT_DUE_DAYS = 30;

function _defaultDueDate(days = DEFAULT_DUE_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// Audit finding.type → CAPA priority
function _priorityForAuditFindingType(type) {
  if (type === 'major_nc') return 'high';
  if (type === 'minor_nc') return 'medium';
  return 'low'; // observation, opportunity, commendation
}

// RCA rootCause.severity (1-6) → CAPA priority
function _priorityForRcaSeverity(rootSeverity, rcaSeverity) {
  if (rootSeverity >= 6 && rcaSeverity >= 6) return 'critical';
  if (rootSeverity >= 5) return 'high';
  if (rootSeverity >= 3) return 'medium';
  return 'low';
}

// FMEA row.actionPriority (high|medium|low|null) → CAPA priority
function _priorityForFmeaActionPriority(actionPriority) {
  if (actionPriority === 'high') return 'high';
  if (actionPriority === 'medium') return 'medium';
  if (actionPriority === 'low') return 'low';
  return 'medium'; // null fallback
}

function _subdocById(parentArray, subId) {
  if (!Array.isArray(parentArray)) return null;
  return parentArray.find(sd => String(sd._id) === String(subId)) || null;
}

function createCapaProducers({ capaService } = {}) {
  if (!capaService || typeof capaService.createCapaItem !== 'function') {
    throw new Error('createCapaProducers: capaService.createCapaItem required');
  }

  async function createCapaFromAuditFinding(input) {
    const {
      occurrenceDoc,
      findingId,
      ownerUserId,
      dueDate = _defaultDueDate(),
      createdBy,
    } = input || {};
    if (!occurrenceDoc) {
      const err = new Error('createCapaFromAuditFinding: occurrenceDoc required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!findingId) {
      const err = new Error('createCapaFromAuditFinding: findingId required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!createdBy) {
      const err = new Error('createCapaFromAuditFinding: createdBy required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const finding = _subdocById(occurrenceDoc.findings, findingId);
    if (!finding) {
      const err = new Error(`Audit finding ${findingId} not found on occurrence`);
      err.code = 'MISSING_SUB_DOC';
      throw err;
    }
    const owner = ownerUserId || finding.ownerUserId;
    if (!owner) {
      const err = new Error(
        'createCapaFromAuditFinding: ownerUserId required (no finding.ownerUserId fallback available)'
      );
      err.code = 'INVALID_INPUT';
      throw err;
    }
    return capaService.createCapaItem({
      source: {
        module: 'audit',
        refId: occurrenceDoc._id,
        collection: 'audit_occurrences',
      },
      type: 'corrective',
      title: `Audit Finding ${finding.type || 'observation'}: ${occurrenceDoc.auditNumber || 'untitled'}`,
      description: finding.description || '(no description on finding)',
      priority: _priorityForAuditFindingType(finding.type),
      ownerUserId: owner,
      dueDate,
      branchId: occurrenceDoc.branchId || null,
      tenantId: occurrenceDoc.tenantId || null,
      rootCause: finding.clauseRef ? `Audit clause: ${finding.clauseRef}` : null,
      verificationCriteria: finding.evidence ? `Evidence on file: ${finding.evidence}` : null,
      createdBy,
    });
  }

  async function createCapaFromRcaRootCause(input) {
    const {
      rcaDoc,
      rootCauseId,
      ownerUserId,
      dueDate = _defaultDueDate(),
      createdBy,
    } = input || {};
    if (!rcaDoc) {
      const err = new Error('createCapaFromRcaRootCause: rcaDoc required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!rootCauseId) {
      const err = new Error('createCapaFromRcaRootCause: rootCauseId required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!createdBy) {
      const err = new Error('createCapaFromRcaRootCause: createdBy required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const root = _subdocById(rcaDoc.rootCauses, rootCauseId);
    if (!root) {
      const err = new Error(`Root cause ${rootCauseId} not found on RCA`);
      err.code = 'MISSING_SUB_DOC';
      throw err;
    }
    const owner = ownerUserId || rcaDoc.facilitatorUserId;
    if (!owner) {
      const err = new Error(
        'createCapaFromRcaRootCause: ownerUserId required (no rca.facilitatorUserId fallback)'
      );
      err.code = 'INVALID_INPUT';
      throw err;
    }
    return capaService.createCapaItem({
      source: {
        module: 'rca',
        refId: rcaDoc._id,
        collection: 'rca_investigations',
      },
      type: 'corrective',
      title: `RCA Root Cause: ${rcaDoc.rcaNumber || rcaDoc.title || 'untitled'}`,
      description: root.text,
      priority: _priorityForRcaSeverity(root.severity || 3, rcaDoc.severity || 3),
      ownerUserId: owner,
      dueDate,
      branchId: rcaDoc.branchId || null,
      tenantId: rcaDoc.tenantId || null,
      rootCause: `Identified via ${root.source}${root.category ? ` (${root.category})` : ''}`,
      createdBy,
    });
  }

  async function createCapaFromFmeaAction(input) {
    const { fmeaDoc, rowId, actionId, ownerUserId, dueDate, createdBy } = input || {};
    if (!fmeaDoc) {
      const err = new Error('createCapaFromFmeaAction: fmeaDoc required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!rowId || !actionId) {
      const err = new Error('createCapaFromFmeaAction: rowId + actionId required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!createdBy) {
      const err = new Error('createCapaFromFmeaAction: createdBy required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const row = _subdocById(fmeaDoc.rows, rowId);
    if (!row) {
      const err = new Error(`FMEA row ${rowId} not found`);
      err.code = 'MISSING_SUB_DOC';
      throw err;
    }
    const action = _subdocById(row.actions, actionId);
    if (!action) {
      const err = new Error(`FMEA action ${actionId} not found on row ${rowId}`);
      err.code = 'MISSING_SUB_DOC';
      throw err;
    }
    const owner = ownerUserId || action.ownerUserId;
    if (!owner) {
      const err = new Error(
        'createCapaFromFmeaAction: ownerUserId required (no action.ownerUserId fallback)'
      );
      err.code = 'INVALID_INPUT';
      throw err;
    }
    return capaService.createCapaItem({
      source: {
        module: 'fmea',
        refId: fmeaDoc._id,
        collection: 'fmea_worksheets',
      },
      // FMEA actions are usually preventive (act before failure occurs)
      // unless the failure has already manifested.
      type: 'preventive',
      title: `FMEA Action: ${fmeaDoc.fmeaNumber || 'untitled'} row ${row.rowNumber}`,
      description: action.description,
      priority: _priorityForFmeaActionPriority(row.actionPriority),
      ownerUserId: owner,
      dueDate: dueDate || action.dueDate || _defaultDueDate(),
      branchId: fmeaDoc.branchId || null,
      tenantId: fmeaDoc.tenantId || null,
      rootCause: `Failure mode: ${row.failureMode} | Effect: ${row.failureEffect}`,
      verificationCriteria: row.preventionControls?.length
        ? `Existing controls: ${row.preventionControls.join('; ')}`
        : null,
      createdBy,
    });
  }

  return {
    createCapaFromAuditFinding,
    createCapaFromRcaRootCause,
    createCapaFromFmeaAction,
    // expose for tests
    _internals: {
      _priorityForAuditFindingType,
      _priorityForRcaSeverity,
      _priorityForFmeaActionPriority,
      DEFAULT_DUE_DAYS,
    },
  };
}

module.exports = {
  createCapaProducers,
  // re-export lib constants for convenience
  CAPA_TYPES: lib.CAPA_TYPES,
  SOURCE_MODULES: lib.SOURCE_MODULES,
  PRIORITIES: lib.PRIORITIES,
};
