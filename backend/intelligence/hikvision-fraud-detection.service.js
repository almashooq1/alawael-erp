'use strict';

/**
 * hikvision-fraud-detection.service.js — Wave 100 Phase 5.
 *
 * Runs detection algorithms over `HikvisionProcessedEvent` data and
 * emits `HikvisionFraudFlag` rows. Six detectors:
 *
 *   1. repeat-mismatch — per template, ≥3 confidence fails in 24h
 *   2. shared-identity — per template, ≥2 impossible-travel in 7d
 *   3. burst-access — per employee, ≥5 events in 5min
 *   4. off-hours-access — per event, employee at gate well outside duty
 *   5. anti-spoof-trend — per template, ≥2 anti-spoof FAIL in 24h
 *   6. unregistered-repeat — same unregistered face seen ≥3 times
 *
 * Public API:
 *   evaluateProcessedEvent(processedEvent) — called by parser after gate
 *     scans for `single-event` detectors (burst near this event,
 *     off-hours classification). Emits 0..N flags.
 *
 *   scanTemplates({ since?, templateIds? }) — sweep for template-level
 *     patterns (repeat-mismatch, shared-identity, anti-spoof-trend,
 *     template-inactive-used). Cron-driven.
 *
 *   scanUnregisteredFaces({ since? }) — sweep unregistered-face events
 *     to find repeated occurrences.
 *
 *   listFlags(filter) / getFlag(id)
 *   acknowledgeFlag(id, { actor, note })
 *   dismissFlag(id, { actor, note })
 *   escalateFlag(id, { actor, note, escalatedToRole })
 *   sweepExpiredFlags({ now? })
 *
 * The service is dependency-injected with model handles. Phase 5
 * score service consumes the flags this service emits.
 */

const reg = require('./hikvision.registry');

