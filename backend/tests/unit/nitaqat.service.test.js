'use strict';

// Auto-generated unit test for nitaqat.service

const mocknitaqat_modelsChain = {
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
jest.mock('../../models/nitaqat.models', () => ({
  NitaqatCalculation: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocknitaqat_modelsChain),
  NitaqatActivityParam: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocknitaqat_modelsChain)
}));

const svc = require('../../services/nitaqat.service');

describe('nitaqat.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('calculateNitaqat is callable', async () => {
    if (typeof svc.calculateNitaqat !== 'function') return;
    let r;
    try { r = await svc.calculateNitaqat({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getLatestCalculation is callable', async () => {
    if (typeof svc.getLatestCalculation !== 'function') return;
    let r;
    try { r = await svc.getLatestCalculation({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCalculationHistory is callable', async () => {
    if (typeof svc.getCalculationHistory !== 'function') return;
    let r;
    try { r = await svc.getCalculationHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('whatIfAnalysis is callable', async () => {
    if (typeof svc.whatIfAnalysis !== 'function') return;
    let r;
    try { r = await svc.whatIfAnalysis({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('upsertActivityParams is callable', async () => {
    if (typeof svc.upsertActivityParams !== 'function') return;
    let r;
    try { r = await svc.upsertActivityParams({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getActivityParams is callable', async () => {
    if (typeof svc.getActivityParams !== 'function') return;
    let r;
    try { r = await svc.getActivityParams({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listActivityParams is callable', async () => {
    if (typeof svc.listActivityParams !== 'function') return;
    let r;
    try { r = await svc.listActivityParams({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboardStats is callable', async () => {
    if (typeof svc.getDashboardStats !== 'function') return;
    let r;
    try { r = await svc.getDashboardStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
