/**
 * dlq-replay-scheduler.test.js — replay worker against the in-memory DLQ.
 *
 * Scenarios:
 *   • tick() resolves parked entries when the adapter succeeds
 *   • tick() re-parks + increments replayCount when the adapter throws
 *   • entries older than minAgeMs are skipped until they age in
 *   • entries with replayCount >= maxReplayCount are skipped entirely
 *   • perEntryTimeoutMs aborts stuck adapters without blocking the batch
 *   • unknown integrations (no adapter registered) are counted as skipped
 *   • overlapping ticks don't pile up — the second call is a no-op while the
 *     first is still running
 */

'use strict';

const dlq = require('../infrastructure/deadLetterQueue');
const { createDlqReplayScheduler } = require('../startup/dlqReplayScheduler');

describe('DLQ replay scheduler', () => {
  beforeEach(() => {
    dlq.setStore(new dlq.InMemoryDeadLetterStore());
  });

  it('resolves parked entries when the adapter succeeds', async () => {
    await dlq.park({ integration: 'zatca', operation: 'post', lastError: 'timeout' });
    await dlq.park({ integration: 'zatca', operation: 'post', lastError: 'timeout' });

    const adapters = new Map();
    adapters.set('zatca', jest.fn().mockResolvedValue({ uuid: 'ok' }));
    const worker = createDlqReplayScheduler({ adapters, minAgeMs: 0 });
    const stats = await worker.tick();

    expect(stats.scanned).toBe(2);
    expect(stats.resolved).toBe(2);
    const { rows } = await dlq.list({ status: 'resolved' });
    expect(rows).toHaveLength(2);
  });

  it('re-parks and increments replayCount on failure', async () => {
    const parked = await dlq.park({ integration: 'madaa', lastError: 'sftp' });

    const adapters = new Map();
    adapters.set('madaa', jest.fn().mockRejectedValue(new Error('still down')));
    const worker = createDlqReplayScheduler({ adapters, minAgeMs: 0 });
    await worker.tick();

    const after = await dlq.get(parked.id);
    expect(after.status).toBe('parked');
    expect(after.replayCount).toBe(1);
    expect(after.lastError.message).toBe('still down');
  });

  it('skips entries younger than minAgeMs', async () => {
    await dlq.park({ integration: 'zatca', lastError: 't' });
    const adapters = new Map();
    adapters.set('zatca', jest.fn().mockResolvedValue({ ok: true }));
    // minAgeMs is large — the fresh entry is ineligible
    const worker = createDlqReplayScheduler({ adapters, minAgeMs: 60 * 1000 });

    const stats = await worker.tick();
    expect(stats.replayed).toBe(0);
    expect(stats.resolved).toBe(0);
  });

  it('skips entries past the maxReplayCount threshold', async () => {
    const parked = await dlq.park({ integration: 'zatca', lastError: 't' });
    await dlq.getStore().updateStatus(parked.id, 'parked', { replayCount: 5 });

    const adapters = new Map();
    adapters.set('zatca', jest.fn().mockResolvedValue({ ok: true }));
    const worker = createDlqReplayScheduler({ adapters, minAgeMs: 0, maxReplayCount: 5 });
    const stats = await worker.tick();
    expect(stats.skipped).toBe(1);
    expect(stats.replayed).toBe(0);
  });

  it('skips entries whose integration has no registered adapter', async () => {
    await dlq.park({ integration: 'mystery', lastError: 't' });
    const worker = createDlqReplayScheduler({ adapters: new Map(), minAgeMs: 0 });
    const stats = await worker.tick();
    expect(stats.skipped).toBe(1);
    expect(stats.replayed).toBe(0);
  });

  it('enforces perEntryTimeoutMs on stuck adapters', async () => {
    await dlq.park({ integration: 'nafath', lastError: 't' });
    const adapters = new Map();
    adapters.set('nafath', () => new Promise(() => {})); // never resolves
    const worker = createDlqReplayScheduler({
      adapters,
      minAgeMs: 0,
      perEntryTimeoutMs: 50,
    });
    const stats = await worker.tick();
    expect(stats.errors).toBe(1);
  });

  it('overlap guard prevents concurrent ticks', async () => {
    await dlq.park({ integration: 'zatca', lastError: 't' });
    let resolvePromise;
    const adapterBlock = new Promise(r => {
      resolvePromise = r;
    });
    const adapters = new Map();
    adapters.set(
      'zatca',
      jest.fn().mockImplementation(async () => {
        await adapterBlock;
        return { ok: true };
      })
    );
    const worker = createDlqReplayScheduler({ adapters, minAgeMs: 0 });

    const first = worker.tick();
    const second = worker.tick(); // should return immediately (no-op)
    const secondResolved = await second;
    expect(secondResolved).toBeUndefined();

    resolvePromise();
    await first;
  });
});
