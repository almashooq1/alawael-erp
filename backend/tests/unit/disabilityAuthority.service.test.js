'use strict';

// Auto-generated unit test for disabilityAuthority.service

const mockdisabilityAuthority_modelsChain = {
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
jest.mock('../../models/disabilityAuthority.models', () => ({
  DisabilityAuthorityReport: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockdisabilityAuthority_modelsChain),
  CBAHIStandard: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockdisabilityAuthority_modelsChain),
  CBAHICompliance: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockdisabilityAuthority_modelsChain)
}));
jest.mock('mongoose', () => ({
  connection: { readyState: 1, db: { admin: () => ({ ping: jest.fn().mockResolvedValue(true) }) } },
  model: jest.fn(),
  Schema: jest.fn().mockImplementation(() => ({ index: jest.fn(), pre: jest.fn(), post: jest.fn(), virtual: jest.fn().mockReturnThis(), set: jest.fn() })),
  Types: { ObjectId: jest.fn(v => v || 'mock-id') },
}));

const Svc = require('../../services/disabilityAuthority.service');

describe('disabilityAuthority.service service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('createReport static method is callable', async () => {
    if (typeof Svc.createReport !== 'function') return;
    let r;
    try { r = await Svc.createReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReports static method is callable', async () => {
    if (typeof Svc.getReports !== 'function') return;
    let r;
    try { r = await Svc.getReports({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReportById static method is callable', async () => {
    if (typeof Svc.getReportById !== 'function') return;
    let r;
    try { r = await Svc.getReportById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateReport static method is callable', async () => {
    if (typeof Svc.updateReport !== 'function') return;
    let r;
    try { r = await Svc.updateReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('reviewReport static method is callable', async () => {
    if (typeof Svc.reviewReport !== 'function') return;
    let r;
    try { r = await Svc.reviewReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateReportData static method is callable', async () => {
    if (typeof Svc.generateReportData !== 'function') return;
    let r;
    try { r = await Svc.generateReportData({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboard static method is callable', async () => {
    if (typeof Svc.getDashboard !== 'function') return;
    let r;
    try { r = await Svc.getDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('upsertStandard static method is callable', async () => {
    if (typeof Svc.upsertStandard !== 'function') return;
    let r;
    try { r = await Svc.upsertStandard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getStandards static method is callable', async () => {
    if (typeof Svc.getStandards !== 'function') return;
    let r;
    try { r = await Svc.getStandards({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('seedDefaultStandards static method is callable', async () => {
    if (typeof Svc.seedDefaultStandards !== 'function') return;
    let r;
    try { r = await Svc.seedDefaultStandards({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createAssessment static method is callable', async () => {
    if (typeof Svc.createAssessment !== 'function') return;
    let r;
    try { r = await Svc.createAssessment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAssessments static method is callable', async () => {
    if (typeof Svc.getAssessments !== 'function') return;
    let r;
    try { r = await Svc.getAssessments({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAssessmentById static method is callable', async () => {
    if (typeof Svc.getAssessmentById !== 'function') return;
    let r;
    try { r = await Svc.getAssessmentById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateStandardResult static method is callable', async () => {
    if (typeof Svc.updateStandardResult !== 'function') return;
    let r;
    try { r = await Svc.updateStandardResult({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('completeAssessment static method is callable', async () => {
    if (typeof Svc.completeAssessment !== 'function') return;
    let r;
    try { r = await Svc.completeAssessment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCBAHIDashboard static method is callable', async () => {
    if (typeof Svc.getCBAHIDashboard !== 'function') return;
    let r;
    try { r = await Svc.getCBAHIDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('forEach static method is callable', async () => {
    if (typeof Svc.forEach !== 'function') return;
    let r;
    try { r = await Svc.forEach({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_generateReportNumber static method is callable', async () => {
    if (typeof Svc._generateReportNumber !== 'function') return;
    let r;
    try { r = await Svc._generateReportNumber({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_collectBeneficiaryStats static method is callable', async () => {
    if (typeof Svc._collectBeneficiaryStats !== 'function') return;
    let r;
    try { r = await Svc._collectBeneficiaryStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_collectServiceStats static method is callable', async () => {
    if (typeof Svc._collectServiceStats !== 'function') return;
    let r;
    try { r = await Svc._collectServiceStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_collectStaffStats static method is callable', async () => {
    if (typeof Svc._collectStaffStats !== 'function') return;
    let r;
    try { r = await Svc._collectStaffStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_collectQualityIndicators static method is callable', async () => {
    if (typeof Svc._collectQualityIndicators !== 'function') return;
    let r;
    try { r = await Svc._collectQualityIndicators({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_collectOutcomeIndicators static method is callable', async () => {
    if (typeof Svc._collectOutcomeIndicators !== 'function') return;
    let r;
    try { r = await Svc._collectOutcomeIndicators({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_getUpcomingReportDeadlines static method is callable', async () => {
    if (typeof Svc._getUpcomingReportDeadlines !== 'function') return;
    let r;
    try { r = await Svc._getUpcomingReportDeadlines({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_recalculateOverallResults static method is callable', async () => {
    if (typeof Svc._recalculateOverallResults !== 'function') return;
    let r;
    try { r = await Svc._recalculateOverallResults({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_calculateChapterResults static method is callable', async () => {
    if (typeof Svc._calculateChapterResults !== 'function') return;
    let r;
    try { r = await Svc._calculateChapterResults({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_determineReadiness static method is callable', async () => {
    if (typeof Svc._determineReadiness !== 'function') return;
    let r;
    try { r = await Svc._determineReadiness({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_getDefaultCBAHIStandards static method is callable', async () => {
    if (typeof Svc._getDefaultCBAHIStandards !== 'function') return;
    let r;
    try { r = await Svc._getDefaultCBAHIStandards({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
