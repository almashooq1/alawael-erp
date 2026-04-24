/**
 * pdplObservations.js — Beneficiary-360 Commit 26.
 *
 * Adapter for:
 *
 *   compliance.pdpl.dsar.sla_breach
 *     → openDsarForBeneficiary(beneficiaryId) →
 *       { daysOpen: <number> }
 *     Condition: `daysOpen > 30` → flag raised (CRITICAL, SLA 24h).
 *
 * Registered as `pdplService` in the locator. Reads the new
 * `PdplRequest` collection.
 *
 * Design decisions:
 *
 *   1. **MAX across open requests** — if one request has been
 *      open for 45 days and another for 10, we report 45. The
 *      oldest open DSAR is the compliance risk.
 *
 *   2. **Open = received | in_progress | extended.** Completed
 *      and rejected requests have left the SLA window (rejected
 *      still owes a written reason, but that's a separate
 *      concern).
 *
 *   3. **Zero when no open requests** — the `>` 30 condition
 *      stays clear. No request → no breach, trivially.
 *
 *   4. **`extended` status still counts against the original
 *      30-day window.** PDPL allows a 30-day extension, but we
 *      report days-open for the purposes of oldest-request
 *      visibility. If a site wants to raise the SLA bound for
 *      extended requests, that's a separate flag / a future
 *      windowing tweak.
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/PdplRequest');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createPdplObservations(deps = {}) {
  const Model = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.PdplRequest);
  const openStatuses = deps.openStatuses ||
    (DEFAULT_EXPORTS && DEFAULT_EXPORTS.OPEN_PDPL_STATUSES) || [
      'received',
      'in_progress',
      'extended',
    ];

  if (Model == null) {
    throw new Error('pdplObservations: PdplRequest model is required');
  }

  async function openDsarForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const rows = await Model.find(
      {
        beneficiaryId,
        status: { $in: openStatuses },
      },
      'requestedAt'
    )
      .sort({ requestedAt: 1 })
      .limit(50)
      .lean();

    if (rows.length === 0) return { daysOpen: 0 };

    const daysOpenList = rows.map(r => {
      if (!r.requestedAt) return 0;
      const diffMs = now.getTime() - new Date(r.requestedAt).getTime();
      return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
    });

    return { daysOpen: Math.max(...daysOpenList) };
  }

  return Object.freeze({ openDsarForBeneficiary });
}

module.exports = { createPdplObservations };
