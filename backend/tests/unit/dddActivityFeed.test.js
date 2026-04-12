'use strict';

const mockDDDActivity = {};
const mockDDDSubscription = {};
const mockDDDDigest = {};

jest.mock('../../models/DddActivityFeed', () => ({
  DDDActivity: mockDDDActivity,
  DDDSubscription: mockDDDSubscription,
  DDDDigest: mockDDDDigest,
}));

const svc = require('../../services/dddActivityFeed');

describe('dddActivityFeed', () => {
  /* ── Exports ── */
  it('exports expected constants as arrays', () => {
    expect(Array.isArray(svc.ACTIVITY_VERBS)).toBe(true);
    expect(Array.isArray(svc.ACTIVITY_CATEGORIES)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'publishActivity',
      'getFeed',
      'getEntityTimeline',
      'getDomainFeed',
      'markActivityRead',
      'getUnreadCount',
      'subscribe',
      'unsubscribe',
      'getUserSubscriptions',
      'generateDigest',
      'getActivityAnalytics',
      'getActivityFeedDashboard',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* ── TODO stubs ── */
  it('publishActivity resolves (TODO stub)', async () => {
    await expect(svc.publishActivity()).resolves.toBeUndefined();
  });
  it('getFeed resolves (TODO stub)', async () => {
    await expect(svc.getFeed()).resolves.toBeUndefined();
  });
  it('getEntityTimeline resolves (TODO stub)', async () => {
    await expect(svc.getEntityTimeline()).resolves.toBeUndefined();
  });
  it('getDomainFeed resolves (TODO stub)', async () => {
    await expect(svc.getDomainFeed()).resolves.toBeUndefined();
  });
  it('markActivityRead resolves (TODO stub)', async () => {
    await expect(svc.markActivityRead()).resolves.toBeUndefined();
  });
  it('getUnreadCount resolves (TODO stub)', async () => {
    await expect(svc.getUnreadCount()).resolves.toBeUndefined();
  });
  it('subscribe resolves (TODO stub)', async () => {
    await expect(svc.subscribe()).resolves.toBeUndefined();
  });
  it('unsubscribe resolves (TODO stub)', async () => {
    await expect(svc.unsubscribe()).resolves.toBeUndefined();
  });
  it('getUserSubscriptions resolves (TODO stub)', async () => {
    await expect(svc.getUserSubscriptions()).resolves.toBeUndefined();
  });
  it('generateDigest resolves (TODO stub)', async () => {
    await expect(svc.generateDigest()).resolves.toBeUndefined();
  });
  it('getActivityAnalytics resolves (TODO stub)', async () => {
    await expect(svc.getActivityAnalytics()).resolves.toBeUndefined();
  });

  /* ── getActivityFeedDashboard ── */
  it('returns dashboard with service name and status', async () => {
    const r = await svc.getActivityFeedDashboard();
    expect(r.service).toBe('ActivityFeed');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
