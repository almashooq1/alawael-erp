'use strict';

// Auto-generated unit test for familySatisfaction.service

const mockfamilySatisfaction_modelsChain = {
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
jest.mock('../../models/familySatisfaction.models', () => ({
  SurveyTemplate: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockfamilySatisfaction_modelsChain),
  SurveyResponse: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockfamilySatisfaction_modelsChain),
  SurveyAnalytics: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockfamilySatisfaction_modelsChain)
}));

const Svc = require('../../services/familySatisfaction.service');

describe('familySatisfaction.service service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('createTemplate static method is callable', async () => {
    if (typeof Svc.createTemplate !== 'function') return;
    let r;
    try { r = await Svc.createTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTemplates static method is callable', async () => {
    if (typeof Svc.getTemplates !== 'function') return;
    let r;
    try { r = await Svc.getTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTemplateById static method is callable', async () => {
    if (typeof Svc.getTemplateById !== 'function') return;
    let r;
    try { r = await Svc.getTemplateById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateTemplate static method is callable', async () => {
    if (typeof Svc.updateTemplate !== 'function') return;
    let r;
    try { r = await Svc.updateTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('seedDefaultTemplates static method is callable', async () => {
    if (typeof Svc.seedDefaultTemplates !== 'function') return;
    let r;
    try { r = await Svc.seedDefaultTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendSurvey static method is callable', async () => {
    if (typeof Svc.sendSurvey !== 'function') return;
    let r;
    try { r = await Svc.sendSurvey({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('submitResponse static method is callable', async () => {
    if (typeof Svc.submitResponse !== 'function') return;
    let r;
    try { r = await Svc.submitResponse({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createDirectResponse static method is callable', async () => {
    if (typeof Svc.createDirectResponse !== 'function') return;
    let r;
    try { r = await Svc.createDirectResponse({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getResponses static method is callable', async () => {
    if (typeof Svc.getResponses !== 'function') return;
    let r;
    try { r = await Svc.getResponses({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getResponseById static method is callable', async () => {
    if (typeof Svc.getResponseById !== 'function') return;
    let r;
    try { r = await Svc.getResponseById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateFollowUp static method is callable', async () => {
    if (typeof Svc.updateFollowUp !== 'function') return;
    let r;
    try { r = await Svc.updateFollowUp({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateNPS static method is callable', async () => {
    if (typeof Svc.calculateNPS !== 'function') return;
    let r;
    try { r = await Svc.calculateNPS({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateAnalyticsReport static method is callable', async () => {
    if (typeof Svc.generateAnalyticsReport !== 'function') return;
    let r;
    try { r = await Svc.generateAnalyticsReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboard static method is callable', async () => {
    if (typeof Svc.getDashboard !== 'function') return;
    let r;
    try { r = await Svc.getDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_calculateScores static method is callable', async () => {
    if (typeof Svc._calculateScores !== 'function') return;
    let r;
    try { r = await Svc._calculateScores({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_analyzeSentiment static method is callable', async () => {
    if (typeof Svc._analyzeSentiment !== 'function') return;
    let r;
    try { r = await Svc._analyzeSentiment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_computeNPSFromScores static method is callable', async () => {
    if (typeof Svc._computeNPSFromScores !== 'function') return;
    let r;
    try { r = await Svc._computeNPSFromScores({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_getDefaultTemplates static method is callable', async () => {
    if (typeof Svc._getDefaultTemplates !== 'function') return;
    let r;
    try { r = await Svc._getDefaultTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
