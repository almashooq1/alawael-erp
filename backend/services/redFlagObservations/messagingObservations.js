/**
 * messagingObservations.js — Beneficiary-360 Commit 20.
 *
 * Adapter for:
 *
 *   family.message.unanswered.48h
 *     → openThreadsForBeneficiary(beneficiaryId) →
 *       { maxHoursOpen: <number> }
 *
 * Registered as `messagingService` in the locator. Reads `PortalMessage`
 * (the existing guardian-portal inbox model).
 *
 * Design decisions:
 *
 *   1. **"Open" = guardian-initiated, no STAFF reply.** The flag
 *      measures staff responsiveness, not guardian activity. A
 *      follow-up message from the same guardian (reply to own
 *      thread) does NOT close the loop. Only a reply with
 *      `fromModel === 'User'` (staff) counts.
 *
 *   2. **Tied to a specific beneficiary via `relatedBeneficiaryId`.**
 *      Off-topic messages a guardian sends without tagging a
 *      beneficiary are not evaluated here — they belong to a
 *      separate admin-inbox alert, not this beneficiary-scoped
 *      flag.
 *
 *   3. **Archived threads are out.** A thread the staff archives
 *      (admin action) stops counting — this is the explicit
 *      "we're done with this" signal.
 *
 *   4. **`maxHoursOpen` across all open threads.** One slow thread
 *      is enough to trip the flag (> 48h); reporting the MAX
 *      surfaces the oldest unanswered message.
 *
 *   5. **No beneficiary → no open threads → 0 hours.** Zero means
 *      "no problem", never fires the `> 48` condition.
 *
 *   6. **Two-query strategy instead of aggregation pipeline.** The
 *      typical per-beneficiary inbox is small (≤ a few dozen
 *      messages); two indexed `find`s are simpler to reason about
 *      and test than a `$lookup` pipeline. If volumes change,
 *      swap in the aggregate without changing the interface.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/PortalMessage');

const MS_PER_HOUR = 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createMessagingObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('messagingObservations: PortalMessage model is required');
  }

  async function openThreadsForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();

    // 1. Top-level guardian-originated messages tied to this
    //    beneficiary, not archived, not themselves a reply.
    const threads = await Model.find(
      {
        relatedBeneficiaryId: beneficiaryId,
        fromModel: 'Guardian',
        isArchived: { $ne: true },
        isReply: { $ne: true },
      },
      '_id createdAt replies'
    ).lean();

    if (threads.length === 0) return { maxHoursOpen: 0 };

    // 2. For each thread, check if ANY reply has `fromModel: 'User'`
    //    (staff reply). Collect all candidate reply ids in one query.
    const allReplyIds = [];
    for (const t of threads) {
      if (Array.isArray(t.replies)) allReplyIds.push(...t.replies);
    }

    const staffReplyIdSet = new Set();
    if (allReplyIds.length > 0) {
      const staffReplies = await Model.find(
        { _id: { $in: allReplyIds }, fromModel: 'User' },
        '_id'
      ).lean();
      for (const r of staffReplies) staffReplyIdSet.add(String(r._id));
    }

    // 3. Unanswered = no reply in the staff set.
    const unanswered = threads.filter(
      t => !Array.isArray(t.replies) || t.replies.every(rId => !staffReplyIdSet.has(String(rId)))
    );
    if (unanswered.length === 0) return { maxHoursOpen: 0 };

    const hours = unanswered.map(t => {
      if (!t.createdAt) return 0;
      return Math.max(
        0,
        Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / MS_PER_HOUR)
      );
    });
    return { maxHoursOpen: Math.max(...hours) };
  }

  return Object.freeze({ openThreadsForBeneficiary });
}

module.exports = { createMessagingObservations };
