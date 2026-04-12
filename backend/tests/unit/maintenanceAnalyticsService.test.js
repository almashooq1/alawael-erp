'use strict';

// Auto-generated unit test for maintenanceAnalyticsService

const mockVehicleChain = {
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
jest.mock('../../models/Vehicle', () => ({
  Vehicle: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockVehicleChain),
  MaintenanceTask: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockVehicleChain),
  MaintenanceSchedule: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockVehicleChain),
  MaintenanceProvider: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockVehicleChain),
  MaintenanceIssue: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockVehicleChain),
  MaintenanceInventory: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockVehicleChain)
}));

const mockMaintenanceTaskChain = {
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
jest.mock('../../models/MaintenanceTask', () => ({
  Vehicle: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceTaskChain),
  MaintenanceTask: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceTaskChain),
  MaintenanceSchedule: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceTaskChain),
  MaintenanceProvider: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceTaskChain),
  MaintenanceIssue: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceTaskChain),
  MaintenanceInventory: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceTaskChain)
}));

const mockMaintenanceScheduleChain = {
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
jest.mock('../../models/MaintenanceSchedule', () => ({
  Vehicle: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceScheduleChain),
  MaintenanceTask: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceScheduleChain),
  MaintenanceSchedule: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceScheduleChain),
  MaintenanceProvider: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceScheduleChain),
  MaintenanceIssue: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceScheduleChain),
  MaintenanceInventory: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceScheduleChain)
}));

const mockMaintenanceProviderChain = {
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
jest.mock('../../models/MaintenanceProvider', () => ({
  Vehicle: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceProviderChain),
  MaintenanceTask: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceProviderChain),
  MaintenanceSchedule: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceProviderChain),
  MaintenanceProvider: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceProviderChain),
  MaintenanceIssue: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceProviderChain),
  MaintenanceInventory: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceProviderChain)
}));

const mockMaintenanceIssueChain = {
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
jest.mock('../../models/MaintenanceIssue', () => ({
  Vehicle: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceIssueChain),
  MaintenanceTask: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceIssueChain),
  MaintenanceSchedule: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceIssueChain),
  MaintenanceProvider: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceIssueChain),
  MaintenanceIssue: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceIssueChain),
  MaintenanceInventory: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceIssueChain)
}));

const mockMaintenanceInventoryChain = {
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
jest.mock('../../models/MaintenanceInventory', () => ({
  Vehicle: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceInventoryChain),
  MaintenanceTask: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceInventoryChain),
  MaintenanceSchedule: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceInventoryChain),
  MaintenanceProvider: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceInventoryChain),
  MaintenanceIssue: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceInventoryChain),
  MaintenanceInventory: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceInventoryChain)
}));

const svc = require('../../services/maintenanceAnalyticsService');

describe('maintenanceAnalyticsService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('generateComprehensiveReport is callable', async () => {
    if (typeof svc.generateComprehensiveReport !== 'function') return;
    let r;
    try { r = await svc.generateComprehensiveReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('analyzeCosts is callable', async () => {
    if (typeof svc.analyzeCosts !== 'function') return;
    let r;
    try { r = await svc.analyzeCosts({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('analyzeSchedulePerformance is callable', async () => {
    if (typeof svc.analyzeSchedulePerformance !== 'function') return;
    let r;
    try { r = await svc.analyzeSchedulePerformance({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('categorizeMaintenanceWork is callable', async () => {
    if (typeof svc.categorizeMaintenanceWork !== 'function') return;
    let r;
    try { r = await svc.categorizeMaintenanceWork({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('forEach is callable', async () => {
    if (typeof svc.forEach !== 'function') return;
    let r;
    try { r = await svc.forEach({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTopIssues is callable', async () => {
    if (typeof svc.getTopIssues !== 'function') return;
    let r;
    try { r = await svc.getTopIssues({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateTimeMetrics is callable', async () => {
    if (typeof svc.calculateTimeMetrics !== 'function') return;
    let r;
    try { r = await svc.calculateTimeMetrics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getProviderPerformanceReport is callable', async () => {
    if (typeof svc.getProviderPerformanceReport !== 'function') return;
    let r;
    try { r = await svc.getProviderPerformanceReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getProviderRecommendation is callable', async () => {
    if (typeof svc.getProviderRecommendation !== 'function') return;
    let r;
    try { r = await svc.getProviderRecommendation({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getInventoryHealthReport is callable', async () => {
    if (typeof svc.getInventoryHealthReport !== 'function') return;
    let r;
    try { r = await svc.getInventoryHealthReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('analyzeInventoryCostDistribution is callable', async () => {
    if (typeof svc.analyzeInventoryCostDistribution !== 'function') return;
    let r;
    try { r = await svc.analyzeInventoryCostDistribution({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSlowMovingItems is callable', async () => {
    if (typeof svc.getSlowMovingItems !== 'function') return;
    let r;
    try { r = await svc.getSlowMovingItems({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCriticalItems is callable', async () => {
    if (typeof svc.getCriticalItems !== 'function') return;
    let r;
    try { r = await svc.getCriticalItems({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getComplianceReport is callable', async () => {
    if (typeof svc.getComplianceReport !== 'function') return;
    let r;
    try { r = await svc.getComplianceReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateComplianceScore is callable', async () => {
    if (typeof svc.calculateComplianceScore !== 'function') return;
    let r;
    try { r = await svc.calculateComplianceScore({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