function createHikvisionFraudDetectionService({
  flagModel = null,
  processedEventModel = null,
  templateModel: _templateModel = null, // reserved for Phase 5 extensions (template-level filters)
  branchModel = null, // optional — for off-hours shift lookup
  scoreService = null, // optional — applies score impact on emit
  logger = console,
  now = () => new Date(),
  // ─── Wave 275b — Service-layer MFA tier enforcement ────────────
  // Default OFF for backwards compat with Wave 100 tests that
  // construct the service with plain { userId } actors. app.js opts
  // IN with `enforceMfa: true`. Same opt-in shape as [[wave275-service-layer-mfa-pilot]].
  enforceMfa = false,
} = {}) {
  if (!flagModel) {
    throw new Error('hikvision-fraud-detection.service: flagModel is required');
  }
  if (!processedEventModel) {
    throw new Error('hikvision-fraud-detection.service: processedEventModel is required');
  }
  void _templateModel;

  /**
   * Wave 275b — service-layer MFA tier guard. Reads actor.mfaLevel and
   * actor.mfaAssertedAt populated by the W273 attachMfaActor route
   * middleware (and propagated through routes/hikvision.routes.js
   * `actorFrom`). When enforceMfa=false, this is a no-op so test
   * suites that don't need MFA can construct the service cleanly.
   * Duplicated inline (not extracted) per CLAUDE.md "three similar
   * lines is better than a premature abstraction"; extract to a
   * shared lib once a 3rd service adopts this pattern.
   *
   * @param {object} actor
   * @param {number} requiredTier  — 1, 2, or 3
   * @param {number} maxAgeMin     — assertion freshness window in minutes
   * @returns {{ ok: true } | { ok: false, reason: string, requiredTier: number, actorTier: number, maxAgeMin?: number, ageMin?: number|null }}
   */
  function _checkMfaTier(actor, requiredTier, maxAgeMin) {
    if (!enforceMfa) return { ok: true };
    const actorTier = typeof (actor && actor.mfaLevel) === 'number' ? actor.mfaLevel : 0;
    if (actorTier < requiredTier) {
      return {
        ok: false,
        reason: reg.REASON.MFA_TIER_REQUIRED,
        requiredTier,
        actorTier,
      };
    }
    const assertedAt = actor && actor.mfaAssertedAt;
    if (!assertedAt) {
      return {
        ok: false,
        reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        actorTier,
        maxAgeMin,
        ageMin: null,
      };
    }
    const t = assertedAt instanceof Date ? assertedAt.getTime() : Date.parse(assertedAt);
    if (!Number.isFinite(t)) {
      return {
        ok: false,
        reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        actorTier,
        maxAgeMin,
        ageMin: null,
      };
    }
    const ageMin = Math.floor((now().getTime() - t) / 60000);
    if (ageMin > maxAgeMin) {
      return {
        ok: false,
        reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        actorTier,
        maxAgeMin,
        ageMin,
      };
    }
    return { ok: true };
  }

  // ─── Single-event detectors ──────────────────────────────────

  async function evaluateProcessedEvent(processedEvent) {
    if (!processedEvent || !processedEvent._id) {
      return { ok: true, flagsEmitted: 0, flags: [] };
    }
    const emitted = [];

    // Detector A — burst access (per employee within last BURST_WINDOW_MS)
    if (processedEvent.matchedEmployeeId) {
      const since = new Date(
        (processedEvent.capturedAt instanceof Date
          ? processedEvent.capturedAt.getTime()
          : Date.parse(processedEvent.capturedAt) || Date.now()) -
          reg.FRAUD_DEFAULTS.BURST_WINDOW_MS
      );
      let cursor = processedEventModel
        .find({
          matchedEmployeeId: processedEvent.matchedEmployeeId,
          capturedAt: { $gte: since },
        })
        .sort({ capturedAt: 1 });
      if (typeof cursor.lean === 'function') cursor = cursor.lean();
      const recent = await cursor;
      const spec = reg.detectBurstPattern(recent);
      if (spec) {
        // Avoid re-emitting the same burst — check for an existing OPEN
        // burst flag covering this employee within the last BURST window.
        const existing = await flagModel
          .findOne({
            kind: reg.FRAUD_KIND.BURST_ACCESS,
            employeeId: processedEvent.matchedEmployeeId,
            state: reg.FRAUD_FLAG_STATE.OPEN,
            detectedAt: { $gte: new Date(Date.now() - reg.FRAUD_DEFAULTS.BURST_WINDOW_MS) },
          })
          .lean();
        if (!existing) {
          const flag = await _emit({
            ...spec,
            employeeId: processedEvent.matchedEmployeeId,
            templateId: processedEvent.templateId,
            branchId: processedEvent.branchId,
            detectorContext: { detector: 'burst', windowMs: reg.FRAUD_DEFAULTS.BURST_WINDOW_MS },
          });
          if (flag) emitted.push(flag);
        }
      }
    }

    // Detector B — anti-spoof FAIL on this single event = immediate
    // critical flag (works even with no history). Phase 3 already
    // rejected the event; we add a fraud flag for trend tracking.
    if (processedEvent.antiSpoofResult === reg.ANTI_SPOOF.FAIL) {
      const flag = await _emit({
        kind: reg.FRAUD_KIND.ANTI_SPOOF_TREND,
        severity: reg.FRAUD_SEVERITY.CRITICAL,
        scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.CRITICAL],
        evidenceProcessedEventIds: [String(processedEvent._id)],
        summary: 'anti-spoof failure detected at recognition gate',
        employeeId: processedEvent.matchedEmployeeId,
        templateId: processedEvent.templateId,
        branchId: processedEvent.branchId,
        detectorContext: { detector: 'anti-spoof-single' },
      });
      if (flag) emitted.push(flag);
    }

    // Detector C — template inactive but device still matched.
    // Phase 3 routed this to REVIEW with reason=TEMPLATE_INACTIVE; we
    // also emit a fraud flag because it's a fraud signal (someone
    // trying a suspended template).
    if (
      processedEvent.reviewReason === reg.REVIEW_REASON.TEMPLATE_INACTIVE &&
      processedEvent.templateId
    ) {
      const flag = await _emit({
        kind: reg.FRAUD_KIND.TEMPLATE_INACTIVE_USED,
        severity: reg.FRAUD_SEVERITY.HIGH,
        scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.HIGH],
        evidenceProcessedEventIds: [String(processedEvent._id)],
        summary: 'suspended or deleted template still matched at device',
        employeeId: processedEvent.matchedEmployeeId,
        templateId: processedEvent.templateId,
        branchId: processedEvent.branchId,
        detectorContext: { detector: 'template-inactive' },
      });
      if (flag) emitted.push(flag);
    }

    // Detector D — single impossible-travel occurrence (Phase 3 caught
    // it as a review; we emit a fraud flag for score tracking).
    if (
      processedEvent.reviewReason === reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL &&
      processedEvent.matchedEmployeeId
    ) {
      const flag = await _emit({
        kind: reg.FRAUD_KIND.IMPOSSIBLE_TRAVEL,
        severity: reg.FRAUD_SEVERITY.HIGH,
        scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.HIGH],
        evidenceProcessedEventIds: [String(processedEvent._id)],
        summary: 'employee detected in different branch within travel-impossible window',
        employeeId: processedEvent.matchedEmployeeId,
        templateId: processedEvent.templateId,
        branchId: processedEvent.branchId,
        detectorContext: { detector: 'impossible-travel-single' },
      });
      if (flag) emitted.push(flag);
    }

    // Detector E — off-hours-access (best-effort; needs branch shift calendar)
    if (processedEvent.matchedEmployeeId && branchModel && processedEvent.branchId) {
      const offHours = await _checkOffHours(processedEvent);
      if (offHours) {
        const flag = await _emit({
          ...offHours,
          employeeId: processedEvent.matchedEmployeeId,
          templateId: processedEvent.templateId,
          branchId: processedEvent.branchId,
          evidenceProcessedEventIds: [String(processedEvent._id)],
        });
        if (flag) emitted.push(flag);
      }
    }

    return { ok: true, flagsEmitted: emitted.length, flags: emitted };
  }

  // ─── Template-level scans (cron) ─────────────────────────────

  async function scanTemplates({ since, templateIds } = {}) {
    const sinceDt = since
      ? new Date(since)
      : new Date(Date.now() - reg.FRAUD_DEFAULTS.SHARED_IDENTITY_WINDOW_MS);
    const flags = [];

    // Build target template set
    let targets = templateIds;
    if (!Array.isArray(targets) || targets.length === 0) {
      // Discover templates that had ANY processed event in the window
      let cursor = processedEventModel
        .find({ templateId: { $ne: null }, capturedAt: { $gte: sinceDt } })
        .select({ templateId: 1 });
      if (typeof cursor.lean === 'function') cursor = cursor.lean();
      const rows = await cursor;
      const set = new Set();
      for (const r of rows || []) {
        if (r.templateId) set.add(String(r.templateId));
      }
      targets = Array.from(set);
    }

    for (const tid of targets) {
      // ── repeat-mismatch
      const mismatchSince = new Date(Date.now() - reg.FRAUD_DEFAULTS.REPEAT_MISMATCH_WINDOW_MS);
      let mmCursor = processedEventModel
        .find({ templateId: tid, capturedAt: { $gte: mismatchSince } })
        .sort({ capturedAt: 1 });
      if (typeof mmCursor.lean === 'function') mmCursor = mmCursor.lean();
      const mmEvents = await mmCursor;
      const mmSpec = reg.detectRepeatMismatchInWindow(mmEvents);
      if (mmSpec && !(await _hasOpenFlag({ kind: mmSpec.kind, templateId: tid }))) {
        const flag = await _emit({
          ...mmSpec,
          employeeId: mmEvents[0]?.matchedEmployeeId || null,
          templateId: tid,
          branchId: mmEvents[0]?.branchId || null,
          detectorContext: {
            detector: 'repeat-mismatch',
            windowMs: reg.FRAUD_DEFAULTS.REPEAT_MISMATCH_WINDOW_MS,
            observedCount: mmEvents.filter(
              e =>
                e.decision === reg.GATE_DECISION.REJECT &&
                (e.reviewReason === reg.REVIEW_REASON.LOW_CONFIDENCE ||
                  e.reviewReason === reg.REVIEW_REASON.MISMATCH ||
                  e.reviewReason === reg.REVIEW_REASON.REPEAT_MISMATCH)
            ).length,
          },
        });
        if (flag) flags.push(flag);
      }

      // ── shared-identity (≥2 impossible-travel events in 7d)
      const siSince = new Date(Date.now() - reg.FRAUD_DEFAULTS.SHARED_IDENTITY_WINDOW_MS);
      let siCursor = processedEventModel
        .find({
          templateId: tid,
          reviewReason: reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL,
          capturedAt: { $gte: siSince },
        })
        .sort({ capturedAt: 1 });
      if (typeof siCursor.lean === 'function') siCursor = siCursor.lean();
      const siEvents = await siCursor;
      if (
        siEvents.length >= reg.FRAUD_DEFAULTS.SHARED_IDENTITY_THRESHOLD &&
        !(await _hasOpenFlag({ kind: reg.FRAUD_KIND.SHARED_IDENTITY, templateId: tid }))
      ) {
        const flag = await _emit({
          kind: reg.FRAUD_KIND.SHARED_IDENTITY,
          severity: reg.FRAUD_SEVERITY.CRITICAL,
          scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.CRITICAL],
          evidenceProcessedEventIds: siEvents.map(e => String(e._id)),
          summary: `${siEvents.length} impossible-travel events in 7d for same template`,
          employeeId: siEvents[0].matchedEmployeeId,
          templateId: tid,
          branchId: siEvents[0].branchId,
          detectorContext: {
            detector: 'shared-identity',
            windowMs: reg.FRAUD_DEFAULTS.SHARED_IDENTITY_WINDOW_MS,
            observedCount: siEvents.length,
          },
        });
        if (flag) flags.push(flag);
      }

      // ── anti-spoof trend (≥2 in 24h)
      const asSince = new Date(Date.now() - reg.FRAUD_DEFAULTS.ANTI_SPOOF_TREND_WINDOW_MS);
      let asCursor = processedEventModel
        .find({
          templateId: tid,
          antiSpoofResult: reg.ANTI_SPOOF.FAIL,
          capturedAt: { $gte: asSince },
        })
        .sort({ capturedAt: 1 });
      if (typeof asCursor.lean === 'function') asCursor = asCursor.lean();
      const asEvents = await asCursor;
      if (
        asEvents.length >= reg.FRAUD_DEFAULTS.ANTI_SPOOF_TREND_THRESHOLD &&
        !(await _hasOpenFlag({ kind: reg.FRAUD_KIND.ANTI_SPOOF_TREND, templateId: tid }))
      ) {
        const flag = await _emit({
          kind: reg.FRAUD_KIND.ANTI_SPOOF_TREND,
          severity: reg.FRAUD_SEVERITY.CRITICAL,
          scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.CRITICAL],
          evidenceProcessedEventIds: asEvents.map(e => String(e._id)),
          summary: `${asEvents.length} anti-spoof failures in 24h for same template`,
          employeeId: asEvents[0].matchedEmployeeId,
          templateId: tid,
          branchId: asEvents[0].branchId,
          detectorContext: {
            detector: 'anti-spoof-trend',
            windowMs: reg.FRAUD_DEFAULTS.ANTI_SPOOF_TREND_WINDOW_MS,
            observedCount: asEvents.length,
          },
        });
        if (flag) flags.push(flag);
      }
    }

    return { ok: true, scanned: targets.length, flagsEmitted: flags.length, flags };
  }

  async function scanUnregisteredFaces({ since } = {}) {
    const sinceDt = since
      ? new Date(since)
      : new Date(Date.now() - reg.FRAUD_DEFAULTS.UNREGISTERED_REPEAT_WINDOW_MS);

    let cursor = processedEventModel
      .find({
        eventKind: reg.RAW_EVENT_KIND.UNREGISTERED_FACE,
        capturedAt: { $gte: sinceDt },
      })
      .sort({ capturedAt: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const events = await cursor;

    // Group by hikvisionPersonId — unregistered faces still get a
    // device-assigned personId we can correlate.
    const byPerson = new Map();
    for (const e of events || []) {
      if (!e.hikvisionPersonId) continue;
      const arr = byPerson.get(e.hikvisionPersonId) || [];
      arr.push(e);
      byPerson.set(e.hikvisionPersonId, arr);
    }

    const flags = [];
    for (const [pid, arr] of byPerson) {
      if (arr.length < reg.FRAUD_DEFAULTS.UNREGISTERED_REPEAT_THRESHOLD) continue;
      if (
        await _hasOpenFlag({
          kind: reg.FRAUD_KIND.UNREGISTERED_REPEAT,
          hikvisionPersonId: pid,
        })
      )
        continue;
      const flag = await _emit({
        kind: reg.FRAUD_KIND.UNREGISTERED_REPEAT,
        severity: reg.FRAUD_SEVERITY.HIGH,
        scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.HIGH],
        evidenceProcessedEventIds: arr.map(e => String(e._id)),
        summary: `unregistered face (personId=${pid}) seen ${arr.length} times in ${Math.round(reg.FRAUD_DEFAULTS.UNREGISTERED_REPEAT_WINDOW_MS / (24 * 60 * 60_000))}d`,
        employeeId: null,
        hikvisionPersonId: pid,
        branchId: arr[0].branchId,
        detectorContext: {
          detector: 'unregistered-repeat',
          windowMs: reg.FRAUD_DEFAULTS.UNREGISTERED_REPEAT_WINDOW_MS,
          observedCount: arr.length,
        },
      });
      if (flag) flags.push(flag);
    }

    return { ok: true, scanned: events.length, flagsEmitted: flags.length, flags };
  }

  // ─── Read APIs ───────────────────────────────────────────────

  async function listFlags(filter = {}) {
    const q = {};
    if (filter.employeeId) q.employeeId = filter.employeeId;
    if (filter.templateId) q.templateId = filter.templateId;
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.kind) q.kind = filter.kind;
    if (filter.severity) q.severity = filter.severity;
    if (filter.state) q.state = filter.state;
    if (filter.since || filter.until) {
      q.detectedAt = {};
      if (filter.since) q.detectedAt.$gte = new Date(filter.since);
      if (filter.until) q.detectedAt.$lte = new Date(filter.until);
    }
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = flagModel.find(q).sort({ detectedAt: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof flagModel.countDocuments === 'function'
        ? await flagModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getFlag(id) {
    if (!id) return { ok: false, reason: reg.REASON.FRAUD_FLAG_NOT_FOUND };
    const f = await flagModel.findById(id).lean();
    if (!f) return { ok: false, reason: reg.REASON.FRAUD_FLAG_NOT_FOUND };
    return { ok: true, flag: f };
  }

  // ─── Action APIs ─────────────────────────────────────────────

  async function acknowledgeFlag(id, { actor, note } = {}) {
    return _transition(id, {
      actor,
      note,
      targetState: reg.FRAUD_FLAG_STATE.ACKNOWLEDGED,
    });
  }

  async function dismissFlag(id, { actor, note } = {}) {
    // Wave 275b — service-layer MFA tier 2 (15 min) check. Mirrors
    // W273 route-layer tier on /fraud/flags/:id/dismiss. Runs BEFORE
    // note validation because MFA is the heaviest gate; failing fast
    // saves the user typing a dismissal reason they can't submit.
    const mfa = _checkMfaTier(actor, 2, 15);
    if (!mfa.ok) return mfa;
    if (!note || !String(note).trim()) {
      return { ok: false, reason: reg.REASON.FRAUD_FLAG_RESOLUTION_REASON_REQUIRED };
    }
    return _transition(id, {
      actor,
      note,
      targetState: reg.FRAUD_FLAG_STATE.DISMISSED,
      mutator: doc => {
        // dismissed → remove score contribution
        doc.scoreImpact = 0;
      },
    });
  }

  async function escalateFlag(id, { actor, note, escalatedToRole } = {}) {
    // Wave 275b — service-layer MFA tier 2 (15 min) check. Mirrors
    // the NEW route-layer tier on /fraud/flags/:id/escalate added in
    // this same commit (escalate was missed by the original W273
    // route-layer pass — closed here in both layers atomically).
    const mfa = _checkMfaTier(actor, 2, 15);
    if (!mfa.ok) return mfa;
    if (!escalatedToRole || !String(escalatedToRole).trim()) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { escalatedToRole: 'required' },
      };
    }
    return _transition(id, {
      actor,
      note,
      targetState: reg.FRAUD_FLAG_STATE.ESCALATED,
      mutator: doc => {
        doc.escalatedToRole = String(escalatedToRole).slice(0, 100);
      },
    });
  }

  async function sweepExpiredFlags({ now: nowArg } = {}) {
    const nowMs = (nowArg || now()).getTime?.() || Date.now();
    const cutoff = new Date(nowMs - reg.FRAUD_DEFAULTS.SCORE_HARD_EXPIRE_MS);

    const cursor = flagModel
      .find({
        state: { $in: [reg.FRAUD_FLAG_STATE.OPEN, reg.FRAUD_FLAG_STATE.ACKNOWLEDGED] },
        detectedAt: { $lt: cutoff },
      })
      .limit(500);
    const candidates = await cursor;

    let expired = 0;
    for (const f of candidates) {
      f.state = reg.FRAUD_FLAG_STATE.EXPIRED;
      try {
        await f.validate();
        await f.save();
        expired += 1;
      } catch (err) {
        logger.warn(`[Fraud] sweepExpired failed for ${f._id}:`, err.message);
      }
    }
    return { ok: true, scanned: candidates.length, expired };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  async function _emit(spec) {
    if (!spec || !reg.FRAUD_KINDS.includes(spec.kind)) {
      logger.warn('[Fraud] _emit rejected: invalid kind', spec?.kind);
      return null;
    }
    if (!reg.FRAUD_SEVERITIES.includes(spec.severity)) {
      logger.warn('[Fraud] _emit rejected: invalid severity', spec?.severity);
      return null;
    }
    const doc = new flagModel({
      kind: spec.kind,
      severity: spec.severity,
      employeeId: spec.employeeId || null,
      templateId: spec.templateId || null,
      hikvisionPersonId: spec.hikvisionPersonId || null,
      branchId: spec.branchId || null,
      evidenceProcessedEventIds: Array.isArray(spec.evidenceProcessedEventIds)
        ? spec.evidenceProcessedEventIds
        : [],
      detectedAt: now(),
      detectedBy: spec.detectedBy || 'engine',
      summary: spec.summary || null,
      scoreImpact: Number.isFinite(spec.scoreImpact) ? spec.scoreImpact : 0,
      state: reg.FRAUD_FLAG_STATE.OPEN,
      detectorContext: spec.detectorContext || {},
    });

    try {
      await doc.validate();
    } catch (err) {
      logger.warn('[Fraud] _emit validation failed:', err.message);
      return null;
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Fraud] _emit save failed:', err.message);
      return null;
    }

    const obj = doc.toObject ? doc.toObject() : doc;

    // Bump employee score if score service is wired.
    if (scoreService && typeof scoreService.applyFlag === 'function' && spec.employeeId) {
      try {
        await scoreService.applyFlag(obj);
      } catch (err) {
        logger.warn('[Fraud] applyFlag failed (non-fatal):', err.message);
      }
    }

    return obj;
  }

  async function _hasOpenFlag(filter) {
    const q = { ...filter, state: reg.FRAUD_FLAG_STATE.OPEN };
    const f = await flagModel.findOne(q).lean();
    return !!f;
  }

  async function _transition(id, { actor, note, targetState, mutator } = {}) {
    if (!id) return { ok: false, reason: reg.REASON.FRAUD_FLAG_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'resolver required' },
      };
    }
    const doc = await flagModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.FRAUD_FLAG_NOT_FOUND };
    if (
      doc.state !== reg.FRAUD_FLAG_STATE.OPEN &&
      doc.state !== reg.FRAUD_FLAG_STATE.ACKNOWLEDGED
    ) {
      return {
        ok: false,
        reason: reg.REASON.FRAUD_FLAG_NOT_OPEN,
        errors: { state: doc.state },
      };
    }
    doc.state = targetState;
    doc.resolverId = actor.userId;
    doc.resolverRole = actor.role || null;
    doc.resolverNote = note ? String(note).slice(0, 1000) : null;
    doc.resolvedAt = now();
    if (typeof mutator === 'function') mutator(doc);

    try {
      await doc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
      }
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Fraud] transition save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // After dismissal, recompute the affected employee's score so the
    // score row reflects the removed contribution.
    if (
      targetState === reg.FRAUD_FLAG_STATE.DISMISSED &&
      scoreService &&
      typeof scoreService.recomputeScore === 'function' &&
      doc.employeeId
    ) {
      try {
        await scoreService.recomputeScore(doc.employeeId);
      } catch (err) {
        logger.warn('[Fraud] post-dismiss score recompute failed:', err.message);
      }
    }

    return { ok: true, flag: doc.toObject ? doc.toObject() : doc };
  }

  async function _checkOffHours(processedEvent) {
    try {
      const branch = await branchModel.findById(processedEvent.branchId).lean();
      if (!branch || !branch.shiftCalendar) return null;
      const dt =
        processedEvent.capturedAt instanceof Date
          ? processedEvent.capturedAt
          : new Date(processedEvent.capturedAt);
      const key = _yyyyMmDd(dt);
      const entry = branch.shiftCalendar[key];
      if (!entry || !entry.startAt || !entry.endAt) return null;

      const startMs = new Date(entry.startAt).getTime();
      const endMs = new Date(entry.endAt).getTime();
      const tMs = dt.getTime();

      const bufferMs = reg.FRAUD_DEFAULTS.OFF_HOURS_BUFFER_HOURS * 60 * 60_000;
      // Off-hours if BEFORE startMs - buffer OR AFTER endMs + buffer.
      if (tMs < startMs - bufferMs || tMs > endMs + bufferMs) {
        return {
          kind: reg.FRAUD_KIND.OFF_HOURS_ACCESS,
          severity: reg.FRAUD_SEVERITY.MEDIUM,
          scoreImpact: reg.FRAUD_SCORE_IMPACT[reg.FRAUD_SEVERITY.MEDIUM],
          summary: `event ${dt.toISOString()} outside shift [${entry.startAt}, ${entry.endAt}] +/-${reg.FRAUD_DEFAULTS.OFF_HOURS_BUFFER_HOURS}h`,
          detectorContext: {
            detector: 'off-hours',
            shiftStart: entry.startAt,
            shiftEnd: entry.endAt,
            bufferHours: reg.FRAUD_DEFAULTS.OFF_HOURS_BUFFER_HOURS,
          },
        };
      }
      return null;
    } catch (err) {
      logger.warn('[Fraud] off-hours check failed (non-fatal):', err.message);
      return null;
    }
  }

  function _yyyyMmDd(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${day}`;
  }

  return {
    evaluateProcessedEvent,
    scanTemplates,
    scanUnregisteredFaces,
    listFlags,
    getFlag,
    acknowledgeFlag,
    dismissFlag,
    escalateFlag,
    sweepExpiredFlags,
  };
}

module.exports = { createHikvisionFraudDetectionService };
