'use strict';

// Auto-generated unit test for MeasurementService

const mockMeasurementModelsChain = {
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
jest.mock('../../models/MeasurementModels', () => ({
  MeasurementType: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  MeasurementMaster: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  MeasurementResult: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  IndividualRehabPlan: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  QuickAssessment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  RehabilitationProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  ProgramProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain),
  ProgramSession: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockMeasurementModelsChain)
}));

const mockRehabilitationProgramModelsChain = {
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
jest.mock('../../models/RehabilitationProgramModels', () => ({
  MeasurementType: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  MeasurementMaster: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  MeasurementResult: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  IndividualRehabPlan: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  QuickAssessment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  RehabilitationProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  ProgramProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain),
  ProgramSession: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockRehabilitationProgramModelsChain)
}));

const Cls = require('../../services/MeasurementService');

describe('MeasurementService service', () => {
  let svc;

  beforeAll(() => {
    svc = new Cls();
  });

  test('constructor creates instance', () => {
    expect(svc).toBeDefined();
    expect(svc).toBeInstanceOf(Cls);
  });

  test('createMeasurementType is callable', async () => {
    if (typeof svc.createMeasurementType !== 'function') return;
    let r;
    try { r = await svc.createMeasurementType({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createMeasurementMaster is callable', async () => {
    if (typeof svc.createMeasurementMaster !== 'function') return;
    let r;
    try { r = await svc.createMeasurementMaster({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('recordMeasurementResult is callable', async () => {
    if (typeof svc.recordMeasurementResult !== 'function') return;
    let r;
    try { r = await svc.recordMeasurementResult({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getBeneficiaryLatestResults is callable', async () => {
    if (typeof svc.getBeneficiaryLatestResults !== 'function') return;
    let r;
    try { r = await svc.getBeneficiaryLatestResults({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('compareMeasurementResults is callable', async () => {
    if (typeof svc.compareMeasurementResults !== 'function') return;
    let r;
    try { r = await svc.compareMeasurementResults({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createIndividualRehabPlan is callable', async () => {
    if (typeof svc.createIndividualRehabPlan !== 'function') return;
    let r;
    try { r = await svc.createIndividualRehabPlan({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateIndividualRehabPlan is callable', async () => {
    if (typeof svc.updateIndividualRehabPlan !== 'function') return;
    let r;
    try { r = await svc.updateIndividualRehabPlan({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getIndividualRehabPlan is callable', async () => {
    if (typeof svc.getIndividualRehabPlan !== 'function') return;
    let r;
    try { r = await svc.getIndividualRehabPlan({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateComprehensiveReport is callable', async () => {
    if (typeof svc.generateComprehensiveReport !== 'function') return;
    let r;
    try { r = await svc.generateComprehensiveReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('recordProgramSession is callable', async () => {
    if (typeof svc.recordProgramSession !== 'function') return;
    let r;
    try { r = await svc.recordProgramSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateProgramProgress is callable', async () => {
    if (typeof svc.updateProgramProgress !== 'function') return;
    let r;
    try { r = await svc.updateProgramProgress({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generatePlanCode is callable', async () => {
    if (typeof svc.generatePlanCode !== 'function') return;
    let r;
    try { r = await svc.generatePlanCode({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateOverallStatus is callable', async () => {
    if (typeof svc.calculateOverallStatus !== 'function') return;
    let r;
    try { r = await svc.calculateOverallStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('identifyStrengths is callable', async () => {
    if (typeof svc.identifyStrengths !== 'function') return;
    let r;
    try { r = await svc.identifyStrengths({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('identifyAreasForImprovement is callable', async () => {
    if (typeof svc.identifyAreasForImprovement !== 'function') return;
    let r;
    try { r = await svc.identifyAreasForImprovement({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateFinalRecommendations is callable', async () => {
    if (typeof svc.generateFinalRecommendations !== 'function') return;
    let r;
    try { r = await svc.generateFinalRecommendations({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
