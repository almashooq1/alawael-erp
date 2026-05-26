'use strict';

/**
 * branch-isolation-assessment-recommendation-wave269f.test.js — Wave 269f.
 *
 * Verifies cross-branch isolation fixes applied to W206/W207 routes:
 *
 *   POST /recommend/accept                — body.beneficiaryId
 *   GET  /history/:beneficiaryId          — path
 *   GET  /outcomes/:beneficiaryId         — path
 *   GET  /analytics?branchId=             — query (force own when restricted)
 *   GET  /history/bundle/:bundleId        — bundle.beneficiary lookup
 */

describe('W269f — assessmentRecommendation cross-branch denial', () => {
  let router;
  let beneficiaryModel;
  let bundleModel;
  let smartGoalModel;
  let carePlanModel;
  let analyticsStub;
  let outcomesStub;

  beforeAll(() => {
    jest.resetModules();

    analyticsStub = { getReport: jest.fn() };
    outcomesStub = { getOutcomeReport: jest.fn() };

    // Stub the analytics + outcomes factory exports so we control them.
    jest.doMock('../services/assessmentBundleAnalytics.service', () => () => analyticsStub);
    jest.doMock('../services/assessmentBundleOutcomes.service', () => () => outcomesStub);

    const mongoose = require('mongoose');
    beneficiaryModel = { findById: jest.fn() };
    bundleModel = {
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    smartGoalModel = {};
    carePlanModel = {};
    const fakeOther = {
      findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
      findById: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') return beneficiaryModel;
      if (name === 'AssessmentRecommendationBundle') return bundleModel;
      if (name === 'SmartGoal') return smartGoalModel;
      if (name === 'CarePlan') return carePlanModel;
      return fakeOther;
    });

    router = require('../routes/assessmentRecommendation.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/assessmentBundleAnalytics.service');
    jest.dontMock('../services/assessmentBundleOutcomes.service');
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    beneficiaryModel.findById.mockReset();
    bundleModel.findById.mockReset();
    bundleModel.find.mockReset && bundleModel.find.mockReset();
    bundleModel.countDocuments.mockReset();
    analyticsStub.getReport.mockReset();
    outcomesStub.getOutcomeReport.mockReset();
  });

  function _findHandler(method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function _mockRes() {
    const res = {};
    res.status = jest.fn(code => {
      res._status = code;
      return res;
    });
    res.json = jest.fn(body => {
      res._body = body;
      return res;
    });
    return res;
  }

  function _mockBeneficiary(branchId) {
    beneficiaryModel.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'ben1', branchId }),
      }),
    });
  }

  const VALID_OID = '507f1f77bcf86cd799439011';

  test('GET /history/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/history/:beneficiaryId');
    expect(handler).toBeTruthy();
    const req = {
      params: { beneficiaryId: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  test('GET /outcomes/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/outcomes/:beneficiaryId');
    const req = {
      params: { beneficiaryId: VALID_OID },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(outcomesStub.getOutcomeReport).not.toHaveBeenCalled();
  });

  test('POST /recommend/accept rejects 403 when beneficiary in another branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('post', '/recommend/accept');
    const req = {
      body: {
        beneficiaryId: VALID_OID,
        acceptedGoals: [{ name_ar: 'goal', domain: 'motor' }],
      },
      user: { _id: 'u' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  test('GET /analytics: restricted role forces own branchId regardless of query', async () => {
    analyticsStub.getReport.mockResolvedValue({ bundles: 0 });
    const VALID_QUERY_OID = '507f1f77bcf86cd799439021';
    const VALID_OWN_OID = '507f1f77bcf86cd799439022';
    const handler = _findHandler('get', '/analytics');
    const req = {
      query: { branchId: VALID_QUERY_OID },
      branchScope: { restricted: true, branchId: VALID_OWN_OID },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    // The opts.branchId passed to getReport MUST be the caller's own,
    // not the spoofed query value.
    const opts = analyticsStub.getReport.mock.calls[0][0];
    expect(String(opts.branchId)).toBe(VALID_OWN_OID);
  });

  test('GET /history/bundle/:bundleId returns 403 cross-branch via bundle.beneficiary', async () => {
    bundleModel.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: VALID_OID, beneficiary: 'ben-foreign' }),
    });
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/history/bundle/:bundleId');
    const req = {
      params: { bundleId: VALID_OID },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  test('GET /history/bundle/:bundleId returns 404 when bundle missing (no info leak)', async () => {
    bundleModel.findById.mockReturnValue({ lean: () => Promise.resolve(null) });
    const handler = _findHandler('get', '/history/bundle/:bundleId');
    const req = {
      params: { bundleId: VALID_OID },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  test('GET /history/:beneficiaryId — cross-branch role passes lookup-free', async () => {
    bundleModel.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          skip: () => ({ lean: () => Promise.resolve([]) }),
        }),
      }),
    });
    bundleModel.countDocuments.mockResolvedValue(0);
    const handler = _findHandler('get', '/history/:beneficiaryId');
    const req = {
      params: { beneficiaryId: VALID_OID },
      query: {},
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });
});
