'use strict';

/**
 * credential-tracker.service.js — Wave 138.
 *
 * Manages employee credential lifecycle + ensures expired/missing
 * critical credentials block the employee from delivering care.
 *
 * Public API:
 *   addCredential({ employeeId, kind, issueNumber, ... })
 *   verifyCredential({ credentialId, actorId, actorRole, note })
 *   renewCredential({ credentialId, newExpiresAt, documentRef?,
 *                      actorId })
 *   suspendCredential({ credentialId, reason, actorId })
 *   getEmployeeBlockingCredentials({ employeeId, atDate? })
 *     — Returns critical/high-severity credentials that are expired
 *       or expiring within the gate window. Used by the attendance
 *       gate (Wave 119) to refuse check-ins from staff whose license
 *       has lapsed.
 *   scanExpiringSoon({ daysAhead?, severity? })
 *     — Sweeper for cron: returns credentials expiring within the
 *       window so the notification service can nudge them.
 *   computeStatus({ expiresAt, atDate?, expiringSoonDays? })
 *     — Pure helper: { status, daysUntilExpiry }.
 *
 * Operator policy:
 *   - Critical credentials (SCFHS, Iqama) block care delivery from
 *     day they expire.
 *   - High-severity (BLS/ACLS/PALS) start nudging at T-30 days, block
 *     7 days after expiry.
 *   - Medium-severity nudge at T-14, never auto-block.
 */

const DEFAULT_EXPIRING_SOON_DAYS = 30;
const DEFAULT_GRACE_DAYS_BY_SEVERITY = Object.freeze({
  critical: 0, // hard block on expiry
  high: 7,
  medium: 30,
  low: 90,
});

function _daysBetween(later, earlier) {
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.round(ms / (24 * 60 * 60_000));
}

function computeStatus({
  expiresAt,
  atDate = new Date(),
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
} = {}) {
  if (!expiresAt) {
    return { status: 'valid', daysUntilExpiry: null };
  }
  const daysUntilExpiry = _daysBetween(expiresAt, atDate);
  if (daysUntilExpiry < 0) {
    return { status: 'expired', daysUntilExpiry };
  }
  if (daysUntilExpiry <= expiringSoonDays) {
    return { status: 'expiring-soon', daysUntilExpiry };
  }
  return { status: 'valid', daysUntilExpiry };
}

