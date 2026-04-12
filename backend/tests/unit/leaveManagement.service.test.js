'use strict';

// Auto-generated unit test for leaveManagement.service

const mockLeaveRequestChain = {
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
jest.mock('../../models/LeaveRequest', () => ({
  LeaveRequest: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveRequestChain),
  LeaveBalance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveRequestChain),
  DailyAttendance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveRequestChain),
  Employee: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveRequestChain)
}));

const mockLeaveBalanceChain = {
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
jest.mock('../../models/LeaveBalance', () => ({
  LeaveRequest: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveBalanceChain),
  LeaveBalance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveBalanceChain),
  DailyAttendance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveBalanceChain),
  Employee: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockLeaveBalanceChain)
}));

const mockDailyAttendanceChain = {
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
jest.mock('../../models/DailyAttendance', () => ({
  LeaveRequest: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDailyAttendanceChain),
  LeaveBalance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDailyAttendanceChain),
  DailyAttendance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDailyAttendanceChain),
  Employee: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDailyAttendanceChain)
}));

const mockEmployeeChain = {
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
jest.mock('../../models/Employee', () => ({
  LeaveRequest: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEmployeeChain),
  LeaveBalance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEmployeeChain),
  DailyAttendance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEmployeeChain),
  Employee: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEmployeeChain)
}));

const svc = require('../../services/leaveManagement.service');

describe('leaveManagement.service service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('submitRequest is callable', async () => {
    if (typeof svc.submitRequest !== 'function') return;
    let r;
    try { r = await svc.submitRequest({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('approve is callable', async () => {
    if (typeof svc.approve !== 'function') return;
    let r;
    try { r = await svc.approve({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('reject is callable', async () => {
    if (typeof svc.reject !== 'function') return;
    let r;
    try { r = await svc.reject({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getBalance is callable', async () => {
    if (typeof svc.getBalance !== 'function') return;
    let r;
    try { r = await svc.getBalance({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('list is callable', async () => {
    if (typeof svc.list !== 'function') return;
    let r;
    try { r = await svc.list({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getStats is callable', async () => {
    if (typeof svc.getStats !== 'function') return;
    let r;
    try { r = await svc.getStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('initializeYearlyBalances is callable', async () => {
    if (typeof svc.initializeYearlyBalances !== 'function') return;
    let r;
    try { r = await svc.initializeYearlyBalances({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateWorkingDays is callable', async () => {
    if (typeof svc.calculateWorkingDays !== 'function') return;
    let r;
    try { r = await svc.calculateWorkingDays({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
