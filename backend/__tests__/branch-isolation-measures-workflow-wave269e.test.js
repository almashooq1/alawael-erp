'use strict';

/**
 * branch-isolation-measures-workflow-wave269e.test.js — Wave 269e.
 *
 * Verifies the cross-branch isolation fixes applied to
 * measures-workflow.routes.js (W226 + W237/W238 + W257h/k/l surfaces):
 *
 *   Beneficiary-keyed (4 routes — enforceBeneficiaryBranch):
 *     GET /readiness/care-plan-review/:beneficiaryId   (W223)
 *     GET /readiness/discharge/:beneficiaryId          (W223)
 *     GET /required-measures/:beneficiaryId            (W223)
 *     GET /reminders/beneficiary/:beneficiaryId        (W225)
 *
 *   Branch-list endpoints (8 routes — effectiveBranchScope):
 *     GET /tasks                                       (W222)
 *     GET /insights/orphaned-measures                  (W237)
 *     GET /insights/overloaded-measures                (W237)
 *     GET /insights/kpis                               (W237)
 *     GET /insights/link-type-distribution             (W237)
 *     GET /links/due-for-review                        (W235)
 *     GET /anomalous-admins                            (W257h — already covered)
 *     GET /anomalous-admins.csv                        (W257k — already covered)
 *     GET /anomalous-admins/aggregates                 (W257l — already covered)
 *
 * Strategy: direct-exec handler invocation + mongoose.model spy for
 * Beneficiary lookup. Mirrors the W269/W269b pattern.
 */

describe('W269e — measures-workflow cross-branch denial', () => {
  let stub;
  let router;
  let beneficiaryModel;
  let originalModelImpl;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      // readinessGate
      gateCarePlanReview: jest.fn(),
      gateDischarge: jest.fn(),
      listRequiredMeasures: jest.fn(),
      // cascade
      listForBeneficiary: jest.fn(),
      // linkageInsights + linkage
      findOrphanedMeasures: jest.fn(),
      findOverloadedMeasures: jest.fn(),
      linkageKpis: jest.fn(),
      linkTypeDistribution: jest.fn(),
      dueForReview: jest.fn(),
    };
    jest.doMock('../services/measureReadinessGate.service', () => ({
      gateCarePlanReview: stub.gateCarePlanReview,
      gateDischarge: stub.gateDischarge,
      listRequiredMeasures: stub.listRequiredMeasures,
    }));
    jest.doMock('../services/reassessmentReminderCascade.service', () => ({
      listForBeneficiary: stub.listForBeneficiary,
    }));
    jest.doMock('../services/goalLinkageInsights.service', () => ({
      findOrphanedMeasures: stub.findOrphanedMeasures,
      findOverloadedMeasures: stub.findOverloadedMeasures,
      linkageKpis: stub.linkageKpis,
      linkTypeDistribution: stub.linkTypeDistribution,
    }));
    jest.doMock('../services/goalMeasureLinkage.service', () => ({
      dueForReview: stub.dueForReview,
    }));

    const mongoose = require('mongoose');
    beneficiaryModel = { findById: jest.fn() };
    // Fake stub for any other model name the test never touches —
    // avoids infinite recursion seen when calling back into the spied
    // mongoose.model.
    const fakeOtherModel = {
      findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
      findById: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
    };
    originalModelImpl = null; // unused
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') return beneficiaryModel;
      return fakeOtherModel;
    });

    router = require('../routes/measures-workflow.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/measureReadinessGate.service');
    jest.dontMock('../services/reassessmentReminderCascade.service');
    jest.dontMock('../services/goalLinkageInsights.service');
    jest.dontMock('../services/goalMeasureLinkage.service');
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    Object.values(stub).forEach(fn => fn.mockReset && fn.mockReset());
    beneficiaryModel.findById.mockReset();
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
    res.setHeader = jest.fn();
    res.send = jest.fn(body => {
      res._body = body;
      return res;
    });
    return res;
  }

  function _mockBeneficiary(branchId) {
    beneficiaryModel.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'b1', branchId }),
      }),
    });
  }

  // ─── Beneficiary-keyed routes — enforceBeneficiaryBranch ───────

  test('GET /readiness/care-plan-review/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/readiness/care-plan-review/:beneficiaryId');
    expect(handler).toBeTruthy();
    const req = {
      params: { beneficiaryId: 'b1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(stub.gateCarePlanReview).not.toHaveBeenCalled();
  });

  test('GET /readiness/discharge/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/readiness/discharge/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'b1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(stub.gateDischarge).not.toHaveBeenCalled();
  });

  test('GET /required-measures/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/required-measures/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'b1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(stub.listRequiredMeasures).not.toHaveBeenCalled();
  });

  test('GET /reminders/beneficiary/:beneficiaryId returns 403 cross-branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/reminders/beneficiary/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'b1' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(stub.listForBeneficiary).not.toHaveBeenCalled();
  });

  test('GET /readiness/* — cross-branch role passes lookup-free', async () => {
    stub.gateCarePlanReview.mockResolvedValue({ ready: true });
    const handler = _findHandler('get', '/readiness/care-plan-review/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'b1' },
      query: {},
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });

  test('GET /readiness/* — test pattern without branchScope passes (back-compat)', async () => {
    stub.gateCarePlanReview.mockResolvedValue({ ready: true });
    const handler = _findHandler('get', '/readiness/care-plan-review/:beneficiaryId');
    const req = { params: { beneficiaryId: 'b1' }, query: {} };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });

  // ─── Branch-list endpoints — effectiveBranchScope ─────────────

  test('GET /insights/orphaned-measures forces caller branch (ignores spoofed query)', async () => {
    stub.findOrphanedMeasures.mockResolvedValue([]);
    const handler = _findHandler('get', '/insights/orphaned-measures');
    const req = {
      query: { branchId: 'branch-B-spoof' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(stub.findOrphanedMeasures).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'branch-A' })
    );
  });

  test('GET /insights/kpis forces caller branch', async () => {
    stub.linkageKpis.mockResolvedValue({});
    const handler = _findHandler('get', '/insights/kpis');
    const req = {
      query: { branchId: 'foreign' },
      branchScope: { restricted: true, branchId: 'own' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(stub.linkageKpis).toHaveBeenCalledWith(expect.objectContaining({ branchId: 'own' }));
  });

  test('GET /insights/link-type-distribution forces caller branch', async () => {
    stub.linkTypeDistribution.mockResolvedValue({});
    const handler = _findHandler('get', '/insights/link-type-distribution');
    const req = {
      query: { branchId: 'foreign' },
      branchScope: { restricted: true, branchId: 'own' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(stub.linkTypeDistribution).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'own' })
    );
  });

  test('GET /links/due-for-review forces caller branch', async () => {
    stub.dueForReview.mockResolvedValue([]);
    const handler = _findHandler('get', '/links/due-for-review');
    const req = {
      query: { branchId: 'foreign' },
      branchScope: { restricted: true, branchId: 'own' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(stub.dueForReview).toHaveBeenCalledWith(expect.objectContaining({ branchId: 'own' }));
  });

  test('GET /insights/* — cross-branch role honours query branchId', async () => {
    stub.linkageKpis.mockResolvedValue({});
    const handler = _findHandler('get', '/insights/kpis');
    const req = {
      query: { branchId: 'any-branch' },
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(stub.linkageKpis).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'any-branch' })
    );
  });
});
