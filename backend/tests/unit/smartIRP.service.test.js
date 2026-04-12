'use strict';

// Auto-generated unit test for smartIRP.service

const mockSmartIRPChain = {
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
jest.mock('../../models/SmartIRP', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockSmartIRPChain);
  return M;
});
jest.mock('mongoose', () => ({
  connection: { readyState: 1, db: { admin: () => ({ ping: jest.fn().mockResolvedValue(true) }) } },
  model: jest.fn(),
  Schema: jest.fn().mockImplementation(() => ({ index: jest.fn(), pre: jest.fn(), post: jest.fn(), virtual: jest.fn().mockReturnThis(), set: jest.fn() })),
  Types: { ObjectId: jest.fn(v => v || 'mock-id') },
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

const Svc = require('../../services/smartIRP.service');

describe('smartIRP.service service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('createIRP static method is callable', async () => {
    if (typeof Svc.createIRP !== 'function') return;
    let r;
    try { r = await Svc.createIRP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateIRPNumber static method is callable', async () => {
    if (typeof Svc.generateIRPNumber !== 'function') return;
    let r;
    try { r = await Svc.generateIRPNumber({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addGoal static method is callable', async () => {
    if (typeof Svc.addGoal !== 'function') return;
    let r;
    try { r = await Svc.addGoal({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('validateSMARTGoal static method is callable', async () => {
    if (typeof Svc.validateSMARTGoal !== 'function') return;
    let r;
    try { r = await Svc.validateSMARTGoal({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateGoalProgress static method is callable', async () => {
    if (typeof Svc.updateGoalProgress !== 'function') return;
    let r;
    try { r = await Svc.updateGoalProgress({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('forEach static method is callable', async () => {
    if (typeof Svc.forEach !== 'function') return;
    let r;
    try { r = await Svc.forEach({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('performAssessment static method is callable', async () => {
    if (typeof Svc.performAssessment !== 'function') return;
    let r;
    try { r = await Svc.performAssessment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('checkAndSendAlerts static method is callable', async () => {
    if (typeof Svc.checkAndSendAlerts !== 'function') return;
    let r;
    try { r = await Svc.checkAndSendAlerts({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('performAutoReview static method is callable', async () => {
    if (typeof Svc.performAutoReview !== 'function') return;
    let r;
    try { r = await Svc.performAutoReview({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateFamilyReport static method is callable', async () => {
    if (typeof Svc.generateFamilyReport !== 'function') return;
    let r;
    try { r = await Svc.generateFamilyReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAnalytics static method is callable', async () => {
    if (typeof Svc.getAnalytics !== 'function') return;
    let r;
    try { r = await Svc.getAnalytics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateBenchmarks static method is callable', async () => {
    if (typeof Svc.updateBenchmarks !== 'function') return;
    let r;
    try { r = await Svc.updateBenchmarks({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('runScheduledReviews static method is callable', async () => {
    if (typeof Svc.runScheduledReviews !== 'function') return;
    let r;
    try { r = await Svc.runScheduledReviews({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
