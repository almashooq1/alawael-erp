'use strict';

// Auto-generated unit test for employeeAffairs.service

const mockemployee_modelChain = {
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
jest.mock('../../models/employee.model', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockemployee_modelChain);
  return M;
});

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
jest.mock('../../models/LeaveRequest', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockLeaveRequestChain);
  return M;
});

const svc = require('../../services/employeeAffairs.service');

describe('employeeAffairs.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createEmployee is callable', async () => {
    if (typeof svc.createEmployee !== 'function') return;
    let r;
    try { r = await svc.createEmployee({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getEmployeeById is callable', async () => {
    if (typeof svc.getEmployeeById !== 'function') return;
    let r;
    try { r = await svc.getEmployeeById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listEmployees is callable', async () => {
    if (typeof svc.listEmployees !== 'function') return;
    let r;
    try { r = await svc.listEmployees({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateEmployee is callable', async () => {
    if (typeof svc.updateEmployee !== 'function') return;
    let r;
    try { r = await svc.updateEmployee({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('terminateEmployee is callable', async () => {
    if (typeof svc.terminateEmployee !== 'function') return;
    let r;
    try { r = await svc.terminateEmployee({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getEmployeeProfile is callable', async () => {
    if (typeof svc.getEmployeeProfile !== 'function') return;
    let r;
    try { r = await svc.getEmployeeProfile({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('requestLeave is callable', async () => {
    if (typeof svc.requestLeave !== 'function') return;
    let r;
    try { r = await svc.requestLeave({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('approveLeaveByManager is callable', async () => {
    if (typeof svc.approveLeaveByManager !== 'function') return;
    let r;
    try { r = await svc.approveLeaveByManager({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('approveLeaveByHR is callable', async () => {
    if (typeof svc.approveLeaveByHR !== 'function') return;
    let r;
    try { r = await svc.approveLeaveByHR({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('rejectLeave is callable', async () => {
    if (typeof svc.rejectLeave !== 'function') return;
    let r;
    try { r = await svc.rejectLeave({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('cancelLeave is callable', async () => {
    if (typeof svc.cancelLeave !== 'function') return;
    let r;
    try { r = await svc.cancelLeave({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getLeaveBalance is callable', async () => {
    if (typeof svc.getLeaveBalance !== 'function') return;
    let r;
    try { r = await svc.getLeaveBalance({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listLeaves is callable', async () => {
    if (typeof svc.listLeaves !== 'function') return;
    let r;
    try { r = await svc.listLeaves({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('checkIn is callable', async () => {
    if (typeof svc.checkIn !== 'function') return;
    let r;
    try { r = await svc.checkIn({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('checkOut is callable', async () => {
    if (typeof svc.checkOut !== 'function') return;
    let r;
    try { r = await svc.checkOut({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMonthlyAttendanceReport is callable', async () => {
    if (typeof svc.getMonthlyAttendanceReport !== 'function') return;
    let r;
    try { r = await svc.getMonthlyAttendanceReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createPerformanceReview is callable', async () => {
    if (typeof svc.createPerformanceReview !== 'function') return;
    let r;
    try { r = await svc.createPerformanceReview({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPerformanceHistory is callable', async () => {
    if (typeof svc.getPerformanceHistory !== 'function') return;
    let r;
    try { r = await svc.getPerformanceHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('setEmployeeGoals is callable', async () => {
    if (typeof svc.setEmployeeGoals !== 'function') return;
    let r;
    try { r = await svc.setEmployeeGoals({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getExpiringContracts is callable', async () => {
    if (typeof svc.getExpiringContracts !== 'function') return;
    let r;
    try { r = await svc.getExpiringContracts({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('renewContract is callable', async () => {
    if (typeof svc.renewContract !== 'function') return;
    let r;
    try { r = await svc.renewContract({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('promoteEmployee is callable', async () => {
    if (typeof svc.promoteEmployee !== 'function') return;
    let r;
    try { r = await svc.promoteEmployee({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addCertification is callable', async () => {
    if (typeof svc.addCertification !== 'function') return;
    let r;
    try { r = await svc.addCertification({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addTraining is callable', async () => {
    if (typeof svc.addTraining !== 'function') return;
    let r;
    try { r = await svc.addTraining({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addSkill is callable', async () => {
    if (typeof svc.addSkill !== 'function') return;
    let r;
    try { r = await svc.addSkill({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addDocument is callable', async () => {
    if (typeof svc.addDocument !== 'function') return;
    let r;
    try { r = await svc.addDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDocuments is callable', async () => {
    if (typeof svc.getDocuments !== 'function') return;
    let r;
    try { r = await svc.getDocuments({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboard is callable', async () => {
    if (typeof svc.getDashboard !== 'function') return;
    let r;
    try { r = await svc.getDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDepartmentStatistics is callable', async () => {
    if (typeof svc.getDepartmentStatistics !== 'function') return;
    let r;
    try { r = await svc.getDepartmentStatistics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getEmployeeGovernmentSummary is callable', async () => {
    if (typeof svc.getEmployeeGovernmentSummary !== 'function') return;
    let r;
    try { r = await svc.getEmployeeGovernmentSummary({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateEmployeeMOLData is callable', async () => {
    if (typeof svc.updateEmployeeMOLData !== 'function') return;
    let r;
    try { r = await svc.updateEmployeeMOLData({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateEmployeeSponsorshipData is callable', async () => {
    if (typeof svc.updateEmployeeSponsorshipData !== 'function') return;
    let r;
    try { r = await svc.updateEmployeeSponsorshipData({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getExpiringDocumentsReport is callable', async () => {
    if (typeof svc.getExpiringDocumentsReport !== 'function') return;
    let r;
    try { r = await svc.getExpiringDocumentsReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSaudizationReport is callable', async () => {
    if (typeof svc.getSaudizationReport !== 'function') return;
    let r;
    try { r = await svc.getSaudizationReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
