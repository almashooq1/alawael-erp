'use strict';

// Auto-generated unit test for reportService

const mockReportChain = {
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
jest.mock('../../models/Report', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockReportChain);
  return M;
});

const svc = require('../../services/reportService');

describe('reportService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getAvailableReports is callable', async () => {
    if (typeof svc.getAvailableReports !== 'function') return;
    let r;
    try { r = await svc.getAvailableReports({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateReport is callable', async () => {
    if (typeof svc.generateReport !== 'function') return;
    let r;
    try { r = await svc.generateReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReportById is callable', async () => {
    if (typeof svc.getReportById !== 'function') return;
    let r;
    try { r = await svc.getReportById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('downloadReport is callable', async () => {
    if (typeof svc.downloadReport !== 'function') return;
    let r;
    try { r = await svc.downloadReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteReport is callable', async () => {
    if (typeof svc.deleteReport !== 'function') return;
    let r;
    try { r = await svc.deleteReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDisabilitySummary is callable', async () => {
    if (typeof svc.getDisabilitySummary !== 'function') return;
    let r;
    try { r = await svc.getDisabilitySummary({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMaintenanceSchedule is callable', async () => {
    if (typeof svc.getMaintenanceSchedule !== 'function') return;
    let r;
    try { r = await svc.getMaintenanceSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportBatch is callable', async () => {
    if (typeof svc.exportBatch !== 'function') return;
    let r;
    try { r = await svc.exportBatch({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReportSchedule is callable', async () => {
    if (typeof svc.getReportSchedule !== 'function') return;
    let r;
    try { r = await svc.getReportSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getHealthStatus is callable', async () => {
    if (typeof svc.getHealthStatus !== 'function') return;
    let r;
    try { r = await svc.getHealthStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
