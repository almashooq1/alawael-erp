/**
 * break-glass-digest-script.test.js — Phase-7 Commit 5.
 *
 * Tests the pure `buildReviewPlan(sessions, now, abuseThreshold)`
 * classifier that the digest CLI wraps. No DB, no I/O.
 *
 * Five classifications the planner decides between:
 *   • live            — active window + co-signed (OK)
 *   • awaitingCoSign  — active, window-open, not signed (routine)
 *   • coSignOverdue   — either past co-sign window or session
 *                        ended without ever being signed (alarm)
 *   • unreviewed      — session ended, co-signed, but no
 *                        reviewedAt (compliance follow-up)
 *   • abuseRisk       — per-user count ≥ threshold
 */

'use strict';

const { buildReviewPlan, ABUSE_THRESHOLD } = require('../scripts/break-glass-digest');

const now = new Date('2026-04-22T12:00:00Z');

function mk({
  id = 'bg-1',
  userId = 'u-1',
  scope = 'clinical_read',
  branchId = 'br-1',
  activatedAt,
  expiresAt,
  coSignRequiredBy,
  coSignedAt = null,
  closedAt = null,
  reviewedAt = null,
  purpose = 'Emergency clinical read — primary therapist unreachable for pediatric session',
} = {}) {
  const act = activatedAt || new Date(now.getTime() - 3600_000);
  const exp = expiresAt || new Date(act.getTime() + 4 * 3600_000);
  const coReq = coSignRequiredBy || new Date(act.getTime() + 24 * 3600_000);
  return {
    _id: id,
    userId,
    scope,
    branchId,
    activatedAt: act,
    expiresAt: exp,
    coSignRequiredBy: coReq,
    coSignedAt,
    closedAt,
    reviewedAt,
    purpose,
  };
}

describe('buildReviewPlan — classification', () => {
  it('empty input returns all-empty buckets + zero stats', () => {
    const plan = buildReviewPlan([], now);
    expect(plan.live).toEqual([]);
    expect(plan.awaitingCoSign).toEqual([]);
    expect(plan.coSignOverdue).toEqual([]);
    expect(plan.unreviewed).toEqual([]);
    expect(plan.abuseRisk).toEqual([]);
    expect(plan.stats.totalInWindow).toBe(0);
  });

  it('live session (active + co-signed) → live bucket', () => {
    const s = mk({
      coSignedAt: new Date(now.getTime() - 600_000),
    });
    const plan = buildReviewPlan([s], now);
    expect(plan.live).toHaveLength(1);
    expect(plan.awaitingCoSign).toEqual([]);
    expect(plan.coSignOverdue).toEqual([]);
  });

  it('active + co-sign window open + not signed → awaitingCoSign', () => {
    const s = mk();
    const plan = buildReviewPlan([s], now);
    expect(plan.awaitingCoSign).toHaveLength(1);
    expect(plan.live).toEqual([]);
    expect(plan.coSignOverdue).toEqual([]);
  });

  it('active session but past co-sign window, no signature → coSignOverdue', () => {
    const activatedAt = new Date(now.getTime() - 25 * 3600_000);
    const expiresAt = new Date(activatedAt.getTime() + 48 * 3600_000); // still live
    const coSignRequiredBy = new Date(activatedAt.getTime() + 24 * 3600_000); // already past
    const s = mk({ activatedAt, expiresAt, coSignRequiredBy });
    const plan = buildReviewPlan([s], now);
    expect(plan.coSignOverdue).toHaveLength(1);
  });

  it('expired session that was never co-signed → coSignOverdue', () => {
    const activatedAt = new Date(now.getTime() - 72 * 3600_000);
    const expiresAt = new Date(activatedAt.getTime() + 4 * 3600_000); // expired
    const coSignRequiredBy = new Date(activatedAt.getTime() + 24 * 3600_000);
    const s = mk({ activatedAt, expiresAt, coSignRequiredBy });
    const plan = buildReviewPlan([s], now);
    expect(plan.coSignOverdue).toHaveLength(1);
  });

  it('expired + co-signed but no reviewedAt → unreviewed', () => {
    const activatedAt = new Date(now.getTime() - 72 * 3600_000);
    const s = mk({
      activatedAt,
      expiresAt: new Date(activatedAt.getTime() + 4 * 3600_000),
      coSignRequiredBy: new Date(activatedAt.getTime() + 24 * 3600_000),
      coSignedAt: new Date(activatedAt.getTime() + 2 * 3600_000),
    });
    const plan = buildReviewPlan([s], now);
    expect(plan.unreviewed).toHaveLength(1);
    expect(plan.coSignOverdue).toEqual([]);
  });

  it('fully closed + co-signed + reviewed → no bucket (silent success)', () => {
    const activatedAt = new Date(now.getTime() - 72 * 3600_000);
    const s = mk({
      activatedAt,
      expiresAt: new Date(activatedAt.getTime() + 4 * 3600_000),
      coSignRequiredBy: new Date(activatedAt.getTime() + 24 * 3600_000),
      coSignedAt: new Date(activatedAt.getTime() + 2 * 3600_000),
      closedAt: new Date(activatedAt.getTime() + 5 * 3600_000),
      reviewedAt: new Date(activatedAt.getTime() + 30 * 3600_000),
    });
    const plan = buildReviewPlan([s], now);
    expect(plan.live).toEqual([]);
    expect(plan.awaitingCoSign).toEqual([]);
    expect(plan.coSignOverdue).toEqual([]);
    expect(plan.unreviewed).toEqual([]);
  });
});

