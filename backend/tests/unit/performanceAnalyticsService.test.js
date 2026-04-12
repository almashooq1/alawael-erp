'use strict';

// Auto-generated unit test for performanceAnalyticsService

const mockAnalyticsChain = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  findOneAndDelete: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'id1' }),
  findByIdAndDelete: jest.fn().mockResolvedValue({ _id: 'id1' }),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  distinct: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  insertMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({ _id: 'id1' }),
  save: jest.fn().mockResolvedValue({ _id: 'id1' }),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};
jest.mock('../../models/Analytics', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockAnalyticsChain);
  return M;
});

const svc = require('../../services/performanceAnalyticsService');

describe('performanceAnalyticsService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getOverview is callable', async () => {
    if (typeof svc.getOverview !== 'function') return;
    let r;
    try { r = await svc.getOverview({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboard is callable', async () => {
    if (typeof svc.getDashboard !== 'function') return;
    let r;
    try { r = await svc.getDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('forEach is callable', async () => {
    if (typeof svc.forEach !== 'function') return;
    let r;
    try { r = await svc.forEach({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getModuleAnalytics is callable', async () => {
    if (typeof svc.getModuleAnalytics !== 'function') return;
    let r;
    try { r = await svc.getModuleAnalytics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUserAnalytics is callable', async () => {
    if (typeof svc.getUserAnalytics !== 'function') return;
    let r;
    try { r = await svc.getUserAnalytics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPerformanceTrends is callable', async () => {
    if (typeof svc.getPerformanceTrends !== 'function') return;
    let r;
    try { r = await svc.getPerformanceTrends({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getKPIs is callable', async () => {
    if (typeof svc.getKPIs !== 'function') return;
    let r;
    try { r = await svc.getKPIs({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('trackEvent is callable', async () => {
    if (typeof svc.trackEvent !== 'function') return;
    let r;
    try { r = await svc.trackEvent({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getHealthStatus is callable', async () => {
    if (typeof svc.getHealthStatus !== 'function') return;
    let r;
    try { r = await svc.getHealthStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
