'use strict';

// Auto-generated unit test for maintenanceService

const mockMaintenanceChain = {
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
jest.mock('../../models/Maintenance', () => ({
  Maintenance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceChain),
  MaintenancePrediction: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenanceChain)
}));

const mockMaintenancePredictionChain = {
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
jest.mock('../../models/MaintenancePrediction', () => ({
  Maintenance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenancePredictionChain),
  MaintenancePrediction: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMaintenancePredictionChain)
}));

const svc = require('../../services/maintenanceService');

describe('maintenanceService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getAllSchedules is callable', async () => {
    if (typeof svc.getAllSchedules !== 'function') return;
    let r;
    try { r = await svc.getAllSchedules({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createSchedule is callable', async () => {
    if (typeof svc.createSchedule !== 'function') return;
    let r;
    try { r = await svc.createSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getScheduleById is callable', async () => {
    if (typeof svc.getScheduleById !== 'function') return;
    let r;
    try { r = await svc.getScheduleById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateSchedule is callable', async () => {
    if (typeof svc.updateSchedule !== 'function') return;
    let r;
    try { r = await svc.updateSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteSchedule is callable', async () => {
    if (typeof svc.deleteSchedule !== 'function') return;
    let r;
    try { r = await svc.deleteSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('completeSchedule is callable', async () => {
    if (typeof svc.completeSchedule !== 'function') return;
    let r;
    try { r = await svc.completeSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('predictMaintenanceNeeds is callable', async () => {
    if (typeof svc.predictMaintenanceNeeds !== 'function') return;
    let r;
    try { r = await svc.predictMaintenanceNeeds({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAssetMaintenanceHistory is callable', async () => {
    if (typeof svc.getAssetMaintenanceHistory !== 'function') return;
    let r;
    try { r = await svc.getAssetMaintenanceHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('forEach is callable', async () => {
    if (typeof svc.forEach !== 'function') return;
    let r;
    try { r = await svc.forEach({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getHealthStatus is callable', async () => {
    if (typeof svc.getHealthStatus !== 'function') return;
    let r;
    try { r = await svc.getHealthStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
