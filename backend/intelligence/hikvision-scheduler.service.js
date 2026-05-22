'use strict';

/**
 * hikvision-scheduler.service.js — Wave 108.
 *
 * Unifies all cron-able Hikvision operations behind a single registry +
 * locking + run-history model. Replaces ad-hoc "wire up node-cron in
 * app.js per service" with a typed, observable, manually-overridable
 * scheduler.
 *
 * Architecture:
 *
 *   1. JobRegistry  — pure data structure mapping JOB_ID → handler.
 *      Built once at boot from the available services (fraudDetection,
 *      fraudScore, syncWorker, eventParser, healthMonitor). A job is
 *      "available" iff its source service was wired.
 *
 *   2. runJob({ jobId, trigger, initiator, args }) — single entry
 *      point. Performs the lock-or-skip dance, invokes the handler,
 *      and persists a HikvisionJobRun row. Always returns a result
 *      envelope `{ ok, jobId, run? }`; never throws — handler errors
 *      become failed runs.
 *
 *   3. listJobs() — registry passthrough + latest run per job from
 *      the model. Drives the status UI.
 *
 *   4. listRuns({ jobId, limit }) — recent run history.
 *
 *   5. _pruneHistory(jobId) — internal best-effort retention sweep
 *      after every successful run; keeps HISTORY_RETAIN_RUNS rows.
 *
 * Locking strategy:
 *   - One running job per (jobId) at a time. Check is "latest run for
 *     this jobId is not in {pending, running}" — if it IS running,
 *     refuse the new run UNLESS the running row is older than
 *     opts.lockTimeoutMs (force-release; the previous process likely
 *     crashed).
 *   - Lock is taken by inserting the new run with status=running
 *     BEFORE invoking the handler. If the handler throws, the row is
 *     transitioned to failed.
 *
 * Per-job handler contract:
 *   async (args) => any   (result payload persisted on the run row)
 *
 * Failure handling:
 *   Handler exceptions are caught here and surfaced as:
 *     { ok: false, error: { message, stack, code } }
 *   The Promise still resolves — callers must check the envelope.
 */

const reg = require('./hikvision.registry');
const { makeSystemActor, SYSTEM_USER_IDS, SYSTEM_ROLES } = require('./system-actor.lib');

