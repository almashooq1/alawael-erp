'use strict';

/**
 * attendance-privacy.service.js — Wave 133.
 *
 * PDPL/GDPR-style data subject rights + retention enforcement for the
 * attendance platform.
 *
 * Public API:
 *   exportEmployeeData({ employeeId })
 *     — Right of access: collects every attendance row tied to the
 *       employee across all attendance collections + redacts cross-
 *       employee PII (e.g. witnessId on correction requests).
 *
 *   eraseEmployee({ employeeId, reason, actorId, actorRole })
 *     — Right of erasure: applies action-per-collection
 *       (hard-delete vs redact) per retention policy; refuses if
 *       any row is under legal hold or in a locked payroll period.
 *
 *   applyRetention({ collection, dryRun? })
 *     — Sweeper: iterates rows older than retentionDays and applies
 *       the configured action. Idempotent.
 *
 *   redactPiiInDoc(doc, piiFields)  — pure helper
 *
 * The service NEVER touches collections it doesn't have a model
 * for — pass only the models you want it to manage. Other system
 * data (employee profile, payroll) is out of scope; OWNERSHIP of
 * cross-system erasure belongs to a parent privacy service.
 */

function _getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function _setByPath(obj, path, value) {
  if (!obj || !path) return;
  const parts = path.split('.');
  // Per-key guards at each access are the barrier CodeQL credits (js/prototype-pollution-utility).
  const isUnsafeKey = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (isUnsafeKey(key)) return;
    if (cur[key] == null) cur[key] = {};
    cur = cur[key];
  }
  const lastKey = parts[parts.length - 1];
  if (isUnsafeKey(lastKey)) return;
  cur[lastKey] = value;
}

function redactPiiInDoc(doc, piiFields = []) {
  if (!doc || !Array.isArray(piiFields)) return doc;
  const out = JSON.parse(JSON.stringify(doc));
  for (const f of piiFields) {
    if (_getByPath(out, f) !== undefined) {
      _setByPath(out, f, null);
    }
  }
  out.__piiRedacted = true;
  out.__piiRedactedAt = new Date().toISOString();
  return out;
}

