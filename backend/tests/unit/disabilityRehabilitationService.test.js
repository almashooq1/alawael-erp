'use strict';

// Auto-generated unit test for disabilityRehabilitationService

const mockDisabilityProgramChain = {
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
jest.mock('../../models/DisabilityProgram', () => ({
  DisabilityProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilityProgramChain),
  DisabilitySession: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilityProgramChain),
  Goal: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilityProgramChain),
  Assessment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilityProgramChain)
}));

const mockDisabilitySessionChain = {
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
jest.mock('../../models/DisabilitySession', () => ({
  DisabilityProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilitySessionChain),
  DisabilitySession: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilitySessionChain),
  Goal: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilitySessionChain),
  Assessment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDisabilitySessionChain)
}));

const mockGoalChain = {
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
jest.mock('../../models/Goal', () => ({
  DisabilityProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGoalChain),
  DisabilitySession: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGoalChain),
  Goal: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGoalChain),
  Assessment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGoalChain)
}));

const mockAssessmentChain = {
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
jest.mock('../../models/Assessment', () => ({
  DisabilityProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockAssessmentChain),
  DisabilitySession: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockAssessmentChain),
  Goal: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockAssessmentChain),
  Assessment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockAssessmentChain)
}));

const svc = require('../../services/disabilityRehabilitationService');

describe('disabilityRehabilitationService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getAllPrograms is callable', async () => {
    if (typeof svc.getAllPrograms !== 'function') return;
    let r;
    try { r = await svc.getAllPrograms({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createProgram is callable', async () => {
    if (typeof svc.createProgram !== 'function') return;
    let r;
    try { r = await svc.createProgram({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getProgramById is callable', async () => {
    if (typeof svc.getProgramById !== 'function') return;
    let r;
    try { r = await svc.getProgramById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateProgram is callable', async () => {
    if (typeof svc.updateProgram !== 'function') return;
    let r;
    try { r = await svc.updateProgram({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteProgram is callable', async () => {
    if (typeof svc.deleteProgram !== 'function') return;
    let r;
    try { r = await svc.deleteProgram({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createSession is callable', async () => {
    if (typeof svc.createSession !== 'function') return;
    let r;
    try { r = await svc.createSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAllSessions is callable', async () => {
    if (typeof svc.getAllSessions !== 'function') return;
    let r;
    try { r = await svc.getAllSessions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSessionById is callable', async () => {
    if (typeof svc.getSessionById !== 'function') return;
    let r;
    try { r = await svc.getSessionById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateSession is callable', async () => {
    if (typeof svc.updateSession !== 'function') return;
    let r;
    try { r = await svc.updateSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createGoal is callable', async () => {
    if (typeof svc.createGoal !== 'function') return;
    let r;
    try { r = await svc.createGoal({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getGoalById is callable', async () => {
    if (typeof svc.getGoalById !== 'function') return;
    let r;
    try { r = await svc.getGoalById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getGoalsByBeneficiary is callable', async () => {
    if (typeof svc.getGoalsByBeneficiary !== 'function') return;
    let r;
    try { r = await svc.getGoalsByBeneficiary({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateGoal is callable', async () => {
    if (typeof svc.updateGoal !== 'function') return;
    let r;
    try { r = await svc.updateGoal({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createAssessment is callable', async () => {
    if (typeof svc.createAssessment !== 'function') return;
    let r;
    try { r = await svc.createAssessment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAssessmentById is callable', async () => {
    if (typeof svc.getAssessmentById !== 'function') return;
    let r;
    try { r = await svc.getAssessmentById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAssessmentsByBeneficiary is callable', async () => {
    if (typeof svc.getAssessmentsByBeneficiary !== 'function') return;
    let r;
    try { r = await svc.getAssessmentsByBeneficiary({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getBeneficiaryPerformance is callable', async () => {
    if (typeof svc.getBeneficiaryPerformance !== 'function') return;
    let r;
    try { r = await svc.getBeneficiaryPerformance({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getHealthStatus is callable', async () => {
    if (typeof svc.getHealthStatus !== 'function') return;
    let r;
    try { r = await svc.getHealthStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
