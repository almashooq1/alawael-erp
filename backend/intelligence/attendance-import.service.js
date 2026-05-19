'use strict';

/**
 * attendance-import.service.js — Wave 126.
 *
 * Bulk attendance import from external systems. T2 baseline trust
 * (HMAC verified at the gateway).
 *
 * Flow:
 *   1. Lookup source by sourceId → verify active + branchScope
 *   2. Compute payloadHash over canonical-form rows
 *   3. Verify HMAC signature: expected = HMAC(secret, payloadHash)
 *      vs sig from request, timing-safe compare
 *   4. Idempotency: if (sourceId, payloadHash) batch already exists,
 *      return existing batch
 *   5. Resolve employeeIds per row (objectId or externalKey lookup)
 *   6. Validate + dedup each row (eventTime within MAX_PAST_DRIFT_MS
 *      window, no exact same employee+time already persisted)
 *   7. Bulk persist accepted rows with batchRefId stamp
 *   8. Persist AttendanceImportBatch with counts + sample rejections
 *
 * Public API:
 *   computePayloadHash(rows) — pure (sha256 of canonical JSON)
 *   signPayload(secret, payloadHash) — HMAC-SHA256 hex
 *   submitImportBatch({ sourceId, hmacSig, rows, ip? })
 */

const crypto = require('crypto');
const reg = require('./attendance.registry');

function _canonicalize(rows) {
  if (!Array.isArray(rows)) return '[]';
  // Sort keys per row for determinism.
  const arr = rows.map(r => {
    if (!r || typeof r !== 'object') return r;
    const keys = Object.keys(r).sort();
    const out = {};
    for (const k of keys) {
      const v = r[k];
      out[k] = v instanceof Date ? v.toISOString() : v;
    }
    return out;
  });
  return JSON.stringify(arr);
}

function computePayloadHash(rows) {
  const c = _canonicalize(rows);
  return crypto.createHash('sha256').update(c).digest('hex');
}

function signPayload(secret, payloadHash) {
  return crypto.createHmac('sha256', String(secret)).update(String(payloadHash)).digest('hex');
}

function _timingSafeEqHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch (_e) {
    return false;
  }
}

