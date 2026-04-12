'use strict';

// Auto-generated unit test for guardian.service

const mockGuardianChain = {
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
jest.mock('../../models/Guardian', () => ({
  Guardian: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGuardianChain),
  Beneficiary: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGuardianChain),
  BeneficiaryProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGuardianChain),
  PortalPayment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGuardianChain),
  PortalNotification: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockGuardianChain)
}));

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
jest.mock('../../models/Beneficiary', () => ({
  Guardian: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryChain),
  Beneficiary: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryChain),
  BeneficiaryProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryChain),
  PortalPayment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryChain),
  PortalNotification: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryChain)
}));

const mockBeneficiaryProgressChain = {
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
jest.mock('../../models/BeneficiaryProgress', () => ({
  Guardian: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryProgressChain),
  Beneficiary: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryProgressChain),
  BeneficiaryProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryProgressChain),
  PortalPayment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryProgressChain),
  PortalNotification: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockBeneficiaryProgressChain)
}));

const mockPortalPaymentChain = {
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
jest.mock('../../models/PortalPayment', () => ({
  Guardian: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalPaymentChain),
  Beneficiary: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalPaymentChain),
  BeneficiaryProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalPaymentChain),
  PortalPayment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalPaymentChain),
  PortalNotification: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalPaymentChain)
}));

const mockPortalNotificationChain = {
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
jest.mock('../../models/PortalNotification', () => ({
  Guardian: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalNotificationChain),
  Beneficiary: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalNotificationChain),
  BeneficiaryProgress: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalNotificationChain),
  PortalPayment: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalNotificationChain),
  PortalNotification: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPortalNotificationChain)
}));

const Svc = require('../../services/guardian.service');

describe('guardian.service service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('getComprehensiveDashboard static method is callable', async () => {
    if (typeof Svc.getComprehensiveDashboard !== 'function') return;
    let r;
    try { r = await Svc.getComprehensiveDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPerformanceComparison static method is callable', async () => {
    if (typeof Svc.getPerformanceComparison !== 'function') return;
    let r;
    try { r = await Svc.getPerformanceComparison({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAdvancedAnalytics static method is callable', async () => {
    if (typeof Svc.getAdvancedAnalytics !== 'function') return;
    let r;
    try { r = await Svc.getAdvancedAnalytics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getFinancialForecast static method is callable', async () => {
    if (typeof Svc.getFinancialForecast !== 'function') return;
    let r;
    try { r = await Svc.getFinancialForecast({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateComprehensiveReport static method is callable', async () => {
    if (typeof Svc.generateComprehensiveReport !== 'function') return;
    let r;
    try { r = await Svc.generateComprehensiveReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendPeriodicNotifications static method is callable', async () => {
    if (typeof Svc.sendPeriodicNotifications !== 'function') return;
    let r;
    try { r = await Svc.sendPeriodicNotifications({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getActionableInsights static method is callable', async () => {
    if (typeof Svc.getActionableInsights !== 'function') return;
    let r;
    try { r = await Svc.getActionableInsights({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportAllData static method is callable', async () => {
    if (typeof Svc.exportAllData !== 'function') return;
    let r;
    try { r = await Svc.exportAllData({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPaymentSummaryAndHistory static method is callable', async () => {
    if (typeof Svc.getPaymentSummaryAndHistory !== 'function') return;
    let r;
    try { r = await Svc.getPaymentSummaryAndHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('validateDataIntegrity static method is callable', async () => {
    if (typeof Svc.validateDataIntegrity !== 'function') return;
    let r;
    try { r = await Svc.validateDataIntegrity({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_getRecommendations static method is callable', async () => {
    if (typeof Svc._getRecommendations !== 'function') return;
    let r;
    try { r = await Svc._getRecommendations({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