function createAttendancePrivacyService({
  models = {}, // { sourceEvent, dailyRecord, exception, correctionRequest, baseline, outbox, importBatch }
  retentionPolicyModel = null,
  legalHoldChecker = null, // optional ({collection, doc}) → Promise<bool>
  lockGuard: _lockGuard = null, // optional ({branchId, shiftDate}) → Promise<bool>
  logger = console,
  now = () => new Date(),
} = {}) {
  // ─── exportEmployeeData ─────────────────────────────────────

  async function exportEmployeeData({ employeeId } = {}) {
    if (!employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    }
    const out = { employeeId, exportedAt: now() };
    const sections = [
      { key: 'sourceEvents', model: models.sourceEvent, filter: { employeeId } },
      { key: 'dailyRecords', model: models.dailyRecord, filter: { employeeId } },
      { key: 'exceptions', model: models.exception, filter: { employeeId } },
      {
        key: 'correctionRequests',
        model: models.correctionRequest,
        filter: { requesterId: employeeId },
      },
      { key: 'baseline', model: models.baseline, filter: { employeeId } },
    ];
    for (const s of sections) {
      if (!s.model) {
        out[s.key] = null;
        continue;
      }
      try {
        let cursor = s.model.find(s.filter);
        if (typeof cursor.lean === 'function') cursor = cursor.lean();
        const rows = (await cursor) || [];
        // Redact cross-employee PII fields (e.g. witnessId in corrections).
        out[s.key] = rows.map(r => {
          const copy = JSON.parse(JSON.stringify(r));
          if (copy.evidence && copy.evidence.witnessId) {
            copy.evidence.witnessId = '<redacted-other-employee>';
          }
          return copy;
        });
      } catch (err) {
        logger.warn(`[privacy] export ${s.key} failed: ${err.message}`);
        out[s.key] = { error: err.message };
      }
    }
    return { ok: true, export: out };
  }

  // ─── eraseEmployee ──────────────────────────────────────────

  async function eraseEmployee({ employeeId, reason, actorId, actorRole = null } = {}) {
    if (!employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    }
    if (!actorId) {
      return { ok: false, reason: 'ACTOR_REQUIRED' };
    }
    if (!reason || String(reason).trim().length < 5) {
      return { ok: false, reason: 'REASON_TOO_SHORT' };
    }

    // Legal hold check (across all collections).
    if (legalHoldChecker) {
      try {
        const held = await legalHoldChecker({ employeeId });
        if (held) {
          return { ok: false, reason: 'ATTENDANCE_LEGAL_HOLD_ACTIVE' };
        }
      } catch (err) {
        logger.warn(`[privacy] legalHold check threw: ${err.message}`);
        return { ok: false, reason: 'LEGAL_HOLD_CHECK_FAILED' };
      }
    }

    // Locked-payroll check: refuse if any DailyAttendanceRecord
    // for this employee is status=locked (Wave 99 payroll-lock).
    if (models.dailyRecord) {
      try {
        let cursor = models.dailyRecord.find({ employeeId, status: 'locked' });
        if (typeof cursor.lean === 'function') cursor = cursor.lean();
        const lockedRows = (await cursor) || [];
        if (lockedRows.length > 0) {
          return {
            ok: false,
            reason: 'ATTENDANCE_PAYROLL_LOCKED_ROWS_EXIST',
            lockedCount: lockedRows.length,
          };
        }
      } catch (err) {
        logger.warn(`[privacy] payroll lock check failed: ${err.message}`);
      }
    }

    const policies = await _loadPolicies();
    const policiesByColl = new Map();
    for (const p of policies) policiesByColl.set(p.collection, p);

    const report = {};
    const erasure = [
      {
        coll: 'attendance_source_events',
        model: models.sourceEvent,
        filter: { employeeId },
      },
      {
        coll: 'attendance_exceptions',
        model: models.exception,
        filter: { employeeId },
      },
      {
        coll: 'attendance_correction_requests',
        model: models.correctionRequest,
        filter: { requesterId: employeeId },
      },
      {
        coll: 'employee_attendance_baselines',
        model: models.baseline,
        filter: { employeeId },
      },
      // dailyRecords are NOT erased — they're aggregate financial
      // records. Only PII redacted.
      {
        coll: 'daily_attendance_records',
        model: models.dailyRecord,
        filter: { employeeId },
        forceRedact: true,
      },
    ];

    for (const sec of erasure) {
      if (!sec.model) {
        report[sec.coll] = { skipped: 'NO_MODEL' };
        continue;
      }
      const policy = policiesByColl.get(sec.coll);
      const action = sec.forceRedact ? 'redact-pii' : policy ? policy.action : 'hard-delete';

      const piiFields =
        (policy && Array.isArray(policy.piiFields) && policy.piiFields) || _defaultPiiFor(sec.coll);

      const r = await _applyActionToFilter({
        model: sec.model,
        filter: sec.filter,
        action,
        piiFields,
      });
      report[sec.coll] = r;
    }

    return {
      ok: true,
      employeeId,
      erasedAt: now(),
      actor: { id: actorId, role: actorRole },
      reason: String(reason).trim(),
      report,
    };
  }

  // ─── applyRetention ─────────────────────────────────────────

  async function applyRetention({ collection: coll, dryRun = false } = {}) {
    if (!coll) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: { collection: 'required' },
      };
    }
    const policy = await _findPolicy(coll);
    if (!policy) return { ok: false, reason: 'NO_POLICY' };
    if (!policy.enabled) return { ok: true, skipped: 'POLICY_DISABLED' };

    const model = _modelForCollection(coll);
    if (!model) return { ok: false, reason: 'NO_MODEL' };

    const cutoff = new Date(now().getTime() - policy.retentionDays * 24 * 60 * 60_000);

    // Pick a time field per collection.
    const timeField = _timeFieldFor(coll);
    const filter = { [timeField]: { $lt: cutoff } };

    if (policy.legalHoldFilter) {
      filter.$nor = [policy.legalHoldFilter];
    }

    if (dryRun) {
      let cursor = model.find(filter);
      if (typeof cursor.lean === 'function') cursor = cursor.lean();
      const rows = (await cursor) || [];
      return {
        ok: true,
        dryRun: true,
        collection: coll,
        cutoff,
        action: policy.action,
        wouldAffect: rows.length,
      };
    }

    const r = await _applyActionToFilter({
      model,
      filter,
      action: policy.action,
      piiFields: policy.piiFields || _defaultPiiFor(coll),
    });
    return { ok: true, collection: coll, cutoff, ...r };
  }

  // ─── Internal helpers ──────────────────────────────────────

  function _modelForCollection(coll) {
    switch (coll) {
      case 'attendance_source_events':
        return models.sourceEvent;
      case 'daily_attendance_records':
        return models.dailyRecord;
      case 'attendance_exceptions':
        return models.exception;
      case 'attendance_correction_requests':
        return models.correctionRequest;
      case 'employee_attendance_baselines':
        return models.baseline;
      case 'attendance_event_outbox':
        return models.outbox;
      case 'attendance_import_batches':
        return models.importBatch;
      default:
        return null;
    }
  }

  function _timeFieldFor(coll) {
    switch (coll) {
      case 'attendance_source_events':
        return 'eventTime';
      case 'daily_attendance_records':
        return 'shiftDate';
      case 'attendance_exceptions':
        return 'detectedAt';
      case 'attendance_correction_requests':
        return 'submittedAt';
      case 'employee_attendance_baselines':
        return 'lastRefreshedAt';
      case 'attendance_event_outbox':
        return 'createdAt';
      case 'attendance_import_batches':
        return 'submittedAt';
      default:
        return 'createdAt';
    }
  }

  function _defaultPiiFor(coll) {
    switch (coll) {
      case 'attendance_source_events':
        return [
          'geo.lat',
          'geo.lng',
          'geo.accuracyM',
          'sourceRef.cardUid',
          'sourceRef.deviceId',
          'sourceRef.ip',
        ];
      case 'daily_attendance_records':
        return ['checkIn.flags', 'checkOut.flags'];
      case 'attendance_correction_requests':
        return ['evidence.photoRef', 'evidence.witnessId', 'evidence.notes'];
      case 'attendance_exceptions':
        return ['details', 'evidenceEventIds'];
      default:
        return [];
    }
  }

  async function _loadPolicies() {
    if (!retentionPolicyModel) return [];
    try {
      let cursor = retentionPolicyModel.find({ enabled: true });
      if (typeof cursor.lean === 'function') cursor = cursor.lean();
      return (await cursor) || [];
    } catch (err) {
      logger.warn(`[privacy] policies load failed: ${err.message}`);
      return [];
    }
  }

  async function _findPolicy(coll) {
    if (!retentionPolicyModel) return null;
    try {
      const cursor = retentionPolicyModel.findOne({ collection: coll, enabled: true });
      return typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[privacy] policy lookup failed: ${err.message}`);
      return null;
    }
  }

  async function _applyActionToFilter({ model, filter, action, piiFields }) {
    if (action === 'noop') {
      return { action, affected: 0 };
    }
    let rows = [];
    try {
      let cursor = model.find(filter);
      if (typeof cursor.lean === 'function') cursor = cursor.lean();
      rows = (await cursor) || [];
    } catch (err) {
      logger.warn(`[privacy] action load failed: ${err.message}`);
      return { action, error: err.message, affected: 0 };
    }
    if (rows.length === 0) return { action, affected: 0 };

    if (action === 'hard-delete') {
      if (typeof model.deleteMany === 'function') {
        try {
          const r = await model.deleteMany(filter);
          return { action, affected: r.deletedCount || rows.length };
        } catch (err) {
          logger.error(`[privacy] deleteMany failed: ${err.message}`);
          return { action, error: err.message, affected: 0 };
        }
      }
      return { action, error: 'NO_DELETE_MANY', affected: 0 };
    }
    if (action === 'redact-pii') {
      let n = 0;
      for (const r of rows) {
        const update = { $set: {} };
        for (const f of piiFields) {
          if (_getByPath(r, f) !== undefined) {
            update.$set[f] = null;
          }
        }
        update.$set.__piiRedacted = true;
        update.$set.__piiRedactedAt = now();
        if (typeof model.updateOne === 'function') {
          try {
            await model.updateOne({ _id: r._id }, update);
            n += 1;
          } catch (err) {
            logger.warn(`[privacy] updateOne failed: ${err.message}`);
          }
        }
      }
      return { action, affected: n };
    }
    if (action === 'archive') {
      // Archive adapter is out of scope here — caller should wire one
      // via models.archive.
      return { action, affected: 0, skipped: 'ARCHIVE_NOT_IMPLEMENTED' };
    }
    return { action, affected: 0 };
  }

  return {
    exportEmployeeData,
    eraseEmployee,
    applyRetention,
    redactPiiInDoc,
  };
}

module.exports = {
  createAttendancePrivacyService,
  redactPiiInDoc,
};
