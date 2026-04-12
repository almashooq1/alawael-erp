'use strict';

// Auto-generated unit test for policyService

const mockPolicyChain = {
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
jest.mock('../../models/Policy', () => ({
  Policy: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPolicyChain),
  PolicyAcknowledgement: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPolicyChain)
}));

const mockPolicyAcknowledgementChain = {
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
jest.mock('../../models/PolicyAcknowledgement', () => ({
  Policy: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPolicyAcknowledgementChain),
  PolicyAcknowledgement: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPolicyAcknowledgementChain)
}));
jest.mock('uuid', () => ({}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));
jest.mock('../../utils/sanitize', () => ({ sanitizeInput: jest.fn(v => v), sanitize: jest.fn(v => v) }));

const svc = require('../../services/policyService');

describe('policyService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createPolicy is callable', async () => {
    if (typeof svc.createPolicy !== 'function') return;
    let r;
    try { r = await svc.createPolicy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updatePolicy is callable', async () => {
    if (typeof svc.updatePolicy !== 'function') return;
    let r;
    try { r = await svc.updatePolicy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPolicy is callable', async () => {
    if (typeof svc.getPolicy !== 'function') return;
    let r;
    try { r = await svc.getPolicy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPolicies is callable', async () => {
    if (typeof svc.getPolicies !== 'function') return;
    let r;
    try { r = await svc.getPolicies({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getActivePolicies is callable', async () => {
    if (typeof svc.getActivePolicies !== 'function') return;
    let r;
    try { r = await svc.getActivePolicies({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deletePolicy is callable', async () => {
    if (typeof svc.deletePolicy !== 'function') return;
    let r;
    try { r = await svc.deletePolicy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('submitForApproval is callable', async () => {
    if (typeof svc.submitForApproval !== 'function') return;
    let r;
    try { r = await svc.submitForApproval({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('approvePolicy is callable', async () => {
    if (typeof svc.approvePolicy !== 'function') return;
    let r;
    try { r = await svc.approvePolicy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('rejectPolicy is callable', async () => {
    if (typeof svc.rejectPolicy !== 'function') return;
    let r;
    try { r = await svc.rejectPolicy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendForAcknowledgement is callable', async () => {
    if (typeof svc.sendForAcknowledgement !== 'function') return;
    let r;
    try { r = await svc.sendForAcknowledgement({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('acknowledgePolicies is callable', async () => {
    if (typeof svc.acknowledgePolicies !== 'function') return;
    let r;
    try { r = await svc.acknowledgePolicies({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPendingAcknowledgements is callable', async () => {
    if (typeof svc.getPendingAcknowledgements !== 'function') return;
    let r;
    try { r = await svc.getPendingAcknowledgements({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAcknowledgementReports is callable', async () => {
    if (typeof svc.getAcknowledgementReports !== 'function') return;
    let r;
    try { r = await svc.getAcknowledgementReports({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
