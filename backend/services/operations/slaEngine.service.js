'use strict';

/**
 * slaEngine.service.js — Phase 16 Commit 1 (4.0.66).
 *
 * Unified SLA / OLA engine for the ops layer. Three surfaces:
 *
 *   1. **Activate** — called by upstream services (or by an event
 *      subscriber) when an SLA subject is born. Creates (or returns
 *      idempotently) the SLA document, snapshots the target from
 *      the registry.
 *
 *   2. **Observe state change** — called when the subject's state
 *      changes. Pauses/resumes the clock, marks first-response,
 *      resolves, or cancels. State machine is enforced here rather
 *      than on the model so it's unit-testable without a DB.
 *
 *   3. **Tick** — periodic sweep over active SLAs. For each active
 *      document it re-evaluates: crossed warning? crossed response?
 *      crossed resolution? any escalation step due? Emits the
 *      corresponding event on the bus and records a SLABreach row.
 *
 * Design notes:
 *
 *   • Idempotent everywhere. Calling activate() twice on the same
 *     (subjectType,subjectId,policyId) returns the existing doc;
 *     calling tick() twice with no movement is a no-op.
 *
 *   • Zero tight-coupling to subject collections. Subject state must
 *     be reflected by the *caller* via `observe()` — we never crawl
 *     into HelpDeskTicket/MaintenanceWorkOrder/etc from here.
 *
 *   • Dispatcher pluggable. Tests inject a fake recorder; prod
 *     injects qualityEventBus. Emission is best-effort — a throwing
 *     dispatcher does not corrupt persistence.
 *
 *   • Business-hours support is stubbed (accepts a `businessHours`
 *     provider that can clamp elapsed). Default is always-on.
 */

const SLAModel = require('../../models/operations/SLA.model');
const SLABreachModel = require('../../models/operations/SLABreach.model');
const registry = require('../../config/sla.registry');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const DEFAULT_BATCH_SIZE = 200;

class IllegalTransitionError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
  }
}

