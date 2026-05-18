'use strict';

/**
 * hikvision-event-parser.service.js — Wave 98 Phase 3.
 *
 * Drains `hikvision_raw_event` rows (parseStatus = pending), resolves
 * device/channel/branch/zone + matched employee + confidence, applies
 * the confidence gate, writes a `HikvisionProcessedEvent`, and emits
 * the side-effect (source event OR review queue row) accordingly.
 *
 * Decision matrix:
 *   AUTO_ACCEPT → write source event, link both ways
 *   REVIEW      → write review queue row, link from processed
 *   REJECT      → write processed event only (with reviewReason)
 *   SUPPRESSED  → write processed event, link to original kept event
 *
 * Public API:
 *   processRawEvent(rawEventId)          → { ok, processed?, sourceEvent?, review? }
 *   processBatch({ limit, since? })      → { ok, scanned, results }
 *   reprocessFailed({ limit })           → { ok, scanned, results }
 *
 * The service is dependency-injected with model handles AND services.
 * In Phase 4 the same factory will be called with a `reconcilerService`
 * to merge multi-source events; Phase 3 leaves that null.
 */

const reg = require('./hikvision.registry');

function createHikvisionEventParserService({
  // Models
  rawEventModel = null,
  processedEventModel = null,
  deviceModel = null,
  channelModel = null,
  templateModel = null,
  // Services
  gateService = null,
  attendanceSourceService = null,
  branchConfigService = null, // Wave 110 — optional per-branch overrides
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!rawEventModel) {
    throw new Error('hikvision-event-parser.service: rawEventModel is required');
  }
  if (!processedEventModel) {
    throw new Error('hikvision-event-parser.service: processedEventModel is required');
  }
  if (!deviceModel) {
    throw new Error('hikvision-event-parser.service: deviceModel is required');
  }
  if (!gateService || typeof gateService.evaluate !== 'function') {
    throw new Error('hikvision-event-parser.service: gateService is required');
  }
  if (!attendanceSourceService || typeof attendanceSourceService.createSourceEvent !== 'function') {
    throw new Error('hikvision-event-parser.service: attendanceSourceService is required');
  }

  // ─── Public ──────────────────────────────────────────────────

  async function processRawEvent(rawEventId) {
    if (!rawEventId) return { ok: false, reason: reg.REASON.RAW_EVENT_NOT_FOUND };

    const raw = await rawEventModel.findById(rawEventId);
    if (!raw) return { ok: false, reason: reg.REASON.RAW_EVENT_NOT_FOUND };
    if (raw.parseStatus !== reg.PARSE_STATUS.PENDING) {
      return {
        ok: false,
        reason: reg.REASON.RAW_EVENT_NOT_PENDING,
        errors: { parseStatus: raw.parseStatus },
      };
    }
    if (
      raw.eventKind === reg.RAW_EVENT_KIND.DEVICE_HEARTBEAT ||
      raw.eventKind === reg.RAW_EVENT_KIND.DEVICE_ERROR ||
      raw.eventKind === reg.RAW_EVENT_KIND.DOOR_OPEN
    ) {
      // Not an attendance candidate — mark skipped, no processed row.
      return _markRawSkipped(raw, 'non-attendance event kind');
    }

    // Step 1 — resolve device + channel + branch + zone.
    const device = await deviceModel.findById(raw.deviceId).lean();
    if (!device) {
      return _markRawFailed(raw, 'device not in registry');
    }

    let channel = null;
    if (raw.channelId && channelModel) {
      channel = await channelModel.findById(raw.channelId).lean();
    }

    // Step 2 — resolve matchedEmployeeId via face template (if any).
    const personId = _extractPersonId(raw);
    let template = null;
    let matchedEmployeeId = null;
    let templateInactive = false;
    if (personId && templateModel) {
      template = await templateModel.findOne({ hikvisionPersonId: personId }).lean();
      if (template) {
        if (template.status === reg.TEMPLATE_STATUS.ACTIVE) {
          matchedEmployeeId = template.employeeId;
        } else {
          templateInactive = true;
        }
      }
    }

    // Step 3 — extract confidence + anti-spoof from payload (best-effort).
    const confidence = _extractConfidence(raw);
    const antiSpoofResult = _extractAntiSpoof(raw);

    // Step 4 — determine source + prior events for suppression / impossible-travel.
    const source = gateService.resolveSourceFromDevice(device, channel);
    const zoneId = channel?.zoneId || device.zoneId || null;
    const branchId = device.branchId;

    let priorSameZone = null;
    let priorDifferentBranch = null;
    if (matchedEmployeeId) {
      const sw = gateService.buildSuppressionWindow(
        matchedEmployeeId,
        zoneId,
        raw.capturedAt || now()
      );
      // Same employee + zone within window + already AUTO_ACCEPT
      const sameZoneList = await processedEventModel
        .find({
          matchedEmployeeId,
          zoneId,
          decision: reg.GATE_DECISION.AUTO_ACCEPT,
          capturedAt: { $gte: sw.since },
        })
        .sort({ capturedAt: -1 })
        .limit(1);
      const arr = Array.isArray(sameZoneList) ? sameZoneList : await sameZoneList.lean?.();
      priorSameZone = Array.isArray(arr) && arr.length ? arr[0] : null;

      // Different branch within impossible-travel window
      const itSince = new Date(
        (raw.capturedAt instanceof Date
          ? raw.capturedAt.getTime()
          : Date.parse(raw.capturedAt) || Date.now()) - reg.IMPOSSIBLE_TRAVEL_WINDOW_MS
      );
      const diffBranchList = await processedEventModel
        .find({
          matchedEmployeeId,
          branchId: { $ne: branchId },
          decision: reg.GATE_DECISION.AUTO_ACCEPT,
          capturedAt: { $gte: itSince },
        })
        .sort({ capturedAt: -1 })
        .limit(1);
      const arr2 = Array.isArray(diffBranchList) ? diffBranchList : await diffBranchList.lean?.();
      priorDifferentBranch = Array.isArray(arr2) && arr2.length ? arr2[0] : null;
    }

    // Step 5 — run the gate.
    let gateOutput;
    if (templateInactive) {
      gateOutput = {
        decision: reg.GATE_DECISION.REVIEW,
        reason: reg.REVIEW_REASON.TEMPLATE_INACTIVE,
        queue: reg.REVIEW_QUEUE.SECURITY,
        autoThreshold: null,
        reviewFloor: null,
        flags: ['template-inactive'],
      };
    } else if (raw.eventKind === reg.RAW_EVENT_KIND.UNREGISTERED_FACE || !matchedEmployeeId) {
      // Unregistered face → security review (no employee linked).
      gateOutput = {
        decision: reg.GATE_DECISION.REVIEW,
        reason: reg.REVIEW_REASON.UNREGISTERED,
        queue: reg.REVIEW_QUEUE.SECURITY,
        autoThreshold: null,
        reviewFloor: null,
        flags: ['unregistered'],
      };
    } else {
      // Wave 110 — resolve per-branch overrides (graceful: defaults
      // when service absent or branchId unknown). Fail-open inside
      // the service means we never lose events because the overrides
      // table is briefly unavailable.
      let resolvedThresholds;
      if (branchConfigService && typeof branchConfigService.resolveEffective === 'function') {
        try {
          const r = await branchConfigService.resolveEffective(branchId);
          if (r && r.ok && r.effective && r.effective.confidenceThresholds) {
            resolvedThresholds = r.effective.confidenceThresholds;
          }
        } catch (err) {
          logger.warn(`[Hikvision Parser] branchConfig resolve failed: ${err.message}`);
        }
      }
      gateOutput = gateService.evaluate({
        confidence,
        antiSpoofResult,
        source,
        channel,
        priorAcceptedSameZone: priorSameZone,
        priorAcceptedDifferentBranch: priorDifferentBranch,
        employeeId: matchedEmployeeId,
        branchId,
        capturedAt: raw.capturedAt || now(),
        ...(resolvedThresholds ? { thresholds: resolvedThresholds } : {}),
      });
    }

    // Step 6 — derive trust tier.
    const trustTier = reg.resolveTrustTier({ source, corroborated: false });

    // Step 7 — persist processed event.
    const processed = new processedEventModel({
      rawEventId: raw._id,
      deviceId: device._id,
      channelId: channel?._id || null,
      branchId,
      zoneId,
      eventKind: raw.eventKind,
      source,
      matchedEmployeeId,
      hikvisionPersonId: personId,
      templateId: template?._id || null,
      confidence: Number.isFinite(confidence) ? confidence : null,
      antiSpoofResult,
      trustTier,
      capturedAt: raw.capturedAt || raw.receivedAt || now(),
      processedAt: now(),
      decision: gateOutput.decision,
      reviewReason: gateOutput.reason,
      reviewQueue: gateOutput.queue,
      autoThreshold: gateOutput.autoThreshold,
      reviewFloor: gateOutput.reviewFloor,
      linkedSuppressedFromEventId: gateOutput.linkedSuppressedFromEventId || null,
      flags: gateOutput.flags || [],
    });

    try {
      await processed.validate();
      await processed.save();
    } catch (err) {
      return _markRawFailed(raw, `processed event save failed: ${err.message}`);
    }

    // Step 8 — side effects per decision.
    let sourceEvent = null;
    let review = null;

    if (gateOutput.decision === reg.GATE_DECISION.AUTO_ACCEPT) {
      const sr = await attendanceSourceService.createSourceEvent({
        employeeId: matchedEmployeeId,
        branchId,
        zoneId,
        eventTime: raw.capturedAt,
        eventKind: reg.ATTENDANCE_EVENT_KIND.UNKNOWN, // Phase 4 shift rules resolve in/out
        source,
        sourceRefId: String(processed._id),
        sourceRefCollection: 'hikvision_processed_events',
        trustTier,
        confidence,
        accepted: true,
      });
      if (sr.ok) {
        sourceEvent = sr.sourceEvent;
        processed.attendanceSourceEventId = sourceEvent._id;
        try {
          await processed.save();
        } catch (err) {
          logger.warn(
            '[Hikvision Parser] linking source event into processed failed:',
            err.message
          );
        }
      } else {
        logger.warn('[Hikvision Parser] source event creation failed:', sr.reason);
      }
    } else if (gateOutput.decision === reg.GATE_DECISION.REVIEW) {
      const rr = await attendanceSourceService.createReview({
        processedEventId: processed._id,
        employeeId: matchedEmployeeId,
        branchId,
        reason: gateOutput.reason,
        queue: gateOutput.queue,
        confidence,
      });
      if (rr.ok) {
        review = rr.review;
        processed.reviewId = review._id;
        try {
          await processed.save();
        } catch (err) {
          logger.warn('[Hikvision Parser] linking review into processed failed:', err.message);
        }
      } else {
        logger.warn('[Hikvision Parser] review creation failed:', rr.reason);
      }
    }
    // REJECT + SUPPRESSED produce no side effect beyond the processed row.

    // Step 9 — mark the raw event parsed + forward link.
    raw.parseStatus = reg.PARSE_STATUS.PARSED;
    raw.parsedAt = now();
    raw.parseAttempts = (raw.parseAttempts || 0) + 1;
    raw.parseError = null;
    raw.processedEventId = processed._id;
    try {
      await raw.save();
    } catch (err) {
      logger.warn('[Hikvision Parser] raw mark-parsed failed (non-fatal):', err.message);
    }

    return {
      ok: true,
      decision: gateOutput.decision,
      processed: processed.toObject ? processed.toObject() : processed,
      sourceEvent,
      review,
    };
  }

  async function processBatch({ limit, since } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const q = { parseStatus: reg.PARSE_STATUS.PENDING };
    if (since) q.receivedAt = { $gte: new Date(since) };

    const cursor = rawEventModel.find(q).sort({ receivedAt: 1 }).limit(lim);
    const candidates = await cursor;

    const results = [];
    for (const raw of candidates) {
      const r = await processRawEvent(raw._id);
      results.push({
        rawEventId: String(raw._id),
        ok: r.ok,
        decision: r.decision,
        reason: r.reason,
      });
    }
    return { ok: true, scanned: candidates.length, results };
  }

  async function reprocessFailed({ limit } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const cursor = rawEventModel
      .find({ parseStatus: reg.PARSE_STATUS.FAILED })
      .sort({ receivedAt: 1 })
      .limit(lim);
    const candidates = await cursor;

    // Reset to pending so processRawEvent can pick them up.
    for (const raw of candidates) {
      raw.parseStatus = reg.PARSE_STATUS.PENDING;
      raw.parseError = null;
      try {
        await raw.save();
      } catch (err) {
        logger.warn('[Hikvision Parser] reprocess reset failed:', err.message);
      }
    }
    return processBatch({ limit: lim });
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function _extractPersonId(raw) {
    const p = raw.rawPayload || {};
    return (
      p.hikvisionPersonId ||
      p.personId ||
      p.personID ||
      p.PersonInfo?.personId ||
      p.PersonInfo?.personID ||
      null
    );
  }

  function _extractConfidence(raw) {
    const p = raw.rawPayload || {};
    const candidates = [p.similarity, p.confidence, p.faceScore, p.score];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
      // Hikvision sometimes returns 0..1
      if (Number.isFinite(n) && n >= 0 && n <= 1) return n * 100;
    }
    return null;
  }

  function _extractAntiSpoof(raw) {
    const p = raw.rawPayload || {};
    const v = p.antiSpoof || p.antiSpoofing || p.liveness || p.livenessCheck;
    if (typeof v === 'string') {
      const s = v.toLowerCase();
      if (s === 'pass' || s === 'success' || s === 'true' || s === 'real')
        return reg.ANTI_SPOOF.PASS;
      if (s === 'fail' || s === 'failure' || s === 'false' || s === 'spoof' || s === 'fake') {
        return reg.ANTI_SPOOF.FAIL;
      }
    }
    if (typeof v === 'boolean') return v ? reg.ANTI_SPOOF.PASS : reg.ANTI_SPOOF.FAIL;
    return reg.ANTI_SPOOF.UNKNOWN;
  }

  async function _markRawSkipped(raw, msg) {
    raw.parseStatus = reg.PARSE_STATUS.SKIPPED;
    raw.parseAttempts = (raw.parseAttempts || 0) + 1;
    raw.parsedAt = now();
    raw.parseError = msg || null;
    try {
      await raw.save();
    } catch (err) {
      logger.warn('[Hikvision Parser] skip-mark failed (non-fatal):', err.message);
    }
    return { ok: true, decision: null, skipped: true, reason: msg };
  }

  async function _markRawFailed(raw, msg) {
    raw.parseStatus = reg.PARSE_STATUS.FAILED;
    raw.parseAttempts = (raw.parseAttempts || 0) + 1;
    raw.parseError = msg ? String(msg).slice(0, 2000) : null;
    try {
      await raw.save();
    } catch (err) {
      logger.warn('[Hikvision Parser] fail-mark failed (non-fatal):', err.message);
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { parser: msg } };
  }

  return {
    processRawEvent,
    processBatch,
    reprocessFailed,
  };
}

module.exports = { createHikvisionEventParserService };