function createHikvisionScheduler({
  // Pluggable services — each one resolved by app.js at boot. Missing
  // services result in JOB_HANDLER_UNAVAILABLE when the corresponding
  // job is invoked.
  syncWorker = null,
  fraudDetection = null,
  fraudScore = null,
  eventParser = null,
  healthMonitor = null,
  // Wave 114 — anomaly scan job needs both detector + history writer.
  anomalyDetector = null,
  anomalyHistory = null,

  // Persistence
  runModel = null, // HikvisionJobRun

  // Knobs
  logger = console,
  now = () => new Date(),
  lockTimeoutMs = reg.JOB_DEFAULTS.LOCK_TIMEOUT_MS,
  historyRetainRuns = reg.JOB_DEFAULTS.HISTORY_RETAIN_RUNS,
} = {}) {
  if (!runModel) {
    throw new Error('hikvision-scheduler: runModel (HikvisionJobRun) is required');
  }

  // ─── Wave 275q — System actor injection ──────────────────────
  // Every handler invocation generates a fresh system actor (so
  // mfaAssertedAt is "now" each tick) and merges it into the args
  // object. Services with `enforceMfa: true` (W275/b/c/d/f and
  // future W275q+ adopters) see a tier-3 fresh actor and pass the
  // checkMfaTier guard. Services without enforceMfa ignore the
  // injected field (backwards-compat).
  function _systemActor(role) {
    return makeSystemActor({
      id: SYSTEM_USER_IDS.SCHEDULER,
      role: role || SYSTEM_ROLES.SCHEDULER,
      now,
    });
  }

  // ─── Job registry — id → { handler, available } ───────────────
  // Handlers wrap the existing service entry points so the scheduler
  // never has to know about Hikvision domain shapes. Each handler
  // returns its raw result; the scheduler persists it verbatim.

  const jobs = Object.freeze({
    [reg.JOB_ID.SYNC_ALL]: {
      id: reg.JOB_ID.SYNC_ALL,
      labelAr: 'مزامنة كل مكتبات الوجوه مع الأجهزة',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.SYNC_ALL],
      available: !!syncWorker,
      handler: async args => {
        if (!syncWorker) throw new Error('syncWorker not wired');
        // W275r — pass system actor so sync-worker chain
        // (syncAll → syncLibrary → syncLibraryToDevice → confirmEnrollment)
        // passes service-layer MFA guards.
        return syncWorker.syncAll({ ...(args || {}), actor: _systemActor() });
      },
    },
    [reg.JOB_ID.DRIFT_DETECT_ALL]: {
      id: reg.JOB_ID.DRIFT_DETECT_ALL,
      labelAr: 'كشف انحراف المكتبات (read-only)',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.DRIFT_DETECT_ALL],
      available: !!syncWorker,
      handler: async () => {
        if (!syncWorker) throw new Error('syncWorker not wired');
        return syncWorker.detectDriftAll();
      },
    },
    [reg.JOB_ID.FRAUD_SCAN_TEMPLATES]: {
      id: reg.JOB_ID.FRAUD_SCAN_TEMPLATES,
      labelAr: 'فحص أنماط الاحتيال على القوالب',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.FRAUD_SCAN_TEMPLATES],
      available: !!fraudDetection,
      handler: async args => {
        if (!fraudDetection) throw new Error('fraudDetection not wired');
        return fraudDetection.scanTemplates(args || {});
      },
    },
    [reg.JOB_ID.FRAUD_SCAN_UNREGISTERED]: {
      id: reg.JOB_ID.FRAUD_SCAN_UNREGISTERED,
      labelAr: 'فحص الوجوه غير المُسجَّلة المتكررة',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.FRAUD_SCAN_UNREGISTERED],
      available: !!fraudDetection,
      handler: async args => {
        if (!fraudDetection) throw new Error('fraudDetection not wired');
        return fraudDetection.scanUnregistered(args || {});
      },
    },
    [reg.JOB_ID.FRAUD_SWEEP_EXPIRED]: {
      id: reg.JOB_ID.FRAUD_SWEEP_EXPIRED,
      labelAr: 'تنظيف علامات الاحتيال المنتهية',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.FRAUD_SWEEP_EXPIRED],
      available: !!fraudDetection,
      handler: async () => {
        if (!fraudDetection) throw new Error('fraudDetection not wired');
        return fraudDetection.sweepExpired();
      },
    },
    [reg.JOB_ID.FRAUD_DECAY_ALL]: {
      id: reg.JOB_ID.FRAUD_DECAY_ALL,
      labelAr: 'إعادة احتساب درجات الاحتيال (مع التحلُّل)',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.FRAUD_DECAY_ALL],
      available: !!fraudScore,
      handler: async () => {
        if (!fraudScore) throw new Error('fraudScore not wired');
        // Wave 275q — pass system actor so fraud-score's W275q
        // service-layer MFA guard accepts the cron-driven call.
        return fraudScore.decayAllScores({ actor: _systemActor() });
      },
    },
    [reg.JOB_ID.RAW_EVENT_PARSE]: {
      id: reg.JOB_ID.RAW_EVENT_PARSE,
      labelAr: 'تحليل الأحداث الخام المعلَّقة',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.RAW_EVENT_PARSE],
      available: !!eventParser,
      handler: async args => {
        if (!eventParser) throw new Error('eventParser not wired');
        return eventParser.drainPending(args || {});
      },
    },
    [reg.JOB_ID.HEALTH_SWEEP]: {
      id: reg.JOB_ID.HEALTH_SWEEP,
      labelAr: 'مسح صحة الأجهزة',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.HEALTH_SWEEP],
      available: !!healthMonitor,
      handler: async () => {
        if (!healthMonitor) throw new Error('healthMonitor not wired');
        return healthMonitor.sweepUnresponsive();
      },
    },
    // Wave 114 — periodic anomaly detection + history record.
    // Available iff BOTH the detector AND the history writer are
    // wired; either alone is half a job.
    [reg.JOB_ID.ANOMALY_SCAN]: {
      id: reg.JOB_ID.ANOMALY_SCAN,
      labelAr: 'فحص الانحرافات + تسجيل التاريخ',
      defaultCron: reg.JOB_CRON_DEFAULTS[reg.JOB_ID.ANOMALY_SCAN],
      available: !!(anomalyDetector && anomalyHistory),
      handler: async () => {
        if (!anomalyDetector) throw new Error('anomalyDetector not wired');
        if (!anomalyHistory) throw new Error('anomalyHistory not wired');
        const startedAt = Date.now();
        // skipCache so we ALWAYS see fresh signal at cron time.
        const detection = await anomalyDetector.detect({ skipCache: true });
        const durationMs = Date.now() - startedAt;
        const persisted = await anomalyHistory.recordSnapshot({
          detectionResult: detection,
          source: 'scheduler',
          durationMs,
        });
        // Surface the persistence outcome on the job run row so
        // operators can see "detect ok but save failed" cases.
        return {
          detected: detection.summary || { total: 0 },
          persisted: persisted.ok,
          persistReason: persisted.ok ? null : persisted.reason || null,
          durationMs,
        };
      },
    },
  });

  // ─── Locking helpers ─────────────────────────────────────────

  async function _findLatestRun(jobId) {
    let q = runModel.find({ jobId }).sort({ startedAt: -1 }).limit(1);
    if (typeof q.lean === 'function') q = q.lean();
    const rows = await q;
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  function _isLockActive(latest, atDate) {
    if (!latest) return false;
    if (latest.status !== reg.JOB_STATUS.RUNNING) return false;
    const startedAt = new Date(latest.startedAt).getTime();
    if (Number.isNaN(startedAt)) return false;
    const ageMs = atDate.getTime() - startedAt;
    return ageMs < lockTimeoutMs;
  }

  async function _writeRun(payload) {
    const doc = new runModel(payload);
    await doc.validate();
    await doc.save();
    return doc.toObject ? doc.toObject() : doc;
  }

  async function _updateRun(runId, patch) {
    await runModel.updateOne({ _id: runId }, { $set: patch });
  }

  async function _pruneHistory(jobId) {
    try {
      let q = runModel.find({ jobId }).sort({ startedAt: -1 });
      if (typeof q.lean === 'function') q = q.lean();
      const rows = await q;
      const all = Array.isArray(rows) ? rows : [];
      if (all.length <= historyRetainRuns) return 0;
      const stale = all.slice(historyRetainRuns).map(r => r._id);
      if (typeof runModel.deleteMany === 'function') {
        await runModel.deleteMany({ _id: { $in: stale } });
      }
      return stale.length;
    } catch (err) {
      logger.warn(`[hikvision-scheduler] prune failed for ${jobId}: ${err.message}`);
      return 0;
    }
  }

  // ─── Public API ─────────────────────────────────────────────

  function describeJob(jobId) {
    const j = jobs[jobId];
    if (!j) return null;
    return {
      id: j.id,
      labelAr: j.labelAr,
      defaultCron: j.defaultCron,
      available: j.available,
    };
  }

  function listJobIds() {
    return Object.keys(jobs);
  }

  async function listJobs() {
    const items = [];
    for (const id of listJobIds()) {
      const meta = describeJob(id);
      const latest = await _findLatestRun(id);
      items.push({
        ...meta,
        latest: latest
          ? {
              status: latest.status,
              trigger: latest.trigger,
              startedAt: latest.startedAt,
              finishedAt: latest.finishedAt,
              durationMs: latest.durationMs,
              reason: latest.reason,
              error: latest.error || null,
            }
          : null,
      });
    }
    return { items };
  }

  async function listRuns({ jobId, limit = 20 } = {}) {
    if (jobId && !jobs[jobId]) {
      return { ok: false, reason: reg.REASON.JOB_NOT_FOUND };
    }
    const cappedLimit = Math.max(1, Math.min(200, Number(limit) || 20));
    const filter = jobId ? { jobId } : {};
    let q = runModel.find(filter).sort({ startedAt: -1 }).limit(cappedLimit);
    if (typeof q.lean === 'function') q = q.lean();
    const rows = await q;
    return { ok: true, items: Array.isArray(rows) ? rows : [] };
  }

  async function runJob({
    jobId,
    trigger = reg.JOB_TRIGGER.MANUAL,
    initiator = 'manual',
    args = {},
  } = {}) {
    const job = jobs[jobId];
    if (!job) {
      return { ok: false, jobId: jobId || null, reason: reg.REASON.JOB_NOT_FOUND };
    }
    if (!job.available) {
      // Persist a skipped run so the UI can show the gap.
      const run = await _writeRun({
        jobId,
        trigger,
        initiator,
        status: reg.JOB_STATUS.SKIPPED,
        startedAt: now(),
        finishedAt: now(),
        reason: reg.REASON.JOB_HANDLER_UNAVAILABLE,
        args,
        result: null,
      });
      return { ok: false, jobId, reason: reg.REASON.JOB_HANDLER_UNAVAILABLE, run };
    }

    // Lock check
    const latest = await _findLatestRun(jobId);
    if (_isLockActive(latest, now())) {
      const run = await _writeRun({
        jobId,
        trigger,
        initiator,
        status: reg.JOB_STATUS.SKIPPED,
        startedAt: now(),
        finishedAt: now(),
        reason: reg.REASON.JOB_ALREADY_RUNNING,
        args,
        result: null,
      });
      return { ok: false, jobId, reason: reg.REASON.JOB_ALREADY_RUNNING, run };
    }

    // Take the lock — write the running row first.
    const startedAt = now();
    const lockRun = await _writeRun({
      jobId,
      trigger,
      initiator,
      status: reg.JOB_STATUS.RUNNING,
      startedAt,
      finishedAt: null,
      args,
      result: null,
    });

    let handlerResult = null;
    let handlerError = null;
    try {
      handlerResult = await job.handler(args || {});
    } catch (err) {
      handlerError = err;
    }

    const finishedAt = now();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    if (handlerError) {
      const errPayload = {
        message: String(handlerError.message || 'unknown error').slice(0, 1000),
        stack: handlerError.stack ? String(handlerError.stack).slice(0, 4000) : null,
        code: handlerError.code || reg.REASON.JOB_HANDLER_THREW,
      };
      await _updateRun(lockRun._id, {
        status: reg.JOB_STATUS.FAILED,
        finishedAt,
        durationMs,
        error: errPayload,
      });
      logger.warn(`[hikvision-scheduler] ${jobId} FAILED: ${errPayload.message}`);
      return {
        ok: false,
        jobId,
        reason: reg.REASON.JOB_HANDLER_THREW,
        run: {
          ...lockRun,
          status: reg.JOB_STATUS.FAILED,
          finishedAt,
          durationMs,
          error: errPayload,
        },
      };
    }

    await _updateRun(lockRun._id, {
      status: reg.JOB_STATUS.SUCCEEDED,
      finishedAt,
      durationMs,
      result: handlerResult,
    });
    // Best-effort retention sweep — never block the response on this.
    void _pruneHistory(jobId);

    logger.info(`[hikvision-scheduler] ${jobId} SUCCEEDED in ${durationMs}ms`);
    return {
      ok: true,
      jobId,
      run: {
        ...lockRun,
        status: reg.JOB_STATUS.SUCCEEDED,
        finishedAt,
        durationMs,
        result: handlerResult,
      },
    };
  }

  return {
    listJobIds,
    describeJob,
    listJobs,
    listRuns,
    runJob,
    _pruneHistory, // exposed for tests only
  };
}

module.exports = { createHikvisionScheduler };
