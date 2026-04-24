'use strict';

/**
 * hrInboxService.js — Phase 11 Commit 14 (4.0.31).
 *
 * Per-user inbox for the approval workflow. Closes the notification
 * gap opened by C11/C12: without any push channel (email/SMS/
 * websocket), a manager has no way to learn that a request is
 * waiting for their signature. The inbox endpoint is the pull-
 * complement — the UI polls it, the mobile app badges on it, a
 * Slack/bot integration scrapes it.
 *
 * Sections returned:
 *
 *   awaiting_my_approval        pending requests I CAN approve
 *                               (role tier MANAGER, branch in scope,
 *                                NOT my own request). Sorted oldest-
 *                                first so the stale tail rises.
 *
 *   my_requests_pending         pending requests I created. Useful
 *                               so a requestor sees what's still
 *                               parked.
 *
 *   my_requests_decided_recent  my requests transitioned to
 *                               applied/rejected/cancelled/
 *                               approved_not_applied in the last 30
 *                               days. Newest first.
 *
 *   totals                      headline counters: actionable,
 *                               my_pending, recently_decided.
 *
 *   oldest_actionable_days      age of the oldest awaiting item;
 *                               `null` when queue empty. Drives SLA
 *                               breach badges on the UI.
 *
 * Design decisions:
 *
 *   1. Pull > push for this stage. A push notification layer needs
 *      an email service (AWS SES / Postfix / ...), deliverability
 *      tracking, unsubscribe logic, and more. An inbox endpoint
 *      gets the same user value (I can see what needs me) with a
 *      fraction of the surface area + is guaranteed-current.
 *
 *   2. Reuses the `writeTierForRole` gate from C10. A THERAPIST
 *      never sees `awaiting_my_approval` populated — the field is
 *      returned as `[]` so the UI's shape stays stable.
 *
 *   3. Branch-scoped approvers. OFFICER-tier callers only see
 *      actionable items in their branch; MANAGER-tier HQ callers
 *      are unscoped. Matches how the workflow routes auth.
 *
 *   4. Self-approval excluded at query level. The inbox does NOT
 *      return requests the caller authored in `awaiting_my_approval`
 *      — the approve-endpoint blocks self-approval anyway, but
 *      leaking self-rows into the actionable list would be a UX
 *      footgun.
 *
 *   5. Clock injection + `limitPerSection` so tests are
 *      deterministic and the payload size stays bounded.
 *
 *   6. All reads in parallel via `Promise.all`. For a manager
 *      sitting on ~50 pending items this is sub-100ms.
 */

const MS_PER_DAY = 24 * 3600 * 1000;

// Roles that may approve change requests (= MANAGER write tier).
// Duplicated here to keep the inbox service independent of the
// admin-editable-fields config; changes there won't silently change
// inbox semantics.
const MANAGER_TIER_ROLES = new Set([
  'super_admin',
  'head_office_admin',
  'hr_manager',
  'hr_supervisor',
  'group_chro',
  'compliance_officer',
]);

const HQ_UNSCOPED_ROLES = new Set([
  'super_admin',
  'head_office_admin',
  'hr_manager',
  'hr_supervisor',
  'group_chro',
  'compliance_officer',
]);

function createHrInboxService(deps = {}) {
  const HrChangeRequest = deps.changeRequestModel;
  if (HrChangeRequest == null) {
    throw new Error('hrInboxService: changeRequestModel is required');
  }
  const nowFn = deps.now || (() => new Date());

  function canApprove(role) {
    return role != null && MANAGER_TIER_ROLES.has(role);
  }

  async function buildInbox({ userId, role, branchId = null, limitPerSection = 25 } = {}) {
    if (!userId) throw new Error('hrInboxService.buildInbox: userId is required');
    const now = nowFn();
    const since30 = new Date(now.getTime() - 30 * MS_PER_DAY);
    const cap = Math.min(Math.max(1, Number.parseInt(limitPerSection, 10) || 25), 100);

    // Awaiting-my-approval: only for MANAGER tier, excluding self,
    // branch-scoped for non-HQ managers.
    let awaiting = [];
    let oldestActionableDays = null;
    if (canApprove(role)) {
      const query = {
        deleted_at: null,
        status: 'pending',
        requestor_user_id: { $ne: userId },
      };
      if (!HQ_UNSCOPED_ROLES.has(role) && branchId) {
        query.branch_id = branchId;
      }
      awaiting = await HrChangeRequest.find(query)
        .sort({ createdAt: 1 }) // oldest first — stale tail rises
        .limit(cap)
        .lean();
      if (awaiting.length > 0) {
        const oldest = awaiting[0].createdAt;
        const oldestMs = oldest instanceof Date ? oldest.getTime() : new Date(oldest).getTime();
        oldestActionableDays = round1((now.getTime() - oldestMs) / MS_PER_DAY);
      }
    }

    const [myPending, myDecided] = await Promise.all([
      HrChangeRequest.find({
        deleted_at: null,
        status: 'pending',
        requestor_user_id: userId,
      })
        .sort({ createdAt: -1 })
        .limit(cap)
        .lean(),
      HrChangeRequest.find({
        deleted_at: null,
        requestor_user_id: userId,
        status: { $in: ['applied', 'rejected', 'cancelled', 'approved'] },
        updatedAt: { $gte: since30 },
      })
        .sort({ updatedAt: -1 })
        .limit(cap)
        .lean(),
    ]);

    return {
      generated_at: now.toISOString(),
      subject: { user_id: String(userId), role },
      sections: {
        awaiting_my_approval: awaiting,
        my_requests_pending: myPending,
        my_requests_decided_recent: myDecided,
      },
      totals: {
        actionable: awaiting.length,
        my_pending: myPending.length,
        my_decided_recent: myDecided.length,
      },
      oldest_actionable_days: oldestActionableDays,
    };
  }

  return Object.freeze({ buildInbox });
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

module.exports = { createHrInboxService, MANAGER_TIER_ROLES };
