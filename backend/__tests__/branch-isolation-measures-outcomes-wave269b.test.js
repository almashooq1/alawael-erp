'use strict';

/**
 * branch-isolation-measures-outcomes-wave269b.test.js — Wave 269b.
 *
 * Extends the W269 security fix to the four beneficiary-keyed routes
 * in measures-outcomes.routes.js that the original review didn't
 * cover (because that scope was limited to the 12 W263/W264/W267
 * files):
 *
 *   GET /beneficiary/:beneficiaryId        (W229 cross-measure aggregator)
 *   GET /family-report/:beneficiaryId      (W241 family-friendly Arabic report)
 *   GET /clinical-report/:beneficiaryId    (W246 clinical deep-dive)
 *   GET /ministry-comparison?branchIds=…   (W251 multi-branch comparison)
 *
 * The first three had the same IDOR pattern as W269 Vuln 2 (path-keyed
 * lookup with no branch ownership check). The fourth had a
 * branchIds-plural list that slipped past requireBranchAccess (which
 * only checks the singular branchId form).
 *
 * Strategy: direct-exec handler invocation w/ jest.doMock stubs +
 * jest.spyOn(mongoose, 'model') to intercept Beneficiary lookups.
 */

describe('W269b — assertBranchIdsAllowed + loadBeneficiaryAndAssertBranch helpers', () => {
  const {
    assertBranchIdsAllowed,
    loadBeneficiaryAndAssertBranch,
  } = require('../middleware/assertBranchMatch');

  test('assertBranchIdsAllowed: cross-branch caller is no-op', () => {
    const req = { branchScope: { restricted: false, branchId: null } };
    expect(() => assertBranchIdsAllowed(req, ['A', 'B', 'C'])).not.toThrow();
  });

  test('assertBranchIdsAllowed: restricted + all-own-branch passes', () => {
    const req = { branchScope: { restricted: true, branchId: 'A' } };
    expect(() => assertBranchIdsAllowed(req, ['A', 'A'])).not.toThrow();
  });

  test('assertBranchIdsAllowed: restricted + foreign in list throws 403', () => {
    const req = { branchScope: { restricted: true, branchId: 'A' } };
    let err;
    try {
      assertBranchIdsAllowed(req, ['A', 'B']);
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/B/);
  });

  test('assertBranchIdsAllowed: empty list is no-op', () => {
    const req = { branchScope: { restricted: true, branchId: 'A' } };
    expect(() => assertBranchIdsAllowed(req, [])).not.toThrow();
    expect(() => assertBranchIdsAllowed(req, null)).not.toThrow();
  });

  test('assertBranchIdsAllowed: restricted with no own branchId fails closed', () => {
    const req = { branchScope: { restricted: true, branchId: null } };
    expect(() => assertBranchIdsAllowed(req, ['A'])).toThrow(/fail-closed/);
  });
});

// ════════════════════════════════════════════════════════════════════
// Route handler tests via direct-exec + mongoose.model spy
// ════════════════════════════════════════════════════════════════════

function _findHandler(router, method, path) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
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

