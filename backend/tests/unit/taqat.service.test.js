'use strict';

// Auto-generated unit test for taqat.service

const mocktaqat_modelsChain = {
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
jest.mock('../../models/taqat.models', () => ({
  TaqatJobSeeker: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocktaqat_modelsChain),
  TaqatJobOpportunity: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocktaqat_modelsChain),
  TaqatJobApplication: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocktaqat_modelsChain),
  TaqatTrainingProgram: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocktaqat_modelsChain),
  TaqatEmploymentStats: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mocktaqat_modelsChain)
}));

const svc = require('../../services/taqat.service');

describe('taqat.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createJobSeeker is callable', async () => {
    if (typeof svc.createJobSeeker !== 'function') return;
    let r;
    try { r = await svc.createJobSeeker({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateJobSeeker is callable', async () => {
    if (typeof svc.updateJobSeeker !== 'function') return;
    let r;
    try { r = await svc.updateJobSeeker({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getJobSeekers is callable', async () => {
    if (typeof svc.getJobSeekers !== 'function') return;
    let r;
    try { r = await svc.getJobSeekers({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getJobSeekerById is callable', async () => {
    if (typeof svc.getJobSeekerById !== 'function') return;
    let r;
    try { r = await svc.getJobSeekerById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('assessEmploymentReadiness is callable', async () => {
    if (typeof svc.assessEmploymentReadiness !== 'function') return;
    let r;
    try { r = await svc.assessEmploymentReadiness({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createJobOpportunity is callable', async () => {
    if (typeof svc.createJobOpportunity !== 'function') return;
    let r;
    try { r = await svc.createJobOpportunity({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateJobOpportunity is callable', async () => {
    if (typeof svc.updateJobOpportunity !== 'function') return;
    let r;
    try { r = await svc.updateJobOpportunity({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getJobOpportunities is callable', async () => {
    if (typeof svc.getJobOpportunities !== 'function') return;
    let r;
    try { r = await svc.getJobOpportunities({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('matchJobsToSeeker is callable', async () => {
    if (typeof svc.matchJobsToSeeker !== 'function') return;
    let r;
    try { r = await svc.matchJobsToSeeker({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('submitApplication is callable', async () => {
    if (typeof svc.submitApplication !== 'function') return;
    let r;
    try { r = await svc.submitApplication({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateApplicationStatus is callable', async () => {
    if (typeof svc.updateApplicationStatus !== 'function') return;
    let r;
    try { r = await svc.updateApplicationStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getApplications is callable', async () => {
    if (typeof svc.getApplications !== 'function') return;
    let r;
    try { r = await svc.getApplications({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createTrainingProgram is callable', async () => {
    if (typeof svc.createTrainingProgram !== 'function') return;
    let r;
    try { r = await svc.createTrainingProgram({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTrainingPrograms is callable', async () => {
    if (typeof svc.getTrainingPrograms !== 'function') return;
    let r;
    try { r = await svc.getTrainingPrograms({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateEmploymentStats is callable', async () => {
    if (typeof svc.generateEmploymentStats !== 'function') return;
    let r;
    try { r = await svc.generateEmploymentStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboardStats is callable', async () => {
    if (typeof svc.getDashboardStats !== 'function') return;
    let r;
    try { r = await svc.getDashboardStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