describe('buildReviewPlan — abuse detection', () => {
  it('flags user with ≥3 sessions in the window', () => {
    const sessions = [
      mk({ id: '1', userId: 'u-abuser' }),
      mk({ id: '2', userId: 'u-abuser' }),
      mk({ id: '3', userId: 'u-abuser' }),
      mk({ id: '4', userId: 'u-normal' }),
    ];
    const plan = buildReviewPlan(sessions, now);
    expect(plan.abuseRisk).toHaveLength(1);
    expect(plan.abuseRisk[0]).toEqual({ userId: 'u-abuser', count: 3 });
  });

  it('does not flag user with < threshold sessions', () => {
    const sessions = [mk({ id: '1', userId: 'u-1' }), mk({ id: '2', userId: 'u-1' })];
    expect(buildReviewPlan(sessions, now).abuseRisk).toEqual([]);
  });

  it('honors custom threshold parameter', () => {
    const sessions = [mk({ id: '1', userId: 'u-1' }), mk({ id: '2', userId: 'u-1' })];
    expect(buildReviewPlan(sessions, now, 2).abuseRisk).toHaveLength(1);
  });

  it('exports ABUSE_THRESHOLD constant', () => {
    expect(ABUSE_THRESHOLD).toBe(3);
  });
});

describe('buildReviewPlan — summary entries', () => {
  it('entry carries the key identity + state fields', () => {
    // Activate 1h ago so session is still active + within co-sign window.
    const activatedAt = new Date(now.getTime() - 3600_000);
    const s = mk({
      id: 'bg-abc',
      userId: 'u-42',
      scope: 'financial_read',
      branchId: 'br-99',
      activatedAt,
    });
    const plan = buildReviewPlan([s], now);
    const entry = plan.awaitingCoSign[0];
    expect(entry.id).toBe('bg-abc');
    expect(entry.userId).toBe('u-42');
    expect(entry.scope).toBe('financial_read');
    expect(entry.branchId).toBe('br-99');
  });

  it('truncates a long purpose to <=80 chars with ellipsis', () => {
    const long = 'x'.repeat(150);
    const plan = buildReviewPlan([mk({ purpose: long })], now);
    const entry = plan.awaitingCoSign[0];
    expect(entry.purpose.length).toBeLessThanOrEqual(80);
    expect(entry.purpose.endsWith('...')).toBe(true);
  });

  it('keeps a short purpose verbatim', () => {
    const plan = buildReviewPlan([mk({ purpose: 'short' })], now);
    expect(plan.awaitingCoSign[0].purpose).toBe('short');
  });
});

describe('buildReviewPlan — stats block', () => {
  it('counts everything', () => {
    const sessions = [
      mk({ id: 'live', userId: 'u-a', coSignedAt: new Date(now.getTime() - 600_000) }),
      mk({ id: 'wait', userId: 'u-b' }),
      mk({
        id: 'overdue',
        userId: 'u-c',
        activatedAt: new Date(now.getTime() - 25 * 3600_000),
        expiresAt: new Date(now.getTime() + 3600_000),
        coSignRequiredBy: new Date(now.getTime() - 1000),
      }),
    ];
    const plan = buildReviewPlan(sessions, now);
    expect(plan.stats.totalInWindow).toBe(3);
    expect(plan.stats.uniqueUsers).toBe(3);
    expect(plan.stats.live).toBe(1);
    expect(plan.stats.awaitingCoSign).toBe(1);
    expect(plan.stats.coSignOverdue).toBe(1);
  });
});