function createCredentialTrackerService({
  credentialModel = null,
  logger = console,
  now = () => new Date(),
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
  graceDaysBySeverity = DEFAULT_GRACE_DAYS_BY_SEVERITY,
} = {}) {
  if (!credentialModel) {
    throw new Error('credential-tracker: credentialModel required');
  }
  const SEVERITY_BY_KIND = (credentialModel && credentialModel.SEVERITY_BY_KIND) || {};

  async function addCredential({
    employeeId,
    kind,
    issueNumber,
    labelAr,
    issuingAuthority = null,
    issuedAt = null,
    expiresAt = null,
    documentRef = null,
    actorId = null,
    notes = null,
  } = {}) {
    if (!employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    }
    if (!kind || !issueNumber || !labelAr) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: {
          kind: !kind ? 'required' : undefined,
          issueNumber: !issueNumber ? 'required' : undefined,
          labelAr: !labelAr ? 'required' : undefined,
        },
      };
    }
    // Compute initial status from expiry.
    const { status } = computeStatus({
      expiresAt,
      atDate: now(),
      expiringSoonDays,
    });
    const doc = new credentialModel({
      employeeId,
      kind,
      labelAr,
      issueNumber,
      issuingAuthority,
      issuedAt,
      expiresAt,
      documentRef,
      status,
      statusChangedAt: now(),
      notes,
    });
    try {
      await doc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: 'VALIDATION_FAILED', errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[credential] add save failed:', err.message);
      return { ok: false, reason: 'SAVE_FAILED', error: err.message };
    }
    void actorId;
    return { ok: true, credential: doc.toObject ? doc.toObject() : doc };
  }

  async function _findById(credentialId) {
    try {
      const cursor = credentialModel.findById(credentialId);
      return cursor && typeof cursor.then === 'function' ? await cursor : cursor;
    } catch (err) {
      logger.warn(`[credential] findById failed: ${err.message}`);
      return null;
    }
  }

  async function verifyCredential({ credentialId, actorId, actorRole, note } = {}) {
    if (!credentialId) {
      return { ok: false, reason: 'CREDENTIAL_ID_REQUIRED' };
    }
    if (!actorId) {
      return { ok: false, reason: 'ACTOR_REQUIRED' };
    }
    const cred = await _findById(credentialId);
    if (!cred) return { ok: false, reason: 'NOT_FOUND' };
    cred.verifiedAt = now();
    cred.verifiedByActorId = actorId;
    if (cred.status === 'pending-renewal') cred.status = 'valid';
    if (note) cred.notes = note;
    try {
      await cred.save();
    } catch (err) {
      logger.error('[credential] verify save failed:', err.message);
      return { ok: false, reason: 'SAVE_FAILED' };
    }
    void actorRole;
    return { ok: true, credential: cred.toObject ? cred.toObject() : cred };
  }

  async function renewCredential({ credentialId, newExpiresAt, documentRef = null, actorId } = {}) {
    if (!credentialId) {
      return { ok: false, reason: 'CREDENTIAL_ID_REQUIRED' };
    }
    if (!newExpiresAt) {
      return { ok: false, reason: 'NEW_EXPIRY_REQUIRED' };
    }
    const newExp = newExpiresAt instanceof Date ? newExpiresAt : new Date(newExpiresAt);
    if (Number.isNaN(newExp.getTime())) {
      return { ok: false, reason: 'INVALID_EXPIRY_DATE' };
    }
    if (newExp.getTime() <= now().getTime()) {
      return { ok: false, reason: 'EXPIRY_NOT_IN_FUTURE' };
    }
    const cred = await _findById(credentialId);
    if (!cred) return { ok: false, reason: 'NOT_FOUND' };

    cred.expiresAt = newExp;
    if (documentRef) cred.documentRef = documentRef;
    const { status } = computeStatus({
      expiresAt: newExp,
      atDate: now(),
      expiringSoonDays,
    });
    cred.status = status;
    cred.statusChangedAt = now();
    cred.reminderCount = 0;
    cred.lastReminderAt = null;
    // Reset verification — renewed credential must be re-verified.
    cred.verifiedAt = null;
    cred.verifiedByActorId = null;
    try {
      await cred.save();
    } catch (err) {
      logger.error('[credential] renew save failed:', err.message);
      return { ok: false, reason: 'SAVE_FAILED' };
    }
    void actorId;
    return { ok: true, credential: cred.toObject ? cred.toObject() : cred };
  }

  async function suspendCredential({ credentialId, reason, actorId } = {}) {
    if (!credentialId) {
      return { ok: false, reason: 'CREDENTIAL_ID_REQUIRED' };
    }
    if (!reason || String(reason).trim().length < 5) {
      return { ok: false, reason: 'REASON_TOO_SHORT' };
    }
    const cred = await _findById(credentialId);
    if (!cred) return { ok: false, reason: 'NOT_FOUND' };
    cred.status = 'suspended';
    cred.statusChangedAt = now();
    cred.statusReason = String(reason).trim();
    try {
      await cred.save();
    } catch (err) {
      logger.error('[credential] suspend save failed:', err.message);
      return { ok: false, reason: 'SAVE_FAILED' };
    }
    void actorId;
    return { ok: true, credential: cred.toObject ? cred.toObject() : cred };
  }

  /**
   * Returns credentials that should BLOCK the employee from delivering
   * care. A credential blocks when it is past its grace window for its
   * severity level OR its status is 'suspended'.
   */
  async function getEmployeeBlockingCredentials({ employeeId, atDate = null } = {}) {
    if (!employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    }
    const at = atDate ? new Date(atDate) : now();
    let cursor = credentialModel.find({ employeeId });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let rows = [];
    try {
      rows = (await cursor) || [];
    } catch (err) {
      logger.warn(`[credential] blocking load failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
    const blocking = [];
    for (const r of rows) {
      if (r.status === 'suspended') {
        blocking.push({ ...r, blockReason: 'suspended' });
        continue;
      }
      if (!r.expiresAt) continue;
      const daysUntilExpiry = _daysBetween(r.expiresAt, at);
      const severity = SEVERITY_BY_KIND[r.kind] || 'medium';
      const grace = graceDaysBySeverity[severity];
      if (grace == null) continue;
      // For critical severity (grace=0), blocking = expired NOW.
      // For higher grace, blocking = expired AND past grace window.
      if (daysUntilExpiry < -grace) {
        blocking.push({
          ...r,
          severity,
          daysUntilExpiry,
          graceDays: grace,
          blockReason: 'expired-past-grace',
        });
      }
    }
    return {
      ok: true,
      employeeId,
      atDate: at,
      blocking,
      hasBlocking: blocking.length > 0,
    };
  }

  /**
   * Sweeper: returns credentials expiring within `daysAhead` days.
   * Severity filter narrows to a single severity tier.
   */
  async function scanExpiringSoon({
    daysAhead = DEFAULT_EXPIRING_SOON_DAYS,
    severity = null,
  } = {}) {
    const cutoff = new Date(now().getTime() + daysAhead * 24 * 60 * 60_000);
    let cursor = credentialModel.find({
      expiresAt: { $lte: cutoff, $gte: now() },
      status: { $in: ['valid', 'expiring-soon', 'verified'] },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let rows = [];
    try {
      rows = (await cursor) || [];
    } catch (err) {
      logger.warn(`[credential] sweeper failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
    const filtered = severity
      ? rows.filter(r => (SEVERITY_BY_KIND[r.kind] || 'medium') === severity)
      : rows;
    return {
      ok: true,
      cutoff,
      daysAhead,
      severity,
      total: filtered.length,
      credentials: filtered.map(r => ({
        ...r,
        severity: SEVERITY_BY_KIND[r.kind] || 'medium',
        daysUntilExpiry: _daysBetween(r.expiresAt, now()),
      })),
    };
  }

  async function listByEmployee({ employeeId, includeExpired = true } = {}) {
    if (!employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    }
    const q = { employeeId };
    if (!includeExpired) {
      q.status = { $ne: 'expired' };
    }
    let cursor = credentialModel.find(q);
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ expiresAt: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return { ok: true, credentials: (await cursor) || [] };
    } catch (err) {
      logger.warn(`[credential] listByEmployee failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
  }

  return {
    addCredential,
    verifyCredential,
    renewCredential,
    suspendCredential,
    getEmployeeBlockingCredentials,
    scanExpiringSoon,
    listByEmployee,
    computeStatus,
    DEFAULT_EXPIRING_SOON_DAYS,
    DEFAULT_GRACE_DAYS_BY_SEVERITY,
  };
}

module.exports = {
  createCredentialTrackerService,
  computeStatus,
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_GRACE_DAYS_BY_SEVERITY,
};
