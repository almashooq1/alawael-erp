'use strict';

jest.mock('../../models/DddActivityFeed', () => ({
  DDDActivity: {},
  DDDSubscription: {},
  DDDDigest: {},
  ACTIVITY_VERBS: ['item1'],
  ACTIVITY_CATEGORIES: ['item1'],

}));

const svc = require('../../services/dddActivityFeed');

describe('dddActivityFeed service', () => {
  test('ACTIVITY_VERBS is an array', () => { expect(Array.isArray(svc.ACTIVITY_VERBS)).toBe(true); });
  test('ACTIVITY_CATEGORIES is an array', () => { expect(Array.isArray(svc.ACTIVITY_CATEGORIES)).toBe(true); });
  test('publishActivity resolves', async () => { await expect(svc.publishActivity()).resolves.not.toThrow(); });
  test('getFeed resolves', async () => { await expect(svc.getFeed()).resolves.not.toThrow(); });
  test('getEntityTimeline resolves', async () => { await expect(svc.getEntityTimeline()).resolves.not.toThrow(); });
  test('getDomainFeed resolves', async () => { await expect(svc.getDomainFeed()).resolves.not.toThrow(); });
  test('markActivityRead resolves', async () => { await expect(svc.markActivityRead()).resolves.not.toThrow(); });
  test('getUnreadCount resolves', async () => { await expect(svc.getUnreadCount()).resolves.not.toThrow(); });
  test('subscribe resolves', async () => { await expect(svc.subscribe()).resolves.not.toThrow(); });
  test('unsubscribe resolves', async () => { await expect(svc.unsubscribe()).resolves.not.toThrow(); });
  test('getUserSubscriptions resolves', async () => { await expect(svc.getUserSubscriptions()).resolves.not.toThrow(); });
  test('generateDigest resolves', async () => { await expect(svc.generateDigest()).resolves.not.toThrow(); });
  test('getActivityAnalytics resolves', async () => { await expect(svc.getActivityAnalytics()).resolves.not.toThrow(); });
  test('getActivityFeedDashboard returns health object', async () => {
    const d = await svc.getActivityFeedDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