function createSlaEngine({
  slaModel = SLAModel,
  breachModel = SLABreachModel,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
  intervalMs = DEFAULT_INTERVAL_MS,
  batchSize = DEFAULT_BATCH_SIZE,
  businessHoursProvider = null, // optional: { isBusiness(date): boolean }
} = {}) {
  // Validate the registry at boot so a bad edit fails loudly.
  registry.validate();

  let timer = null;

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[SLA-Engine] dispatch ${name} failed: ${err.message}`);
    }
  }

  // ── Activation ───────────────────────────────────────────────────

  /**
   * Start (or fetch existing) an SLA clock for a subject.
   *
   * @param {object} args
   * @param {string} args.policyId   — sla.registry id
   * @param {string} args.subjectType
   * @param {*}      args.subjectId  — ObjectId or string
   * @param {string} [args.subjectRef]
   * @param {*}      [args.branchId]
   * @param {Date}   [args.startedAt] — defaults to now()
   * @param {object} [args.metadata]
   */
  async function activate(args) {
    const policy = registry.byId(args.policyId);
    if (!policy) throw new Error(`SLA activate: unknown policyId '${args.policyId}'`);
    if (!args.subjectType || !args.subjectId) {
      throw new Error('SLA activate: subjectType + subjectId required');
    }

    const existing = await slaModel.findOne({
      policyId: policy.id,
      subjectType: args.subjectType,
      subjectId: args.subjectId,
    });
    if (existing) return existing;

    const startedAt = args.startedAt || now();
    const created = await slaModel.create({
      policyId: policy.id,
      module: policy.module,
      severity: policy.severity,
      subjectType: args.subjectType,
      subjectId: args.subjectId,
      subjectRef: args.subjectRef || null,
      branchId: args.branchId || null,
      startedAt,
      targets: {
        responseTargetMinutes: policy.responseTargetMinutes || 0,
        resolutionTargetMinutes: policy.resolutionTargetMinutes,
        warnAtPct: policy.warnAtPct || 80,
        businessHoursOnly: !!policy.businessHoursOnly,
      },
      status: 'active',
      metadata: args.metadata || {},
    });

    await _emit('ops.sla.activated', _publicShape(created));
    return created;
  }

  // ── Observation ──────────────────────────────────────────────────

  /**
   * Called when the subject's lifecycle state changes. The caller
   * tells us what state the subject is in *now*; the engine decides
   * whether that pauses/resumes/resolves/cancels the clock.
   *
   * Recognised eventTypes:
   *   - 'state_changed' — payload.state is the new state
   *   - 'first_response' — records firstResponseAt
   *   - 'resolved' — stops clock as met/breached based on elapsed
   *   - 'cancelled' — closes SLA without outcome
   */
  async function observe({ slaId, eventType, state = null, when = null }) {
    const sla = await slaModel.findById(slaId);
    if (!sla) throw new Error(`SLA observe: SLA ${slaId} not found`);
    if (sla.status === 'met' || sla.status === 'breached' || sla.status === 'cancelled') {
      // Terminal — ignore silently (idempotent).
      return sla;
    }

    const ts = when || now();
    const policy = registry.byId(sla.policyId);
    const pauseStates = policy ? policy.pauseOnStates || [] : [];

    switch (eventType) {
      case 'state_changed': {
        const shouldPause = pauseStates.includes(state);
        const openWindow = sla.pauseWindows.find(w => !w.endedAt);
        if (shouldPause && !openWindow) {
          sla.pauseWindows.push({ startedAt: ts, endedAt: null, reason: state });
          sla.status = 'paused';
        } else if (!shouldPause && openWindow) {
          openWindow.endedAt = ts;
          sla.totalPausedMs += ts.getTime() - openWindow.startedAt.getTime();
          sla.status = 'active';
        }
        break;
      }

      case 'first_response': {
        if (!sla.firstResponseAt) {
          sla.firstResponseAt = ts;
          const responseElapsedMin =
            (ts.getTime() - sla.startedAt.getTime() - (sla.totalPausedMs || 0)) / 60000;
          if (
            sla.targets.responseTargetMinutes > 0 &&
            responseElapsedMin > sla.targets.responseTargetMinutes
          ) {
            sla.responseBreached = true;
            await _recordBreach({
              sla,
              kind: 'response_breached',
              elapsedMinutes: responseElapsedMin,
              targetMinutes: sla.targets.responseTargetMinutes,
              event: 'ops.sla.response_breached',
            });
          }
        }
        break;
      }

      case 'resolved': {
        sla.resolvedAt = ts;
        const elapsedMin = sla.elapsedActiveMs(ts) / 60000;
        const breached = elapsedMin > sla.targets.resolutionTargetMinutes || sla.resolutionBreached;
        sla.status = breached ? 'breached' : 'met';
        if (breached && !sla.resolutionBreached) {
          sla.resolutionBreached = true;
          await _recordBreach({
            sla,
            kind: 'resolution_breached',
            elapsedMinutes: elapsedMin,
            targetMinutes: sla.targets.resolutionTargetMinutes,
            event: policy?.breachEvent || 'ops.sla.breached',
          });
        }
        await _emit(breached ? 'ops.sla.breached' : 'ops.sla.met', _publicShape(sla));
        break;
      }

      case 'cancelled': {
        sla.cancelledAt = ts;
        sla.status = 'cancelled';
        await _emit('ops.sla.cancelled', _publicShape(sla));
        break;
      }

      default:
        throw new IllegalTransitionError(`unknown observe eventType '${eventType}'`);
    }

    sla.lastCheckedAt = ts;
    await sla.save();
    return sla;
  }

  // ── Periodic tick ────────────────────────────────────────────────

  /**
   * Scan active SLAs and fire warning / breach / escalation events
   * as appropriate. Returns a report counting each action.
   * Idempotent — flags on the SLA document prevent double-firing.
   */
  async function tick() {
    const nowDate = now();
    const report = {
      scanned: 0,
      warningsFired: 0,
      resolutionBreaches: 0,
      escalationsFired: 0,
      errors: 0,
    };

    let candidates = [];
    try {
      candidates = await slaModel.find({ status: 'active' }).limit(batchSize);
    } catch (err) {
      logger.warn(`[SLA-Engine] scan failed: ${err.message}`);
      return report;
    }

    for (const sla of candidates) {
      report.scanned++;
      try {
        await _evaluate(sla, nowDate, report);
      } catch (err) {
        report.errors++;
        logger.warn(`[SLA-Engine] eval ${sla._id} failed: ${err.message}`);
      }
    }
    return report;
  }

  async function _evaluate(sla, nowDate, report) {
    const policy = registry.byId(sla.policyId);
    if (!policy) return;

    const elapsedMin = sla.elapsedActiveMs(nowDate) / 60000;
    const target = sla.targets.resolutionTargetMinutes;
    const pct = (elapsedMin / target) * 100;

    let dirty = false;

    // 1. Warning threshold
    if (!sla.warningFired && pct >= sla.targets.warnAtPct && pct < 100) {
      sla.warningFired = true;
      dirty = true;
      report.warningsFired++;
      await _recordBreach({
        sla,
        kind: 'pre_breach',
        elapsedMinutes: elapsedMin,
        targetMinutes: target,
        pctOfTarget: pct,
        event: policy.preBreachEvent || 'ops.sla.pre_breach',
      });
    }

    // 2. Resolution breach
    if (!sla.resolutionBreached && pct >= 100) {
      sla.resolutionBreached = true;
      dirty = true;
      report.resolutionBreaches++;
      await _recordBreach({
        sla,
        kind: 'resolution_breached',
        elapsedMinutes: elapsedMin,
        targetMinutes: target,
        pctOfTarget: pct,
        event: policy.breachEvent || 'ops.sla.breached',
      });
    }

    // 3. Escalation steps
    for (let i = 0; i < (policy.escalation || []).length; i++) {
      const step = policy.escalation[i];
      const already = sla.escalationHistory.find(h => h.stepIndex === i);
      if (already) continue;
      if (elapsedMin >= step.afterMinutes) {
        sla.escalationHistory.push({
          stepIndex: i,
          afterMinutes: step.afterMinutes,
          firedAt: nowDate,
          notifiedRoles: step.notifyRoles || [],
        });
        dirty = true;
        report.escalationsFired++;
        await _recordBreach({
          sla,
          kind: 'escalation_fired',
          elapsedMinutes: elapsedMin,
          targetMinutes: target,
          pctOfTarget: pct,
          escalationStepIndex: i,
          notifiedRoles: step.notifyRoles || [],
          event: 'ops.sla.escalated',
        });
      }
    }

    sla.lastCheckedAt = nowDate;
    if (dirty) await sla.save();
    else await sla.save(); // still touch lastCheckedAt — cheap, helpful for ops
  }

  // ── Breach recording ─────────────────────────────────────────────

  async function _recordBreach({
    sla,
    kind,
    elapsedMinutes = null,
    targetMinutes = null,
    pctOfTarget = null,
    escalationStepIndex = null,
    notifiedRoles = [],
    event = null,
  }) {
    try {
      await breachModel.create({
        slaId: sla._id,
        policyId: sla.policyId,
        module: sla.module,
        severity: sla.severity,
        subjectType: sla.subjectType,
        subjectId: sla.subjectId,
        subjectRef: sla.subjectRef,
        branchId: sla.branchId,
        kind,
        firedAt: new Date(),
        escalationStepIndex,
        notifiedRoles,
        elapsedMinutes,
        targetMinutes,
        pctOfTarget,
        emittedEvent: event,
      });
    } catch (err) {
      logger.warn(`[SLA-Engine] breach record failed: ${err.message}`);
    }

    if (event) {
      await _emit(event, {
        slaId: String(sla._id),
        policyId: sla.policyId,
        module: sla.module,
        severity: sla.severity,
        subjectType: sla.subjectType,
        subjectId: String(sla.subjectId),
        subjectRef: sla.subjectRef,
        branchId: sla.branchId ? String(sla.branchId) : null,
        kind,
        elapsedMinutes,
        targetMinutes,
        pctOfTarget,
        escalationStepIndex,
        notifiedRoles,
      });
    }
  }

  // ── Snapshot for emitting ────────────────────────────────────────

  function _publicShape(sla) {
    return {
      slaId: String(sla._id),
      policyId: sla.policyId,
      module: sla.module,
      severity: sla.severity,
      subjectType: sla.subjectType,
      subjectId: String(sla.subjectId),
      subjectRef: sla.subjectRef,
      branchId: sla.branchId ? String(sla.branchId) : null,
      status: sla.status,
      startedAt: sla.startedAt,
      firstResponseAt: sla.firstResponseAt,
      resolvedAt: sla.resolvedAt,
    };
  }

  // ── Ops queries (for routes + dashboards) ───────────────────────

  async function getStatus({ module: mod = null, severity = null, limit = 50 } = {}) {
    const filter = {};
    if (mod) filter.module = mod;
    if (severity) filter.severity = severity;
    const [active, atRisk, breachedCount] = await Promise.all([
      slaModel.countDocuments({ ...filter, status: 'active' }),
      slaModel.countDocuments({ ...filter, status: 'active', warningFired: true }),
      slaModel.countDocuments({ ...filter, status: 'breached' }),
    ]);
    const recent = await slaModel
      .find({ ...filter, status: 'active' })
      .sort({ startedAt: 1 })
      .limit(limit);
    return {
      active,
      atRisk,
      breached: breachedCount,
      recent: recent.map(r => ({
        ..._publicShape(r),
        pct: r.percentOfTarget(),
        warningFired: r.warningFired,
      })),
    };
  }

  async function listBreaches({
    module: mod = null,
    kind = null,
    sinceHours = 24,
    limit = 100,
  } = {}) {
    const filter = {};
    if (mod) filter.module = mod;
    if (kind) filter.kind = kind;
    if (sinceHours) {
      filter.firedAt = { $gte: new Date(Date.now() - sinceHours * 3600 * 1000) };
    }
    return breachModel.find(filter).sort({ firedAt: -1 }).limit(limit);
  }

  // ── Scheduler driver ─────────────────────────────────────────────

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      tick().catch(err => logger.warn(`[SLA-Engine] tick error: ${err.message}`));
    }, intervalMs);
    if (timer.unref) timer.unref();
    logger.info(`[SLA-Engine] started (interval ${intervalMs}ms)`);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  /**
   * Convenience: observe by (policyId + subjectType + subjectId)
   * instead of slaId. Useful for callers that don't persist the
   * slaId locally (e.g. the legacy Meeting model).
   *
   * Silently no-ops when no matching SLA is found — the caller is
   * not required to know whether the clock was ever activated.
   */
  async function observeBySubject({ policyId, subjectType, subjectId, eventType, state, when }) {
    if (!policyId || !subjectType || !subjectId) {
      throw new Error('observeBySubject: policyId + subjectType + subjectId required');
    }
    const sla = await slaModel.findOne({ policyId, subjectType, subjectId });
    if (!sla) return null;
    return observe({ slaId: sla._id, eventType, state, when });
  }

  return {
    activate,
    observe,
    observeBySubject,
    tick,
    getStatus,
    listBreaches,
    start,
    stop,
    // internals exposed for tests
    _recordBreach,
  };
}

// ── lazy singleton ──────────────────────────────────────────────────

let _default = null;
function getDefault() {
  if (!_default) _default = createSlaEngine();
  return _default;
}

function _replaceDefault(instance) {
  _default = instance;
}

module.exports = {
  createSlaEngine,
  getDefault,
  _replaceDefault,
  IllegalTransitionError,
  DEFAULT_INTERVAL_MS,
  DEFAULT_BATCH_SIZE,
};
