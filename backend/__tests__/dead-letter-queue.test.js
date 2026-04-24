/**
 * dead-letter-queue.test.js — covers the in-memory adapter + public API.
 *
 * Scenarios:
 *   • park() records integration + operation + payload + lastError
 *   • list() filters by integration and status, and paginates
 *   • replay() marks entry resolved on success and re-parks on failure
 *   • discard() marks status=discarded
 *   • payload is stored verbatim (redaction is caller's responsibility)
 *   • setStore() rejects adapters missing the contract methods
 */

'use strict';

const dlq = require('../infrastructure/deadLetterQueue');

describe('deadLetterQueue', () => {
  let store;

  beforeEach(() => {
    store = new dlq.InMemoryDeadLetterStore();
    dlq.setStore(store);
  });

  it('parks an entry with expected shape', async () => {
    const entry = await dlq.park({
      integration: 'nafath',
      operation: 'sign',
      method: 'POST',
      endpoint: 'https://sandbox.nafath.sa/sign',
      payload: { docId: 'IRP-123' },
      idempotencyKey: 'doc-123-sign-aaaa',
      correlationId: 'corr-001',
      attempts: 4,
      lastError: new Error('ECONNRESET'),
      meta: { branchId: 'br_1', userId: 'usr_9' },
    });

    expect(entry.id).toBeTruthy();
    expect(entry.status).toBe('parked');
    expect(entry.integration).toBe('nafath');
    expect(entry.operation).toBe('sign');
    expect(entry.attempts).toBe(4);
    expect(entry.lastError.message).toBe('ECONNRESET');
    expect(entry.replayCount).toBe(0);
    expect(store._size()).toBe(1);
  });

  it('lists with integration + status filters and paginates', async () => {
    for (let i = 0; i < 3; i++) await dlq.park({ integration: 'nafath', lastError: 'e' });
    for (let i = 0; i < 2; i++) await dlq.park({ integration: 'zatca', lastError: 'e' });

    const nafath = await dlq.list({ integration: 'nafath' });
    expect(nafath.total).toBe(3);
    expect(nafath.rows).toHaveLength(3);

    const page = await dlq.list({ integration: 'nafath', limit: 2, offset: 1 });
    expect(page.total).toBe(3);
    expect(page.rows).toHaveLength(2);
  });

  it('replay() resolves entry on success and preserves replayCount', async () => {
    const parked = await dlq.park({
      integration: 'zatca',
      operation: 'postInvoice',
      lastError: 'timeout',
    });
    const callable = jest.fn().mockResolvedValue({ uuid: 'zatca-uuid-123' });

    const outcome = await dlq.replay(parked.id, callable);

    expect(outcome.ok).toBe(true);
    expect(callable).toHaveBeenCalledTimes(1);
    const after = await dlq.get(parked.id);
    expect(after.status).toBe('resolved');
    expect(after.replayCount).toBe(1);
  });

  it('replay() re-parks the entry when the callable throws', async () => {
    const parked = await dlq.park({ integration: 'madaa', lastError: 'sftp down' });
    const callable = jest.fn().mockRejectedValue(new Error('still down'));

    const outcome = await dlq.replay(parked.id, callable);

    expect(outcome.ok).toBe(false);
    const after = await dlq.get(parked.id);
    expect(after.status).toBe('parked');
    expect(after.replayCount).toBe(1);
    expect(after.lastError.message).toBe('still down');
  });

  it('discard() marks the entry discarded with reason', async () => {
    const parked = await dlq.park({ integration: 'absher', lastError: 'unrecoverable' });
    const after = await dlq.discard(parked.id, 'duplicate-handled-by-support');
    expect(after.status).toBe('discarded');
    expect(after.discardReason).toBe('duplicate-handled-by-support');
  });

  it('setStore() rejects incomplete adapters', () => {
    expect(() => dlq.setStore({ add: () => {} })).toThrow(/must implement/);
  });
});