describe('W269b — measures-outcomes routes cross-branch denial', () => {
  let aggregatorStub;
  let familyReportStub;
  let clinicalReportStub;
  let ministryComparisonStub;
  let router;
  let beneficiaryModel;

  beforeAll(() => {
    jest.resetModules();
    aggregatorStub = {
      aggregateBeneficiary: jest.fn(),
      aggregateBranch: jest.fn(),
      aggregateBranchTimeseries: jest.fn(),
      listMeasurePairsAt: jest.fn(),
    };
    familyReportStub = { generate: jest.fn() };
    clinicalReportStub = { generate: jest.fn() };
    ministryComparisonStub = { compareBranches: jest.fn() };
    jest.doMock('../services/measureOutcomesAggregator.service', () => aggregatorStub);
    jest.doMock('../services/measureFamilyReport.service', () => familyReportStub);
    jest.doMock('../services/measureClinicalReport.service', () => clinicalReportStub);
    jest.doMock('../services/measureMinistryComparison.service', () => ministryComparisonStub);
    // The W244 ministry-report service is required at module load too.
    jest.doMock('../services/measureMinistryReport.service', () => ({
      generate: jest.fn(),
    }));

    // Spy mongoose.model so loadBeneficiaryAndAssertBranch can fetch
    // a fake Beneficiary record without a live DB.
    const mongoose = require('mongoose');
    beneficiaryModel = {
      findById: jest.fn(),
    };
    const originalModel = mongoose.model.bind(mongoose);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') return beneficiaryModel;
      return originalModel(name);
    });

    router = require('../routes/measures-outcomes.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/measureOutcomesAggregator.service');
    jest.dontMock('../services/measureFamilyReport.service');
    jest.dontMock('../services/measureClinicalReport.service');
    jest.dontMock('../services/measureMinistryComparison.service');
    jest.dontMock('../services/measureMinistryReport.service');
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    aggregatorStub.aggregateBeneficiary.mockReset();
    familyReportStub.generate.mockReset();
    clinicalReportStub.generate.mockReset();
    ministryComparisonStub.compareBranches.mockReset();
    beneficiaryModel.findById.mockReset();
  });

  function _mockBeneficiary(branchId) {
    beneficiaryModel.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'ben1', branchId }),
      }),
    });
  }

  test('GET /beneficiary/:beneficiaryId returns 403 when beneficiary is in another branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler(router, 'get', '/beneficiary/:beneficiaryId');
    expect(handler).toBeTruthy();
    const req = {
      params: { beneficiaryId: 'ben1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(aggregatorStub.aggregateBeneficiary).not.toHaveBeenCalled();
  });

  test('GET /beneficiary/:beneficiaryId returns 404 when restricted caller hits missing beneficiary', async () => {
    _mockBeneficiary(null);
    const handler = _findHandler(router, 'get', '/beneficiary/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'missing' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    // 404 raised inside enforceBeneficiaryBranch → mapped by _toErrorResponse.
    expect(res._body.error).toMatch(/not found/);
  });

  test('GET /beneficiary/:beneficiaryId — cross-branch role passes lookup-free', async () => {
    // No Beneficiary.findById call should be made for unrestricted callers.
    aggregatorStub.aggregateBeneficiary.mockResolvedValue({ summary: 'ok' });
    const handler = _findHandler(router, 'get', '/beneficiary/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'ben1' },
      query: {},
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    // The lookup must be skipped for cross-branch roles.
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });

  test('GET /beneficiary/:beneficiaryId — test pattern without branchScope passes (back-compat)', async () => {
    aggregatorStub.aggregateBeneficiary.mockResolvedValue({ summary: 'ok' });
    const handler = _findHandler(router, 'get', '/beneficiary/:beneficiaryId');
    const req = { params: { beneficiaryId: 'ben1' }, query: {} };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });

  test('GET /beneficiary/:beneficiaryId succeeds for matching branch', async () => {
    _mockBeneficiary('branch-A');
    aggregatorStub.aggregateBeneficiary.mockResolvedValue({ summary: 'ok' });
    const handler = _findHandler(router, 'get', '/beneficiary/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'ben1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    expect(aggregatorStub.aggregateBeneficiary).toHaveBeenCalledWith('ben1');
  });

  test('GET /family-report/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler(router, 'get', '/family-report/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'ben1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(familyReportStub.generate).not.toHaveBeenCalled();
  });

  test('GET /clinical-report/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler(router, 'get', '/clinical-report/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'ben1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(clinicalReportStub.generate).not.toHaveBeenCalled();
  });

  test('GET /ministry-comparison rejects branchIds list containing foreign branch', async () => {
    const handler = _findHandler(router, 'get', '/ministry-comparison');
    expect(handler).toBeTruthy();
    const req = {
      query: { branchIds: 'A,B', year: '2026', month: '5' },
      branchScope: { restricted: true, branchId: 'A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(ministryComparisonStub.compareBranches).not.toHaveBeenCalled();
  });

  test('GET /ministry-comparison allows own-branch-only list', async () => {
    ministryComparisonStub.compareBranches.mockResolvedValue({ items: [] });
    const handler = _findHandler(router, 'get', '/ministry-comparison');
    const req = {
      query: { branchIds: 'A', year: '2026', month: '5' },
      branchScope: { restricted: true, branchId: 'A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
  });

  test('GET /ministry-comparison cross-branch role honours full list', async () => {
    ministryComparisonStub.compareBranches.mockResolvedValue({ items: [] });
    const handler = _findHandler(router, 'get', '/ministry-comparison');
    const req = {
      query: { branchIds: 'A,B,C', year: '2026', month: '5' },
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    expect(ministryComparisonStub.compareBranches).toHaveBeenCalledWith(
      expect.objectContaining({ branchIds: ['A', 'B', 'C'] })
    );
  });
});