function hashSecret(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function createAttendanceImportService({
  sourceEventModel = null,
  importSourceModel = null,
  importBatchModel = null,
  employeeModel = null, // optional; required for externalKey mode
  logger = console,
  now = () => new Date(),
  sourceSecretResolver = null, // ({ sourceId }) → Promise<string> cleartext secret
} = {}) {
  if (!sourceEventModel) {
    throw new Error('attendance-import: sourceEventModel required');
  }
  if (!importSourceModel) {
    throw new Error('attendance-import: importSourceModel required');
  }
  if (!importBatchModel) {
    throw new Error('attendance-import: importBatchModel required');
  }
  if (typeof sourceSecretResolver !== 'function') {
    throw new Error('attendance-import: sourceSecretResolver required');
  }

  async function _findSource(sourceId) {
    try {
      const cursor = importSourceModel.findOne({ sourceId, active: true });
      return typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[attendance-import] source lookup failed: ${err.message}`);
      return null;
    }
  }

  async function _findExistingBatch(sourceId, payloadHash) {
    try {
      const cursor = importBatchModel.findOne({ sourceId, payloadHash });
      return typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[attendance-import] batch lookup failed: ${err.message}`);
      return null;
    }
  }

  async function _resolveEmployeeId(source, rawId) {
    if (!rawId) return null;
    if (source.employeeIdMode === 'objectId') {
      return String(rawId);
    }
    if (source.employeeIdMode === 'externalKey') {
      if (!employeeModel) return null;
      try {
        const q = { [source.employeeIdField]: rawId };
        const cursor = employeeModel.findOne(q, { _id: 1 });
        const emp = typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
        return emp ? String(emp._id) : null;
      } catch (err) {
        logger.warn(`[attendance-import] employee lookup failed: ${err.message}`);
        return null;
      }
    }
    return null;
  }

  function _validateRow(row, source, rowIndex) {
    if (!row || typeof row !== 'object') {
      return { ok: false, reason: 'ROW_NOT_OBJECT' };
    }
    const { externalEmployeeId, eventTime, eventKind, branchId } = row;
    if (!externalEmployeeId && !row.employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REF_MISSING' };
    }
    if (!eventTime) return { ok: false, reason: 'EVENT_TIME_MISSING' };
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) return { ok: false, reason: 'EVENT_TIME_INVALID' };
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: 'EVENT_TIME_FUTURE' };
    }
    if (t.getTime() < now().getTime() - reg.DEFAULTS.MAX_PAST_DRIFT_MS) {
      return { ok: false, reason: 'EVENT_TIME_TOO_OLD' };
    }
    const kind = String(eventKind || '').toLowerCase();
    if (!Array.isArray(source.allowedKinds) || !source.allowedKinds.includes(kind)) {
      return { ok: false, reason: 'EVENT_KIND_NOT_ALLOWED' };
    }
    if (
      branchId &&
      Array.isArray(source.branchScope) &&
      source.branchScope.length > 0 &&
      !source.branchScope.map(String).includes(String(branchId))
    ) {
      return { ok: false, reason: 'BRANCH_OUT_OF_SCOPE' };
    }
    void rowIndex;
    return { ok: true, t, kind };
  }

  async function submitImportBatch({ sourceId, hmacSig, rows, ip = null } = {}) {
    if (!sourceId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { sourceId: 'required' },
      };
    }
    if (!hmacSig) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { hmacSig: 'required' },
      };
    }
    if (!Array.isArray(rows)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { rows: 'array required' },
      };
    }

    const source = await _findSource(sourceId);
    if (!source) {
      return { ok: false, reason: 'ATTENDANCE_IMPORT_SOURCE_UNKNOWN' };
    }
    if (rows.length === 0) {
      return { ok: false, reason: 'ATTENDANCE_IMPORT_EMPTY_BATCH' };
    }
    if (source.maxRowsPerBatch && rows.length > source.maxRowsPerBatch) {
      return {
        ok: false,
        reason: 'ATTENDANCE_IMPORT_BATCH_TOO_LARGE',
        maxRowsPerBatch: source.maxRowsPerBatch,
      };
    }

    // HMAC verification.
    let secret;
    try {
      secret = await sourceSecretResolver({ sourceId });
    } catch (err) {
      logger.warn(`[attendance-import] secret resolver threw: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!secret) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };

    // Defense in depth: also confirm the cleartext secret matches
    // the stored hash, in case the resolver was misconfigured.
    if (hashSecret(secret) !== source.secretHash) {
      return { ok: false, reason: 'ATTENDANCE_IMPORT_SOURCE_AUTH_MISCONFIGURED' };
    }

    const payloadHash = computePayloadHash(rows);
    const expectedSig = signPayload(secret, payloadHash);
    if (!_timingSafeEqHex(expectedSig, String(hmacSig))) {
      return { ok: false, reason: 'ATTENDANCE_IMPORT_SIGNATURE_INVALID' };
    }

    // Idempotency: existing batch?
    const existing = await _findExistingBatch(sourceId, payloadHash);
    if (existing) {
      return {
        ok: true,
        idempotent: true,
        batch: existing,
      };
    }

    // Process rows.
    const acceptedRows = [];
    const rejections = [];
    let duplicateCount = 0;

    const batchRefId = `import-${sourceId}-${now().getTime()}`;

    for (let i = 0; i < rows.length; i++) {
      const v = _validateRow(rows[i], source, i);
      if (!v.ok) {
        rejections.push({ rowIndex: i, reason: v.reason, payload: rows[i] });
        continue;
      }
      const empRaw = rows[i].externalEmployeeId || rows[i].employeeId;
      const empId = await _resolveEmployeeId(source, empRaw);
      if (!empId) {
        rejections.push({ rowIndex: i, reason: 'EMPLOYEE_NOT_FOUND', payload: rows[i] });
        continue;
      }

      // Dedup against existing source-events: same employee, same
      // source=api-import, same eventTime (exact).
      let dupCursor = sourceEventModel.find({
        employeeId: empId,
        source: reg.SOURCE_KIND.API_IMPORT,
        eventTime: v.t,
      });
      if (typeof dupCursor.lean === 'function') dupCursor = dupCursor.lean();
      let dupRows = [];
      try {
        dupRows = (await dupCursor) || [];
      } catch (err) {
        logger.warn(`[attendance-import] dup lookup failed: ${err.message}`);
      }
      if (dupRows.length > 0) {
        duplicateCount += 1;
        continue;
      }

      acceptedRows.push({ row: rows[i], empId, t: v.t, kind: v.kind, rowIndex: i });
    }

    // Bulk persist accepted rows.
    let persistedCount = 0;
    for (const a of acceptedRows) {
      const flags = [];
      const effectiveConfidence = reg.inferEffectiveConfidence({
        source: reg.SOURCE_KIND.API_IMPORT,
        baseConfidence: 100,
        flags,
      });
      const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.API_IMPORT, effectiveConfidence, {
        flags,
      });
      const doc = new sourceEventModel({
        employeeId: a.empId,
        branchId: a.row.branchId || null,
        eventTime: a.t,
        eventKind: a.kind,
        source: reg.SOURCE_KIND.API_IMPORT,
        sourceRefId: `${batchRefId}-r${a.rowIndex}`,
        sourceRefCollection: 'attendance_import_batches',
        trustTier: reg.trustTierToNumeric(tierLabel),
        tierLabel,
        confidence: effectiveConfidence,
        accepted: true,
        flags,
        sourceRef: {
          batchRefId,
          sourceId,
          rowIndex: a.rowIndex,
          externalEmployeeId: a.row.externalEmployeeId || null,
          externalRecordId: a.row.externalRecordId || null,
        },
      });
      try {
        await doc.validate();
      } catch (err) {
        rejections.push({
          rowIndex: a.rowIndex,
          reason: 'VALIDATION_FAILED',
          payload: a.row,
          detail: err && err.message,
        });
        continue;
      }
      try {
        await doc.save();
        persistedCount += 1;
      } catch (err) {
        rejections.push({
          rowIndex: a.rowIndex,
          reason: 'SAVE_FAILED',
          payload: a.row,
          detail: err && err.message,
        });
      }
    }

    // Persist the batch record.
    const totalRows = rows.length;
    const rejectedRows = rejections.length;
    let status = 'accepted';
    if (rejectedRows === totalRows) status = 'rejected';
    else if (rejectedRows > 0 || duplicateCount > 0) status = 'partially-accepted';

    const batchDoc = new importBatchModel({
      sourceId,
      payloadHash,
      submittedAt: now(),
      submitterIp: ip || null,
      totalRows,
      acceptedRows: persistedCount,
      rejectedRows,
      duplicateRows: duplicateCount,
      status,
      rejectionSamples: rejections.slice(0, 50),
      eventBatchRefId: batchRefId,
    });
    try {
      await batchDoc.validate();
    } catch (err) {
      logger.warn('[attendance-import] batch validate failed:', err.message);
    }
    try {
      await batchDoc.save();
    } catch (err) {
      logger.error('[attendance-import] batch save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Best-effort source.lastImportAt touch.
    if (typeof importSourceModel.updateOne === 'function') {
      try {
        await importSourceModel.updateOne(
          { _id: source._id },
          { $set: { lastImportAt: now(), lastImportRows: persistedCount } }
        );
      } catch (err) {
        logger.warn(`[attendance-import] source lastImportAt failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      batch: batchDoc.toObject ? batchDoc.toObject() : batchDoc,
      totalRows,
      acceptedRows: persistedCount,
      rejectedRows,
      duplicateRows: duplicateCount,
      status,
      batchRefId,
    };
  }

  return {
    submitImportBatch,
    computePayloadHash,
    signPayload,
    hashSecret,
  };
}

module.exports = {
  createAttendanceImportService,
  computePayloadHash,
  signPayload,
  hashSecret,
};
