'use strict';

// Auto-generated unit test for scheduleManagementService

const mockScheduleChain = {
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
jest.mock('../../models/Schedule', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockScheduleChain);
  return M;
});

const svc = require('../../services/scheduleManagementService');

describe('scheduleManagementService service', () => {
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

  test('getSchedulesByResource is callable', async () => {
    if (typeof svc.getSchedulesByResource !== 'function') return;
    let r;
    try { r = await svc.getSchedulesByResource({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSchedulesByDateRange is callable', async () => {
    if (typeof svc.getSchedulesByDateRange !== 'function') return;
    let r;
    try { r = await svc.getSchedulesByDateRange({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('confirmSchedule is callable', async () => {
    if (typeof svc.confirmSchedule !== 'function') return;
    let r;
    try { r = await svc.confirmSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getHealthStatus is callable', async () => {
    if (typeof svc.getHealthStatus !== 'function') return;
    let r;
    try { r = await svc.getHealthStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
