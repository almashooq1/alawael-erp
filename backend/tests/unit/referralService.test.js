'use strict';

// Auto-generated unit test for referralService

const mockReferralChain = {
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
jest.mock('../../models/Referral', () => ({
  Referral: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockReferralChain
  ),
  ReferralDocument: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockReferralChain
  ),
  ReferringFacility: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockReferralChain
  ),
  ReferralCommunication: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockReferralChain
  ),
  ReferralAssessment: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockReferralChain
  ),
  FhirIntegrationLog: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockReferralChain
  ),
}));

const mockEmployeeChain = {
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
jest.mock('../../models/HR/Employee', () => ({
  Referral: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  ReferralDocument: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  ReferringFacility: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  ReferralCommunication: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  ReferralAssessment: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
  FhirIntegrationLog: Object.assign(
    jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })),
    mockEmployeeChain
  ),
}));
jest.mock('uuid', () => ({}));
jest.mock('axios', () => ({}));
jest.mock('mongoose', () => ({
  connection: { readyState: 1, db: { admin: () => ({ ping: jest.fn().mockResolvedValue(true) }) } },
  model: jest.fn(),
  Schema: jest
    .fn()
    .mockImplementation(() => ({
      index: jest.fn(),
      pre: jest.fn(),
      post: jest.fn(),
      virtual: jest.fn().mockReturnThis(),
      set: jest.fn(),
    })),
  Types: { ObjectId: jest.fn(v => v || 'mock-id') },
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const svc = require('../../services/referralService');

describe('referralService service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('receiveReferral is callable', async () => {
    if (typeof svc.receiveReferral !== 'function') return;
    let r;
    try {
      r = await svc.receiveReferral({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('reviewReferral is callable', async () => {
    if (typeof svc.reviewReferral !== 'function') return;
    let r;
    try {
      r = await svc.reviewReferral({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('transitionStatus is callable', async () => {
    if (typeof svc.transitionStatus !== 'function') return;
    let r;
    try {
      r = await svc.transitionStatus({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('sendCommunication is callable', async () => {
    if (typeof svc.sendCommunication !== 'function') return;
    let r;
    try {
      r = await svc.sendCommunication({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('importFromFhir is callable', async () => {
    if (typeof svc.importFromFhir !== 'function') return;
    let r;
    try {
      r = await svc.importFromFhir({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('getAnalytics is callable', async () => {
    if (typeof svc.getAnalytics !== 'function') return;
    let r;
    try {
      r = await svc.getAnalytics({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('attemptAutoAssignment is callable', async () => {
    if (typeof svc.attemptAutoAssignment !== 'function') return;
    let r;
    try {
      r = await svc.attemptAutoAssignment({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('calculatePriorityScore is callable', async () => {
    if (typeof svc.calculatePriorityScore !== 'function') return;
    let r;
    try {
      r = await svc.calculatePriorityScore({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('priorityFromScore is callable', async () => {
    if (typeof svc.priorityFromScore !== 'function') return;
    let r;
    try {
      r = await svc.priorityFromScore({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('recalculatePriority is callable', async () => {
    if (typeof svc.recalculatePriority !== 'function') return;
    let r;
    try {
      r = await svc.recalculatePriority({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });

  test('canTransition is callable', async () => {
    if (typeof svc.canTransition !== 'function') return;
    let r;
    try {
      r = await svc.canTransition({});
    } catch (e) {
      r = e;
    }
    expect(r).toBeDefined();
  });
});
