/**
 * Unit Tests — EmailDigestAggregator.js
 * In-memory digest queue — mock logger + emailManager
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { EmailDigestAggregator } = require('../../services/email/EmailDigestAggregator');

const makeManager = () => ({ send: jest.fn().mockResolvedValue({ success: true }) });

let mgr, agg;
beforeEach(() => {
  mgr = makeManager();
  agg = new EmailDigestAggregator(mgr, { maxItemsPerDigest: 5, dedupeWindowMs: 300000 });
});

// ═══════════════════════════════════════
//  Constructor
// ═══════════════════════════════════════
describe('constructor', () => {
  it('defaults', () => {
    const a = new EmailDigestAggregator(mgr);
    expect(a._maxItems).toBe(50);
    expect(a._dedupeWindowMs).toBe(300000);
    expect(a._queue.size).toBe(0);
  });

  it('custom options', () => {
    expect(agg._maxItems).toBe(5);
  });
});

// ═══════════════════════════════════════
//  add()
// ═══════════════════════════════════════
describe('add', () => {
  it('queues daily item', () => {
    const r = agg.add('u1', 'a@b.com', 'hr', { subject: 'Test', summary: 'Hi' });
    expect(r.queued).toBe(true);
    expect(r.bucket).toBe('daily');
    expect(r.queueId).toBeDefined();
  });

  it('queues weekly item', () => {
    const r = agg.add('u1', 'a@b.com', 'hr', { subject: 'W' }, 'weekly_digest');
    expect(r.queued).toBe(true);
    expect(r.bucket).toBe('weekly');
  });

  it('rejects missing userId', () => {
    const r = agg.add('', 'a@b.com', 'hr', { subject: 'X' });
    expect(r.queued).toBe(false);
    expect(r.reason).toBe('missing_user_or_email');
  });

  it('rejects missing email', () => {
    const r = agg.add('u1', '', 'hr', { subject: 'X' });
    expect(r.queued).toBe(false);
    expect(r.reason).toBe('missing_user_or_email');
  });

  it('deduplicates identical notifications', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'Dup', summary: 'Same' });
    const r2 = agg.add('u1', 'a@b.com', 'hr', { subject: 'Dup', summary: 'Same' });
    expect(r2.queued).toBe(false);
    expect(r2.reason).toBe('deduplicated');
    expect(agg.stats.totalDeduplicated).toBe(1);
  });

  it('allows different subjects for same user', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    const r2 = agg.add('u1', 'a@b.com', 'hr', { subject: 'B' });
    expect(r2.queued).toBe(true);
  });

  it('rejects when digest is full', () => {
    for (let i = 0; i < 5; i++) {
      agg.add('u1', 'a@b.com', 'hr', { subject: `Item ${i}` });
    }
    const r = agg.add('u1', 'a@b.com', 'hr', { subject: 'Overflow' });
    expect(r.queued).toBe(false);
    expect(r.reason).toBe('digest_full');
  });

  it('increments totalQueued', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'X' });
    agg.add('u2', 'b@c.com', 'finance', { subject: 'Y' });
    expect(agg.stats.totalQueued).toBe(2);
  });

  it('creates separate buckets per user', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    agg.add('u2', 'b@c.com', 'hr', { subject: 'B' });
    expect(agg._queue.size).toBe(2);
  });
});

// ═══════════════════════════════════════
//  getPendingCounts
// ═══════════════════════════════════════
describe('getPendingCounts', () => {
  it('empty queue', () => {
    const c = agg.getPendingCounts();
    expect(c.dailyUsers).toBe(0);
    expect(c.dailyItems).toBe(0);
    expect(c.weeklyUsers).toBe(0);
    expect(c.weeklyItems).toBe(0);
  });

  it('counts daily and weekly separately', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'D1' }, 'daily_digest');
    agg.add('u1', 'a@b.com', 'hr', { subject: 'D2' }, 'daily_digest');
    agg.add('u1', 'a@b.com', 'hr', { subject: 'W1' }, 'weekly_digest');
    const c = agg.getPendingCounts();
    expect(c.dailyUsers).toBe(1);
    expect(c.dailyItems).toBe(2);
    expect(c.weeklyUsers).toBe(1);
    expect(c.weeklyItems).toBe(1);
  });

  it('counts multiple users', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    agg.add('u2', 'b@c.com', 'hr', { subject: 'B' });
    const c = agg.getPendingCounts();
    expect(c.dailyUsers).toBe(2);
    expect(c.dailyItems).toBe(2);
  });
});

// ═══════════════════════════════════════
//  flushDaily
// ═══════════════════════════════════════
describe('flushDaily', () => {
  it('sends digest and clears daily queue', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'Test' });
    const r = await agg.flushDaily();
    expect(r.sent).toBe(1);
    expect(r.failed).toBe(0);
    expect(mgr.send).toHaveBeenCalledTimes(1);
    expect(agg.getPendingCounts().dailyItems).toBe(0);
    expect(agg.stats.totalDigestsSent).toBe(1);
    expect(agg.stats.lastDailyFlush).toBeDefined();
  });

  it('reports empty for users with no daily items', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'W' }, 'weekly_digest');
    const r = await agg.flushDaily();
    expect(r.empty).toBe(1);
    expect(r.sent).toBe(0);
  });

  it('handles send failure', async () => {
    mgr.send.mockRejectedValueOnce(new Error('SMTP error'));
    agg.add('u1', 'a@b.com', 'hr', { subject: 'Fail' });
    const r = await agg.flushDaily();
    expect(r.failed).toBe(1);
    expect(r.sent).toBe(0);
  });

  it('does not touch weekly queue', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'W' }, 'weekly_digest');
    await agg.flushDaily();
    expect(agg.getPendingCounts().weeklyItems).toBe(1);
  });
});

// ═══════════════════════════════════════
//  flushWeekly
// ═══════════════════════════════════════
describe('flushWeekly', () => {
  it('sends digest and clears weekly queue', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'W1' }, 'weekly_digest');
    const r = await agg.flushWeekly();
    expect(r.sent).toBe(1);
    expect(mgr.send).toHaveBeenCalledTimes(1);
    expect(agg.getPendingCounts().weeklyItems).toBe(0);
    expect(agg.stats.lastWeeklyFlush).toBeDefined();
  });

  it('handles send failure', async () => {
    mgr.send.mockRejectedValueOnce(new Error('timeout'));
    agg.add('u1', 'a@b.com', 'hr', { subject: 'F' }, 'weekly_digest');
    const r = await agg.flushWeekly();
    expect(r.failed).toBe(1);
  });
});

// ═══════════════════════════════════════
//  _sendDigest (tested indirectly via flush)
// ═══════════════════════════════════════
describe('_sendDigest integration', () => {
  it('groups by category in email', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'HR item' });
    agg.add('u1', 'a@b.com', 'finance', { subject: 'Finance item' });
    await agg.flushDaily();

    const call = mgr.send.mock.calls[0][0];
    expect(call.to).toBe('a@b.com');
    expect(call.html).toContain('HR item');
    expect(call.html).toContain('Finance item');
    expect(call.metadata.itemCount).toBe(2);
    expect(call.metadata.categories).toContain('hr');
    expect(call.metadata.categories).toContain('finance');
  });
});

// ═══════════════════════════════════════
//  _cleanDedupeKeys
// ═══════════════════════════════════════
describe('_cleanDedupeKeys', () => {
  it('clears seenKeys when both queues empty', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    await agg.flushDaily();
    const bucket = agg._queue.get('u1');
    expect(bucket.seenKeys.size).toBe(0);
  });

  it('keeps seenKeys when weekly still has items', async () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'D' }, 'daily_digest');
    agg.add('u1', 'a@b.com', 'hr', { subject: 'W' }, 'weekly_digest');
    await agg.flushDaily();
    const bucket = agg._queue.get('u1');
    expect(bucket.seenKeys.size).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  purge
// ═══════════════════════════════════════
describe('purge', () => {
  it('clears all queues and returns counts', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    agg.add('u2', 'b@c.com', 'hr', { subject: 'B' }, 'weekly_digest');
    const r = agg.purge();
    expect(r.dailyItems).toBe(1);
    expect(r.weeklyItems).toBe(1);
    expect(agg._queue.size).toBe(0);
  });
});

// ═══════════════════════════════════════
//  stats getter
// ═══════════════════════════════════════
describe('stats', () => {
  it('returns combined stats', () => {
    agg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    const s = agg.stats;
    expect(s.totalQueued).toBe(1);
    expect(s.pending.dailyItems).toBe(1);
    expect(s.usersInQueue).toBe(1);
    expect(s.totalDigestsSent).toBe(0);
    expect(s.totalFlushed).toBe(0);
  });
});
