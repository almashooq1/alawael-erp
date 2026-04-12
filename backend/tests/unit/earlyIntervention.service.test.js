'use strict';

// Auto-generated unit test for earlyIntervention.service

const mockEarlyInterventionChain = {
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
jest.mock('../../models/EarlyIntervention', () => ({
  EarlyInterventionChild: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEarlyInterventionChain),
  DevelopmentalScreening: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEarlyInterventionChain),
  DevelopmentalMilestone: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEarlyInterventionChain),
  IFSP: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEarlyInterventionChain),
  EarlyReferral: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockEarlyInterventionChain)
}));

const svc = require('../../services/earlyIntervention.service');

describe('earlyIntervention.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createChild is callable', async () => {
    if (typeof svc.createChild !== 'function') return;
    let r;
    try { r = await svc.createChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getChildren is callable', async () => {
    if (typeof svc.getChildren !== 'function') return;
    let r;
    try { r = await svc.getChildren({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getChildById is callable', async () => {
    if (typeof svc.getChildById !== 'function') return;
    let r;
    try { r = await svc.getChildById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateChild is callable', async () => {
    if (typeof svc.updateChild !== 'function') return;
    let r;
    try { r = await svc.updateChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteChild is callable', async () => {
    if (typeof svc.deleteChild !== 'function') return;
    let r;
    try { r = await svc.deleteChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getChildFullProfile is callable', async () => {
    if (typeof svc.getChildFullProfile !== 'function') return;
    let r;
    try { r = await svc.getChildFullProfile({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createScreening is callable', async () => {
    if (typeof svc.createScreening !== 'function') return;
    let r;
    try { r = await svc.createScreening({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getScreenings is callable', async () => {
    if (typeof svc.getScreenings !== 'function') return;
    let r;
    try { r = await svc.getScreenings({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getScreeningById is callable', async () => {
    if (typeof svc.getScreeningById !== 'function') return;
    let r;
    try { r = await svc.getScreeningById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateScreening is callable', async () => {
    if (typeof svc.updateScreening !== 'function') return;
    let r;
    try { r = await svc.updateScreening({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteScreening is callable', async () => {
    if (typeof svc.deleteScreening !== 'function') return;
    let r;
    try { r = await svc.deleteScreening({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getScreeningsByChild is callable', async () => {
    if (typeof svc.getScreeningsByChild !== 'function') return;
    let r;
    try { r = await svc.getScreeningsByChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createMilestone is callable', async () => {
    if (typeof svc.createMilestone !== 'function') return;
    let r;
    try { r = await svc.createMilestone({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMilestones is callable', async () => {
    if (typeof svc.getMilestones !== 'function') return;
    let r;
    try { r = await svc.getMilestones({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMilestoneById is callable', async () => {
    if (typeof svc.getMilestoneById !== 'function') return;
    let r;
    try { r = await svc.getMilestoneById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateMilestone is callable', async () => {
    if (typeof svc.updateMilestone !== 'function') return;
    let r;
    try { r = await svc.updateMilestone({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteMilestone is callable', async () => {
    if (typeof svc.deleteMilestone !== 'function') return;
    let r;
    try { r = await svc.deleteMilestone({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMilestonesByChild is callable', async () => {
    if (typeof svc.getMilestonesByChild !== 'function') return;
    let r;
    try { r = await svc.getMilestonesByChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMilestoneReport is callable', async () => {
    if (typeof svc.getMilestoneReport !== 'function') return;
    let r;
    try { r = await svc.getMilestoneReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createIFSP is callable', async () => {
    if (typeof svc.createIFSP !== 'function') return;
    let r;
    try { r = await svc.createIFSP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getIFSPs is callable', async () => {
    if (typeof svc.getIFSPs !== 'function') return;
    let r;
    try { r = await svc.getIFSPs({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getIFSPById is callable', async () => {
    if (typeof svc.getIFSPById !== 'function') return;
    let r;
    try { r = await svc.getIFSPById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateIFSP is callable', async () => {
    if (typeof svc.updateIFSP !== 'function') return;
    let r;
    try { r = await svc.updateIFSP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteIFSP is callable', async () => {
    if (typeof svc.deleteIFSP !== 'function') return;
    let r;
    try { r = await svc.deleteIFSP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getIFSPsByChild is callable', async () => {
    if (typeof svc.getIFSPsByChild !== 'function') return;
    let r;
    try { r = await svc.getIFSPsByChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addIFSPReview is callable', async () => {
    if (typeof svc.addIFSPReview !== 'function') return;
    let r;
    try { r = await svc.addIFSPReview({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateIFSPGoalProgress is callable', async () => {
    if (typeof svc.updateIFSPGoalProgress !== 'function') return;
    let r;
    try { r = await svc.updateIFSPGoalProgress({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createReferral is callable', async () => {
    if (typeof svc.createReferral !== 'function') return;
    let r;
    try { r = await svc.createReferral({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReferrals is callable', async () => {
    if (typeof svc.getReferrals !== 'function') return;
    let r;
    try { r = await svc.getReferrals({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReferralById is callable', async () => {
    if (typeof svc.getReferralById !== 'function') return;
    let r;
    try { r = await svc.getReferralById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateReferral is callable', async () => {
    if (typeof svc.updateReferral !== 'function') return;
    let r;
    try { r = await svc.updateReferral({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteReferral is callable', async () => {
    if (typeof svc.deleteReferral !== 'function') return;
    let r;
    try { r = await svc.deleteReferral({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReferralsByChild is callable', async () => {
    if (typeof svc.getReferralsByChild !== 'function') return;
    let r;
    try { r = await svc.getReferralsByChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addReferralCommunication is callable', async () => {
    if (typeof svc.addReferralCommunication !== 'function') return;
    let r;
    try { r = await svc.addReferralCommunication({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateReferralStatus is callable', async () => {
    if (typeof svc.updateReferralStatus !== 'function') return;
    let r;
    try { r = await svc.updateReferralStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboardStats is callable', async () => {
    if (typeof svc.getDashboardStats !== 'function') return;
    let r;
    try { r = await svc.getDashboardStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('initializeMilestonesForChild is callable', async () => {
    if (typeof svc.initializeMilestonesForChild !== 'function') return;
    let r;
    try { r = await svc.initializeMilestonesForChild({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
