'use strict';

/**
 * reviewer-queue.lib.js — Wave 92 canonical unification (closes U5
 * from the Wave-87 Canonical Domain Unification Architect analysis).
 *
 * Replaces 2 of 4 parallel queue-building / dedup implementations
 * that drifted across the platform:
 *
 *   • intelligence/access-review-scheduler.buildReviewerQueues —
 *     groups attestation tasks by reviewer-role, sorts DESC by
 *     riskScore, counts high-risk entries.
 *   • intelligence/productivity-features.createFollowUp dedup
 *     logic — for non-manual sources, refuse to enqueue when an
 *     OPEN follow-up already exists for (owner, sourceType, sourceId).
 *   • care-plan reviewer assignment (kept; uses Mongoose assignedTo
 *     directly — different shape, not a queue).
 *   • HR inbox routing (kept; reads from a separate model — covered
 *     in a future wave).
 *
 * Design principles:
 *   1. DOMAIN-AGNOSTIC — the lib never knows what an "item" represents.
 *      Callers supply accessor functions that extract routing roles,
 *      sort priority, and dedup keys from their own item shape.
 *   2. PURE — no I/O, no DB calls. The lib just groups + sorts the
 *      arrays you pass in. Persistence stays in the caller.
 *   3. STABLE OUTPUT SHAPE — { queues: [{ key, items, itemCount,
 *      highPriorityCount }], totalItems }. Callers wrap it in their
 *      existing public contract (no breaking changes).
 *   4. DEDUP IS SEPARATE — the dedup helper is a small standalone
 *      function so callers can use it without buying into the whole
 *      grouping flow (productivity.createFollowUp use case).
 *
 * Public API:
 *
 *   buildQueueByRouting({
 *     items,                          // input work items (array)
 *     resolveQueueKeys,               // (item) => string | string[]
 *                                     //   one item may land in multiple
 *                                     //   queues (one per reviewer role)
 *     sortBy = (a, b) => 0,           // priority comparator within queue
 *     isHighPriority = null,          // (item) => boolean (counter)
 *     keyLabel = 'reviewerRole',      // field name in output queues[]
 *   }) → {
 *     queues: [{ [keyLabel]: string, items: T[], itemCount: number,
 *                highPriorityCount: number }],
 *     totalItems: number,
 *   }
 *
 *   dedupBySource({
 *     existing,                       // iterable of existing items
 *     candidate,                      // proposed new item
 *     sourceKey = item => item.sourceId,
 *     ownerKey = item => item.ownerUserId,
 *     typeKey = item => item.sourceType,
 *     isOpen = item => item.status === 'open',
 *   }) → { isDuplicate: boolean, match: existing item | null }
 *     A "duplicate" = same (ownerKey, typeKey, sourceKey) AND the
 *     existing item is still open. Callers decide what to do with
 *     the duplicate (no-op, return existing, escalate).
 */

function _toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function buildQueueByRouting({
  items = [],
  resolveQueueKeys,
  sortBy = () => 0,
  isHighPriority = null,
  keyLabel = 'reviewerRole',
} = {}) {
  if (typeof resolveQueueKeys !== 'function') {
    throw new Error('buildQueueByRouting: resolveQueueKeys(item) function is required');
  }
  const list = Array.isArray(items) ? items : [];
  const byKey = new Map();

  for (const item of list) {
    const keys = _toArray(resolveQueueKeys(item)).filter(
      k => k !== null && k !== undefined && k !== ''
    );
    for (const key of keys) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(item);
    }
  }

  const queues = [];
  for (const [key, bucket] of byKey.entries()) {
    bucket.sort(sortBy);
    const highPriorityCount =
      typeof isHighPriority === 'function' ? bucket.filter(isHighPriority).length : 0;
    queues.push({
      [keyLabel]: key,
      items: bucket,
      itemCount: bucket.length,
      highPriorityCount,
    });
  }

  return {
    queues,
    totalItems: list.length,
  };
}

function dedupBySource({
  existing = [],
  candidate,
  sourceKey = item => item && item.sourceId,
  ownerKey = item => item && item.ownerUserId,
  typeKey = item => item && item.sourceType,
  isOpen = item => item && item.status === 'open',
} = {}) {
  if (!candidate) {
    return { isDuplicate: false, match: null };
  }
  const candOwner = ownerKey(candidate);
  const candType = typeKey(candidate);
  const candSource = sourceKey(candidate);

  // A candidate with no source identity is never a duplicate — the
  // caller is asking us to enqueue a fresh item regardless of history.
  if (candOwner === undefined || candType === undefined || candSource === undefined) {
    return { isDuplicate: false, match: null };
  }
  if (candOwner === null || candType === null || candSource === null) {
    return { isDuplicate: false, match: null };
  }

  for (const item of existing) {
    if (!item) continue;
    if (!isOpen(item)) continue;
    if (String(ownerKey(item)) !== String(candOwner)) continue;
    if (String(typeKey(item)) !== String(candType)) continue;
    if (String(sourceKey(item)) !== String(candSource)) continue;
    return { isDuplicate: true, match: item };
  }
  return { isDuplicate: false, match: null };
}

module.exports = {
  buildQueueByRouting,
  dedupBySource,
};
