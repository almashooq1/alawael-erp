'use strict';

/**
 * nfc-attendance.service.js — Wave 125.
 *
 * NFC/RFID card management + reader-tap ingestion. Trust tier T2
 * baseline (hardware match = binary). Demoted to T3 on:
 *   - tailgate flag (camera saw 2 people, 1 tap)
 *   - device-wrong-branch (reader registered to branch B but card's
 *     employee belongs to branch A — possibly transferred but not
 *     re-registered)
 *
 * Public API:
 *   issueCard({ cardUid, employeeId, branchId?, label?, actorId? })
 *   suspendCard({ cardId, reason, actorId })
 *   reportLost({ cardId, reason, actorId })
 *   replaceCard({ oldCardId, newCardUid, actorId, label? })
 *   deactivateCard({ cardId, reason, actorId })
 *   submitNfcTap({ readerId, deviceSecret, cardUid, eventTime,
 *                   eventKind?, tailgateSuspected?, ip? })
 *
 * The "submitNfcTap" call does NOT require an employeeId — the
 * reader sends only the cardUid, and the service looks up the
 * active binding.
 */

const crypto = require('crypto');
const reg = require('./attendance.registry');

function hashSecret(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function createNfcAttendanceService({
  sourceEventModel = null,
  nfcCardModel = null,
  nfcReaderModel = null,
  shiftResolver = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!sourceEventModel) {
    throw new Error('nfc-attendance: sourceEventModel required');
  }
  if (!nfcCardModel) {
    throw new Error('nfc-attendance: nfcCardModel required');
  }
  if (!nfcReaderModel) {
    throw new Error('nfc-attendance: nfcReaderModel required');
  }

  // ─── Card management ─────────────────────────────────────────

  async function issueCard({
    cardUid,
    employeeId,
    branchId = null,
    label = null,
    actorId = null,
  } = {}) {
    if (!cardUid) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { cardUid: 'required' },
      };
    }
    if (!employeeId) {
      return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    }

    // Check uniqueness of active binding for this UID.
    const existing = await _findActiveCardByUid(cardUid);
    if (existing) {
      return {
        ok: false,
        reason: 'ATTENDANCE_NFC_CARD_ALREADY_ACTIVE',
        existingCardId: existing._id,
      };
    }

    const card = new nfcCardModel({
      cardUid,
      employeeId,
      branchId: branchId || null,
      label: label || null,
      status: 'active',
      issuedAt: now(),
      issuedByActorId: actorId || null,
    });
    try {
      await card.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
    }
    try {
      await card.save();
    } catch (err) {
      logger.error('[nfc-attendance] issueCard save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, card: card.toObject ? card.toObject() : card };
  }

  async function _setStatus(cardId, newStatus, reason, actorId) {
    if (!cardId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { cardId: 'required' },
      };
    }
    let card;
    try {
      card = await _findById(cardId);
    } catch (err) {
      logger.warn(`[nfc-attendance] _setStatus lookup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!card) return { ok: false, reason: 'ATTENDANCE_NFC_CARD_NOT_FOUND' };
    if (card.status === newStatus) {
      return { ok: true, card, idempotent: true };
    }
    // Terminal-state lock: a deactivated card cannot be revived.
    if (card.status === 'deactivated') {
      return { ok: false, reason: 'ATTENDANCE_NFC_CARD_TERMINAL' };
    }
    card.status = newStatus;
    card.statusChangedAt = now();
    card.statusReason = reason || null;
    void actorId;
    try {
      await card.save();
    } catch (err) {
      logger.error('[nfc-attendance] _setStatus save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, card: card.toObject ? card.toObject() : card };
  }

  function suspendCard({ cardId, reason, actorId } = {}) {
    return _setStatus(cardId, 'suspended', reason, actorId);
  }
  function reportLost({ cardId, reason, actorId } = {}) {
    return _setStatus(cardId, 'lost', reason, actorId);
  }
  function deactivateCard({ cardId, reason, actorId } = {}) {
    return _setStatus(cardId, 'deactivated', reason, actorId);
  }

  async function replaceCard({ oldCardId, newCardUid, actorId = null, label = null } = {}) {
    if (!oldCardId || !newCardUid) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { oldCardId: 'required', newCardUid: 'required' },
      };
    }
    const oldCard = await _findById(oldCardId);
    if (!oldCard) return { ok: false, reason: 'ATTENDANCE_NFC_CARD_NOT_FOUND' };
    if (oldCard.status === 'deactivated') {
      return { ok: false, reason: 'ATTENDANCE_NFC_CARD_TERMINAL' };
    }

    // Mark old as replaced FIRST so the new active-UID isn't unique-blocked.
    oldCard.status = 'replaced';
    oldCard.statusChangedAt = now();
    oldCard.statusReason = 'replaced';
    try {
      await oldCard.save();
    } catch (err) {
      logger.error('[nfc-attendance] replaceCard mark-old failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    const issueResult = await issueCard({
      cardUid: newCardUid,
      employeeId: oldCard.employeeId,
      branchId: oldCard.branchId,
      label,
      actorId,
    });
    if (!issueResult.ok) return issueResult;
    // Backfill supersededByCardId on the OLD record.
    oldCard.supersededByCardId = issueResult.card._id;
    try {
      await oldCard.save();
    } catch (err) {
      logger.warn(`[nfc-attendance] supersededByCardId backfill failed: ${err.message}`);
    }
    return { ok: true, oldCard, newCard: issueResult.card };
  }

  // ─── NFC tap ingestion ───────────────────────────────────────

  async function submitNfcTap({
    readerId,
    deviceSecret,
    cardUid,
    eventTime,
    eventKind = null, // may be 'check-in', 'check-out', 'passage' or null
    tailgateSuspected = false,
    ip = null,
  } = {}) {
    if (!readerId || !deviceSecret) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { readerId: 'required', deviceSecret: 'required' },
      };
    }
    if (!cardUid) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { cardUid: 'required' },
      };
    }
    if (!eventTime) return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
    }

    // Reader auth.
    let reader;
    try {
      const cursor = nfcReaderModel.findOne({ readerId, active: true });
      reader = typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[nfc-attendance] reader lookup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!reader) return { ok: false, reason: 'ATTENDANCE_NFC_READER_UNKNOWN' };

    const presentedHash = hashSecret(deviceSecret);
    if (presentedHash !== reader.secretHash) {
      return { ok: false, reason: 'ATTENDANCE_NFC_READER_AUTH_FAILED' };
    }

    // Resolve event kind from reader if not given.
    const allowedKinds = Array.isArray(reader.allowedKinds) ? reader.allowedKinds : [];
    let resolvedKind = eventKind;
    if (!resolvedKind) {
      if (allowedKinds.length === 1) {
        resolvedKind = allowedKinds[0];
      } else if (allowedKinds.includes('check-in')) {
        resolvedKind = 'check-in';
      } else {
        resolvedKind = allowedKinds[0] || 'check-in';
      }
    }
    if (allowedKinds.length > 0 && !allowedKinds.includes(resolvedKind)) {
      return { ok: false, reason: 'ATTENDANCE_NFC_READER_KIND_NOT_ALLOWED' };
    }

    // Card lookup.
    const card = await _findActiveCardByUid(cardUid);
    if (!card) {
      return { ok: false, reason: 'ATTENDANCE_NFC_CARD_NOT_BOUND' };
    }
    // Suspended/lost/replaced rows can't reach here (filter is active),
    // but we double-check to defend against drift.
    if (card.status !== 'active') {
      return {
        ok: false,
        reason: `ATTENDANCE_NFC_CARD_${String(card.status).toUpperCase()}`,
      };
    }

    // Role allow-list (the reader can refuse certain roles — handy
    // for a "drivers only" garage gate).
    // Note: we don't fetch the employee record from here. If the
    // reader requires role-filtering, the caller (route) is expected
    // to pre-resolve and pass role; for now we accept any role since
    // the card itself binds an employee.

    // Flags.
    const flags = [];
    if (tailgateSuspected) flags.push('tailgate');

    // Shift context.
    let expectedWindow = null;
    if (shiftResolver) {
      try {
        const r = await shiftResolver.resolveShiftForEmployee({
          employeeId: card.employeeId,
          at: t,
        });
        if (r.ok && r.shift && typeof shiftResolver.computeExpectedWindow === 'function') {
          expectedWindow = shiftResolver.computeExpectedWindow({
            shift: r.shift,
            shiftDate: t,
          });
        }
      } catch (err) {
        logger.warn(`[nfc-attendance] shift resolve failed: ${err.message}`);
      }
    }
    if (expectedWindow && t.getTime() > expectedWindow.latestCheckOut.getTime()) {
      flags.push('after-hours');
    }

    // Wrong-branch detection: card.branchId vs reader.branchId mismatch.
    if (card.branchId && reader.branchId && String(card.branchId) !== String(reader.branchId)) {
      flags.push('device-wrong-branch');
    }

    // Duplicate suppression — same card + reader + kind within window.
    const dupSince = new Date(t.getTime() - reg.DEFAULTS.DUPLICATE_SUPPRESSION_WINDOW_MS);
    let dupCursor = sourceEventModel.find({
      source: reg.SOURCE_KIND.NFC,
      'sourceRef.cardUid': cardUid,
      'sourceRef.readerId': readerId,
      eventKind: resolvedKind,
      eventTime: { $gte: dupSince, $lte: t },
    });
    if (typeof dupCursor.lean === 'function') dupCursor = dupCursor.lean();
    let dupRows = [];
    try {
      dupRows = (await dupCursor) || [];
    } catch (err) {
      logger.warn(`[nfc-attendance] dup lookup failed: ${err.message}`);
    }
    if (dupRows.length > 0) {
      return {
        ok: false,
        reason: reg.REASON.DUPLICATE_WITHIN_WINDOW,
        duplicate: dupRows[0],
      };
    }

    const baseConfidence = 100;
    const effectiveConfidence = reg.inferEffectiveConfidence({
      source: reg.SOURCE_KIND.NFC,
      baseConfidence,
      flags,
    });
    const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.NFC, effectiveConfidence, {
      flags,
    });

    const eventDoc = new sourceEventModel({
      employeeId: card.employeeId,
      branchId: reader.branchId,
      zoneId: reader.zone,
      eventTime: t,
      eventKind: resolvedKind,
      source: reg.SOURCE_KIND.NFC,
      sourceRefId: `nfc-${readerId}-${Date.now()}`,
      sourceRefCollection: 'attendance_nfc_readers',
      trustTier: reg.trustTierToNumeric(tierLabel),
      tierLabel,
      confidence: effectiveConfidence,
      accepted: true,
      flags,
      sourceRef: {
        readerId,
        readerObjectId: reader._id || null,
        cardUid,
        cardId: card._id || null,
        zone: reader.zone,
        ip,
      },
      expectedWindow: expectedWindow
        ? {
            shiftId: expectedWindow.shiftId,
            earliestCheckIn: expectedWindow.earliestCheckIn,
            latestCheckIn: expectedWindow.latestCheckIn,
            earliestCheckOut: expectedWindow.earliestCheckOut,
            latestCheckOut: expectedWindow.latestCheckOut,
          }
        : undefined,
    });

    try {
      await eventDoc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
    }
    try {
      await eventDoc.save();
    } catch (err) {
      logger.error('[nfc-attendance] save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Best-effort lastSeenAt.
    if (typeof nfcReaderModel.updateOne === 'function') {
      try {
        await nfcReaderModel.updateOne({ _id: reader._id }, { $set: { lastSeenAt: t } });
      } catch (err) {
        logger.warn(`[nfc-attendance] reader lastSeen failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      event: eventDoc.toObject ? eventDoc.toObject() : eventDoc,
      tierLabel,
      effectiveConfidence,
      flags,
      cardId: card._id,
      employeeId: card.employeeId,
    };
  }

  // ─── Local helpers ───────────────────────────────────────────

  async function _findActiveCardByUid(cardUid) {
    try {
      const cursor = nfcCardModel.findOne({ cardUid, status: 'active' });
      return typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[nfc-attendance] card lookup failed: ${err.message}`);
      return null;
    }
  }

  async function _findById(id) {
    try {
      const cursor = nfcCardModel.findById(id);
      return typeof cursor === 'object' && cursor && typeof cursor.then === 'function'
        ? await cursor
        : cursor;
    } catch (err) {
      logger.warn(`[nfc-attendance] findById failed: ${err.message}`);
      return null;
    }
  }

  return {
    issueCard,
    suspendCard,
    reportLost,
    deactivateCard,
    replaceCard,
    submitNfcTap,
    hashSecret,
  };
}

module.exports = {
  createNfcAttendanceService,
  hashSecret,
};
