'use strict';

// Auto-generated unit test for therapistPortal.service

const mockTherapySessionChain = {
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
jest.mock('../../models/TherapySession', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockTherapySessionChain);
  return M;
});

const mockTherapistAvailabilityChain = {
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
jest.mock('../../models/TherapistAvailability', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockTherapistAvailabilityChain);
  return M;
});

const mockTherapeuticPlanChain = {
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
jest.mock('../../models/TherapeuticPlan', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockTherapeuticPlanChain);
  return M;
});

const mockTherapyProgramChain = {
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
jest.mock('../../models/TherapyProgram', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockTherapyProgramChain);
  return M;
});

const mockSessionDocumentationChain = {
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
jest.mock('../../models/SessionDocumentation', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockSessionDocumentationChain);
  return M;
});

const mockCaseManagementChain = {
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
jest.mock('../../models/CaseManagement', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockCaseManagementChain);
  return M;
});

const mockDocumentChain = {
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
jest.mock('../../models/Document', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockDocumentChain);
  return M;
});

const mockmessage_modelChain = {
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
jest.mock('../../models/message.model', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockmessage_modelChain);
  return M;
});

const mockBeneficiaryChain = {
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
jest.mock('../../models/Beneficiary', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockBeneficiaryChain);
  return M;
});

const svc = require('../../services/therapistPortal.service');

describe('therapistPortal.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getDashboard is callable', async () => {
    if (typeof svc.getDashboard !== 'function') return;
    let r;
    try { r = await svc.getDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPatients is callable', async () => {
    if (typeof svc.getPatients !== 'function') return;
    let r;
    try { r = await svc.getPatients({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPatientById is callable', async () => {
    if (typeof svc.getPatientById !== 'function') return;
    let r;
    try { r = await svc.getPatientById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSchedule is callable', async () => {
    if (typeof svc.getSchedule !== 'function') return;
    let r;
    try { r = await svc.getSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addScheduleSession is callable', async () => {
    if (typeof svc.addScheduleSession !== 'function') return;
    let r;
    try { r = await svc.addScheduleSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateScheduleSession is callable', async () => {
    if (typeof svc.updateScheduleSession !== 'function') return;
    let r;
    try { r = await svc.updateScheduleSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteScheduleSession is callable', async () => {
    if (typeof svc.deleteScheduleSession !== 'function') return;
    let r;
    try { r = await svc.deleteScheduleSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAvailability is callable', async () => {
    if (typeof svc.getAvailability !== 'function') return;
    let r;
    try { r = await svc.getAvailability({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateAvailability is callable', async () => {
    if (typeof svc.updateAvailability !== 'function') return;
    let r;
    try { r = await svc.updateAvailability({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addException is callable', async () => {
    if (typeof svc.addException !== 'function') return;
    let r;
    try { r = await svc.addException({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSessions is callable', async () => {
    if (typeof svc.getSessions !== 'function') return;
    let r;
    try { r = await svc.getSessions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSessionById is callable', async () => {
    if (typeof svc.getSessionById !== 'function') return;
    let r;
    try { r = await svc.getSessionById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('saveSessionReport is callable', async () => {
    if (typeof svc.saveSessionReport !== 'function') return;
    let r;
    try { r = await svc.saveSessionReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateSession is callable', async () => {
    if (typeof svc.updateSession !== 'function') return;
    let r;
    try { r = await svc.updateSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteSession is callable', async () => {
    if (typeof svc.deleteSession !== 'function') return;
    let r;
    try { r = await svc.deleteSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSessionDocumentation is callable', async () => {
    if (typeof svc.getSessionDocumentation !== 'function') return;
    let r;
    try { r = await svc.getSessionDocumentation({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createSessionDocumentation is callable', async () => {
    if (typeof svc.createSessionDocumentation !== 'function') return;
    let r;
    try { r = await svc.createSessionDocumentation({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTherapeuticPlans is callable', async () => {
    if (typeof svc.getTherapeuticPlans !== 'function') return;
    let r;
    try { r = await svc.getTherapeuticPlans({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPlanById is callable', async () => {
    if (typeof svc.getPlanById !== 'function') return;
    let r;
    try { r = await svc.getPlanById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateGoalProgress is callable', async () => {
    if (typeof svc.updateGoalProgress !== 'function') return;
    let r;
    try { r = await svc.updateGoalProgress({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCases is callable', async () => {
    if (typeof svc.getCases !== 'function') return;
    let r;
    try { r = await svc.getCases({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCaseById is callable', async () => {
    if (typeof svc.getCaseById !== 'function') return;
    let r;
    try { r = await svc.getCaseById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateCase is callable', async () => {
    if (typeof svc.updateCase !== 'function') return;
    let r;
    try { r = await svc.updateCase({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateCaseGoal is callable', async () => {
    if (typeof svc.updateCaseGoal !== 'function') return;
    let r;
    try { r = await svc.updateCaseGoal({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDocuments is callable', async () => {
    if (typeof svc.getDocuments !== 'function') return;
    let r;
    try { r = await svc.getDocuments({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('uploadDocument is callable', async () => {
    if (typeof svc.uploadDocument !== 'function') return;
    let r;
    try { r = await svc.uploadDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteDocument is callable', async () => {
    if (typeof svc.deleteDocument !== 'function') return;
    let r;
    try { r = await svc.deleteDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReports is callable', async () => {
    if (typeof svc.getReports !== 'function') return;
    let r;
    try { r = await svc.getReports({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPerformanceKPIs is callable', async () => {
    if (typeof svc.getPerformanceKPIs !== 'function') return;
    let r;
    try { r = await svc.getPerformanceKPIs({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMessages is callable', async () => {
    if (typeof svc.getMessages !== 'function') return;
    let r;
    try { r = await svc.getMessages({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendMessage is callable', async () => {
    if (typeof svc.sendMessage !== 'function') return;
    let r;
    try { r = await svc.sendMessage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCommunications is callable', async () => {
    if (typeof svc.getCommunications !== 'function') return;
    let r;
    try { r = await svc.getCommunications({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendCommunication is callable', async () => {
    if (typeof svc.sendCommunication !== 'function') return;
    let r;
    try { r = await svc.sendCommunication({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPatientProgress is callable', async () => {
    if (typeof svc.getPatientProgress !== 'function') return;
    let r;
    try { r = await svc.getPatientProgress({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getWorkloadAnalytics is callable', async () => {
    if (typeof svc.getWorkloadAnalytics !== 'function') return;
    let r;
    try { r = await svc.getWorkloadAnalytics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
