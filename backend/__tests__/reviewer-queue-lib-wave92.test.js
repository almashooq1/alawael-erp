/**
 * reviewer-queue-lib-wave92.test.js — Wave 92.
 *
 * Direct tests for the canonical reviewer-queue library. Replaces 2 of
 * 4 parallel queue-building / dedup implementations across the platform.
 */

'use strict';

const lib = require('../intelligence/reviewer-queue.lib');
const { buildQueueByRouting, dedupBySource } = lib;

describe('reviewer-queue.lib — buildQueueByRouting (Wave 92)', () => {
  test('empty input → empty queues', () => {
    const r = buildQueueByRouting({
      items: [],
      resolveQueueKeys: () => 'role-a',
    });
    expect(r.queues).toEqual([]);
    expect(r.totalItems).toBe(0);
  });

  test('groups items by single returned key', () => {
    const items = [
      { id: 'a', role: 'dpo' },
      { id: 'b', role: 'dpo' },
      { id: 'c', role: 'ciso' },
    ];
    const r = buildQueueByRouting({
      items,
      resolveQueueKeys: item => item.role,
    });
    expect(r.totalItems).toBe(3);
    expect(r.queues).toHaveLength(2);
    const dpoQueue = r.queues.find(q => q.reviewerRole === 'dpo');
    expect(dpoQueue.itemCount).toBe(2);
    expect(dpoQueue.items.map(i => i.id)).toEqual(['a', 'b']);
  });

  test('item routed to MULTIPLE queues lands in each', () => {
    const items = [{ id: 'a', roles: ['dpo', 'ciso', 'branch_manager'] }];
    const r = buildQueueByRouting({
      items,
      resolveQueueKeys: item => item.roles,
    });
    expect(r.queues).toHaveLength(3);
    for (const q of r.queues) {
      expect(q.items).toHaveLength(1);
      expect(q.items[0].id).toBe('a');
    }
    expect(r.totalItems).toBe(1); // input count, not per-queue duplicates
  });

  test('sorts items within each queue via sortBy comparator', () => {
    const items = [
      { id: 'a', risk: 30 },
      { id: 'b', risk: 90 },
      { id: 'c', risk: 60 },
    ];
    const r = buildQueueByRouting({
      items,
      resolveQueueKeys: () => 'dpo',
      sortBy: (a, b) => b.risk - a.risk, // DESC by risk
    });
    expect(r.queues[0].items.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  test('counts isHighPriority entries per queue', () => {
    const items = [
      { id: 'a', risk: 30, role: 'dpo' },
      { id: 'b', risk: 90, role: 'dpo' },
      { id: 'c', risk: 75, role: 'dpo' },
      { id: 'd', risk: 50, role: 'ciso' },
      { id: 'e', risk: 95, role: 'ciso' },
    ];
    const r = buildQueueByRouting({
      items,
      resolveQueueKeys: item => item.role,
      isHighPriority: item => item.risk >= 70,
    });
    const dpo = r.queues.find(q => q.reviewerRole === 'dpo');
    const ciso = r.queues.find(q => q.reviewerRole === 'ciso');
    expect(dpo.highPriorityCount).toBe(2); // b + c
    expect(ciso.highPriorityCount).toBe(1); // e
  });

  test('null/undefined/empty queueKey skipped per item', () => {
    const items = [
      { id: 'a', role: 'dpo' },
      { id: 'b', role: null },
      { id: 'c', role: '' },
      { id: 'd', role: undefined },
    ];
    const r = buildQueueByRouting({
      items,
      resolveQueueKeys: item => item.role,
    });
    expect(r.queues).toHaveLength(1);
    expect(r.queues[0].items).toHaveLength(1);
    expect(r.totalItems).toBe(4); // counts input even if some routed nowhere
  });

  test('keyLabel override changes the queue field name', () => {
    const items = [{ id: 'a', owner: 'u1' }];
    const r = buildQueueByRouting({
      items,
      resolveQueueKeys: item => item.owner,
      keyLabel: 'ownerUserId',
    });
    expect(r.queues[0].ownerUserId).toBe('u1');
    expect(r.queues[0].reviewerRole).toBeUndefined();
  });

  test('throws when resolveQueueKeys is missing', () => {
    expect(() => buildQueueByRouting({ items: [] })).toThrow(
      /resolveQueueKeys.*function is required/
    );
  });

  test('highPriorityCount is 0 when isHighPriority not supplied', () => {
    const r = buildQueueByRouting({
      items: [{ id: 'a' }],
      resolveQueueKeys: () => 'dpo',
    });
    expect(r.queues[0].highPriorityCount).toBe(0);
  });
});

describe('reviewer-queue.lib — dedupBySource (Wave 92)', () => {
  const existing = [
    { ownerUserId: 'u1', sourceType: 'alert', sourceId: 's1', status: 'open' },
    { ownerUserId: 'u1', sourceType: 'alert', sourceId: 's2', status: 'done' },
    { ownerUserId: 'u2', sourceType: 'insight', sourceId: 's1', status: 'open' },
  ];

  test('exact match on (owner, type, source) AND open → duplicate', () => {
    const r = dedupBySource({
      existing,
      candidate: { ownerUserId: 'u1', sourceType: 'alert', sourceId: 's1' },
    });
    expect(r.isDuplicate).toBe(true);
    expect(r.match.sourceId).toBe('s1');
  });

  test('match but existing is CLOSED → not duplicate (caller may re-open)', () => {
    const r = dedupBySource({
      existing,
      candidate: { ownerUserId: 'u1', sourceType: 'alert', sourceId: 's2' },
    });
    expect(r.isDuplicate).toBe(false);
    expect(r.match).toBeNull();
  });

  test('different owner → not duplicate', () => {
    const r = dedupBySource({
      existing,
      candidate: { ownerUserId: 'u-other', sourceType: 'alert', sourceId: 's1' },
    });
    expect(r.isDuplicate).toBe(false);
  });

  test('different sourceType → not duplicate', () => {
    const r = dedupBySource({
      existing,
      candidate: { ownerUserId: 'u1', sourceType: 'insight', sourceId: 's1' },
    });
    expect(r.isDuplicate).toBe(false);
  });

  test('missing candidate fields → not duplicate (caller wants fresh enqueue)', () => {
    expect(
      dedupBySource({ existing, candidate: { ownerUserId: 'u1', sourceType: 'alert' } }).isDuplicate
    ).toBe(false);
    expect(
      dedupBySource({ existing, candidate: { sourceType: 'alert', sourceId: 's1' } }).isDuplicate
    ).toBe(false);
    expect(
      dedupBySource({ existing, candidate: { ownerUserId: 'u1', sourceId: 's1' } }).isDuplicate
    ).toBe(false);
  });

  test('null candidate → not duplicate', () => {
    expect(dedupBySource({ existing, candidate: null }).isDuplicate).toBe(false);
  });

  test('empty existing → not duplicate', () => {
    const r = dedupBySource({
      existing: [],
      candidate: { ownerUserId: 'u1', sourceType: 'alert', sourceId: 's1' },
    });
    expect(r.isDuplicate).toBe(false);
  });

  test('safe String() coercion for owner/source (ObjectId vs string)', () => {
    const oid = { toString: () => 'abc123' };
    const r = dedupBySource({
      existing: [{ ownerUserId: oid, sourceType: 'alert', sourceId: 's1', status: 'open' }],
      candidate: { ownerUserId: 'abc123', sourceType: 'alert', sourceId: 's1' },
    });
    expect(r.isDuplicate).toBe(true);
  });

  test('custom accessor overrides honoured', () => {
    const existing2 = [{ owner: 'u1', kind: 'A', refId: 'x1', state: 'live' }];
    const r = dedupBySource({
      existing: existing2,
      candidate: { owner: 'u1', kind: 'A', refId: 'x1' },
      ownerKey: i => i.owner,
      typeKey: i => i.kind,
      sourceKey: i => i.refId,
      isOpen: i => i.state === 'live',
    });
    expect(r.isDuplicate).toBe(true);
  });
});
