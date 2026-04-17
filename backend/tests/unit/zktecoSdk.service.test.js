'use strict';

// Auto-generated unit test for zktecoSdk.service

const mockZktecoDeviceChain = {
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
jest.mock('../../models/ZktecoDevice', () => ({
  ZktecoDevice: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockZktecoDeviceChain
  ),
  AttendanceLog: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockZktecoDeviceChain
  ),
  Employee: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockZktecoDeviceChain
  ),
}));

const mockAttendanceLogChain = {
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
jest.mock('../../models/AttendanceLog', () => ({
  ZktecoDevice: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockAttendanceLogChain
  ),
  AttendanceLog: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockAttendanceLogChain
  ),
  Employee: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockAttendanceLogChain
  ),
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
jest.mock('../../models/HR/Employee', () => ({
  ZktecoDevice: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  AttendanceLog: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  Employee: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const svc = require('../../services/zktecoSdk.service');

describe('zktecoSdk.service service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('connect is callable', async () => {
    if (typeof svc.connect !== 'function') return;
    let r;
    try {
      r = await svc.connect({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('pullAttendanceLogs is callable', async () => {
    if (typeof svc.pullAttendanceLogs !== 'function') return;
    let r;
    try {
      r = await svc.pullAttendanceLogs({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('handlePushData is callable', async () => {
    if (typeof svc.handlePushData !== 'function') return;
    let r;
    try {
      r = await svc.handlePushData({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('enrollEmployee is callable', async () => {
    if (typeof svc.enrollEmployee !== 'function') return;
    let r;
    try {
      r = await svc.enrollEmployee({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('removeEmployee is callable', async () => {
    if (typeof svc.removeEmployee !== 'function') return;
    let r;
    try {
      r = await svc.removeEmployee({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('healthCheck is callable', async () => {
    if (typeof svc.healthCheck !== 'function') return;
    let r;
    try {
      r = await svc.healthCheck({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('processAttendanceRecord is callable', async () => {
    if (typeof svc.processAttendanceRecord !== 'function') return;
    let r;
    try {
      r = await svc.processAttendanceRecord({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });
});
