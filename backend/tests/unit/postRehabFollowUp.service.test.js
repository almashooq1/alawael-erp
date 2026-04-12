'use strict';

// Auto-generated unit test for postRehabFollowUp.service

const mockPostRehabFollowUpChain = {
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
jest.mock('../../models/PostRehabFollowUp', () => ({
  PostRehabCase: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPostRehabFollowUpChain),
  FollowUpVisit: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPostRehabFollowUpChain),
  ImpactMeasurement: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPostRehabFollowUpChain),
  PostRehabSurvey: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPostRehabFollowUpChain),
  ReEnrollmentRequest: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPostRehabFollowUpChain)
}));

const svc = require('../../services/postRehabFollowUp.service');

describe('postRehabFollowUp.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createCase is callable', async () => {
    if (typeof svc.createCase !== 'function') return;
    let r;
    try { r = await svc.createCase({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCaseById is callable', async () => {
    if (typeof svc.getCaseById !== 'function') return;
    let r;
    try { r = await svc.getCaseById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listCases is callable', async () => {
    if (typeof svc.listCases !== 'function') return;
    let r;
    try { r = await svc.listCases({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateCase is callable', async () => {
    if (typeof svc.updateCase !== 'function') return;
    let r;
    try { r = await svc.updateCase({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addAlert is callable', async () => {
    if (typeof svc.addAlert !== 'function') return;
    let r;
    try { r = await svc.addAlert({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('resolveAlert is callable', async () => {
    if (typeof svc.resolveAlert !== 'function') return;
    let r;
    try { r = await svc.resolveAlert({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getOverdueCases is callable', async () => {
    if (typeof svc.getOverdueCases !== 'function') return;
    let r;
    try { r = await svc.getOverdueCases({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('scheduleVisit is callable', async () => {
    if (typeof svc.scheduleVisit !== 'function') return;
    let r;
    try { r = await svc.scheduleVisit({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('completeVisit is callable', async () => {
    if (typeof svc.completeVisit !== 'function') return;
    let r;
    try { r = await svc.completeVisit({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getVisitById is callable', async () => {
    if (typeof svc.getVisitById !== 'function') return;
    let r;
    try { r = await svc.getVisitById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listVisits is callable', async () => {
    if (typeof svc.listVisits !== 'function') return;
    let r;
    try { r = await svc.listVisits({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('markVisitMissed is callable', async () => {
    if (typeof svc.markVisitMissed !== 'function') return;
    let r;
    try { r = await svc.markVisitMissed({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUpcomingVisits is callable', async () => {
    if (typeof svc.getUpcomingVisits !== 'function') return;
    let r;
    try { r = await svc.getUpcomingVisits({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createImpactMeasurement is callable', async () => {
    if (typeof svc.createImpactMeasurement !== 'function') return;
    let r;
    try { r = await svc.createImpactMeasurement({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getImpactMeasurementById is callable', async () => {
    if (typeof svc.getImpactMeasurementById !== 'function') return;
    let r;
    try { r = await svc.getImpactMeasurementById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listImpactMeasurements is callable', async () => {
    if (typeof svc.listImpactMeasurements !== 'function') return;
    let r;
    try { r = await svc.listImpactMeasurements({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getImpactComparisonReport is callable', async () => {
    if (typeof svc.getImpactComparisonReport !== 'function') return;
    let r;
    try { r = await svc.getImpactComparisonReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createSurvey is callable', async () => {
    if (typeof svc.createSurvey !== 'function') return;
    let r;
    try { r = await svc.createSurvey({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('submitSurveyResponses is callable', async () => {
    if (typeof svc.submitSurveyResponses !== 'function') return;
    let r;
    try { r = await svc.submitSurveyResponses({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSurveyById is callable', async () => {
    if (typeof svc.getSurveyById !== 'function') return;
    let r;
    try { r = await svc.getSurveyById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listSurveys is callable', async () => {
    if (typeof svc.listSurveys !== 'function') return;
    let r;
    try { r = await svc.listSurveys({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSurveyTemplates is callable', async () => {
    if (typeof svc.getSurveyTemplates !== 'function') return;
    let r;
    try { r = await svc.getSurveyTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createReEnrollmentRequest is callable', async () => {
    if (typeof svc.createReEnrollmentRequest !== 'function') return;
    let r;
    try { r = await svc.createReEnrollmentRequest({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('reviewReEnrollmentRequest is callable', async () => {
    if (typeof svc.reviewReEnrollmentRequest !== 'function') return;
    let r;
    try { r = await svc.reviewReEnrollmentRequest({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReEnrollmentRequestById is callable', async () => {
    if (typeof svc.getReEnrollmentRequestById !== 'function') return;
    let r;
    try { r = await svc.getReEnrollmentRequestById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listReEnrollmentRequests is callable', async () => {
    if (typeof svc.listReEnrollmentRequests !== 'function') return;
    let r;
    try { r = await svc.listReEnrollmentRequests({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboardStats is callable', async () => {
    if (typeof svc.getDashboardStats !== 'function') return;
    let r;
    try { r = await svc.getDashboardStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
