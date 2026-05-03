/**
 * bulkSessionClaims.js — batch driver for the session→claim bridge.
 *
 * Use case: at month-end, the billing officer needs to create NPHIES
 * claims for every completed-but-not-yet-billed session across a branch
 * for the past N days. Doing this one click per session is unworkable for
 * 200+ sessions — this service runs the bridge per-session and returns a
 * structured report.
 *
 * Key properties:
 *   • Atomic per session — a failure in one session NEVER stops the rest.
 *   • Idempotent — sessions that already have a NphiesClaim row pointing
 *     at them are skipped (and reported as `skipped:already_claimed`).
 *   • Capped — `maxBatch` hard-caps the batch size to keep a single call
 *     bounded in latency. Default 200; absolute max 500.
 *   • Honest reporting — every session in the candidate set lands in
 *     exactly one of `created`, `skipped`, `failed` arrays. The sum of
 *     their lengths equals the candidate count.
 *
 * Contract:
 *   runBulk({ from, to, branchBeneficiaryIds?, dryRun?, maxBatch?, models?, options? })
 *     → { ok, candidateCount, created: [{ sessionId, claimId, claimNumber, total, priceSource, warnings }],
 *         skipped: [{ sessionId, reason }], failed: [{ sessionId, errors }],
 *         dryRun, durationMs }
 */

'use strict';

const mongoose = require('mongoose');

const ABS_MAX_BATCH = 500;
const DEFAULT_MAX_BATCH = 200;

function getModels(models) {
  return {
    TherapySession: models?.TherapySession || mongoose.model('TherapySession'),
    NphiesClaim: models?.NphiesClaim || mongoose.model('NphiesClaim'),
  };
}

async function runBulk({
  from,
  to,
  branchBeneficiaryIds = null,
  dryRun = false,
  maxBatch = DEFAULT_MAX_BATCH,
  models,
  options = {},
} = {}) {
  const startedAt = Date.now();

  // Validate date range — both required, both parseable, from <= to.
  const fromDate = from instanceof Date ? from : new Date(from);
  const toDate = to instanceof Date ? to : new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return errReport('invalid_date_range', startedAt, dryRun);
  }
  if (fromDate > toDate) {
    return errReport('from_after_to', startedAt, dryRun);
  }

  const cap = Math.min(Math.max(1, Number(maxBatch) || DEFAULT_MAX_BATCH), ABS_MAX_BATCH);

  const { TherapySession, NphiesClaim } = getModels(models);

  // Query candidate sessions: COMPLETED, in range, not already billed.
  // We do NOT filter on isBilled here because some flows mark isBilled
  // only on insurance-claim approval, not on draft creation. We use the
  // claim-existence check as the dedup signal instead.
  const sessionFilter = {
    status: 'COMPLETED',
    date: { $gte: fromDate, $lte: toDate },
  };
  if (Array.isArray(branchBeneficiaryIds)) {
    sessionFilter.beneficiary = { $in: branchBeneficiaryIds };
  }

  const candidates = await TherapySession.find(sessionFilter).select('_id').limit(cap).lean();
  const candidateIds = candidates.map(c => c._id);

  // Find already-claimed sessions in one shot (avoid N queries).
  const existing = candidateIds.length
    ? await NphiesClaim.find({ session: { $in: candidateIds } })
        .select('session')
        .lean()
    : [];
  const alreadyClaimed = new Set(existing.map(e => String(e.session)));

  const created = [];
  const skipped = [];
  const failed = [];

  // Lazy require to avoid circular import + so tests can swap the bridge
  // via options.bridge.
  const { buildClaimFromSession } = options.bridge || require('./sessionToClaimBridge');

  for (const id of candidateIds) {
    const sid = String(id);
    if (alreadyClaimed.has(sid)) {
      skipped.push({ sessionId: sid, reason: 'already_claimed' });
      continue;
    }

    try {
      const result = await buildClaimFromSession(sid, {
        models,
        dryRun,
        diagnosis: options.diagnosis,
      });

      if (!result.ok) {
        // Treat all errors as `skipped` rather than `failed` — they're
        // expected business-rule rejections (no insurance, expired
        // coverage, etc.) and should not raise an alert. Hard
        // exceptions go through the catch block below as `failed`.
        skipped.push({
          sessionId: sid,
          reason: result.errors?.[0] || 'unknown',
          errors: result.errors,
          warnings: result.warnings,
        });
        continue;
      }

      created.push({
        sessionId: sid,
        claimId: dryRun ? null : String(result.claim._id),
        claimNumber: result.claim.claimNumber,
        total: result.claim.totalAmount,
        priceSource: result.priceSource || null,
        warnings: result.warnings || [],
      });
    } catch (err) {
      failed.push({ sessionId: sid, error: err.message || String(err) });
    }
  }

  return {
    ok: true,
    candidateCount: candidateIds.length,
    created,
    skipped,
    failed,
    dryRun,
    durationMs: Date.now() - startedAt,
  };
}

function errReport(reason, startedAt, dryRun) {
  return {
    ok: false,
    reason,
    candidateCount: 0,
    created: [],
    skipped: [],
    failed: [],
    dryRun: !!dryRun,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = {
  runBulk,
  ABS_MAX_BATCH,
  DEFAULT_MAX_BATCH,
};
