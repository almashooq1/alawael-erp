'use strict';

/**
 * branch-isolation-security-wave269.test.js — Wave 269.
 *
 * Verifies the cross-branch isolation fixes applied across the W263
 * AAC + W264 GAS + W267 BIP-tracking surfaces in response to the
 * 2026-05-22 security review.
 *
 * Tests:
 *   1. assertBranchMatch helper — happy + denial + fail-closed paths
 *   2. effectiveBranchScope helper — restricted always returns own
 *      branch regardless of query input
 *   3. Route-handler branch-denial paths via direct-exec invocation
 *      (mirrors the W257k handler-stub pattern):
 *        - GET /aac/profile/:beneficiaryId returns 403 cross-branch
 *        - POST /aac/profile/:id/pecs-phase rejects cross-branch
 *        - GET /gas/scale/goal/:goalId returns 403 cross-branch
 *        - POST /bip-tracking/fidelity rejects cross-branch FBA
 */

describe('W269 — assertBranchMatch helper', () => {
  const { assertBranchMatch, effectiveBranchScope } = require('../middleware/assertBranchMatch');

  test('cross-branch role (restricted=false) is no-op', () => {
    const req = { branchScope: { restricted: false, branchId: null } };
    expect(() => assertBranchMatch(req, 'anything', 'document')).not.toThrow();
  });

  test('no branchScope at all is no-op (internal-call / test path)', () => {
    expect(() => assertBranchMatch({}, 'whatever', 'document')).not.toThrow();
    expect(() => assertBranchMatch(null, 'whatever', 'document')).not.toThrow();
  });

  test('restricted caller with matching branchId passes', () => {
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    expect(() => assertBranchMatch(req, 'branch-A', 'document')).not.toThrow();
  });

  test('restricted caller with mismatching branchId throws 403', () => {
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    let err;
    try {
      assertBranchMatch(req, 'branch-B', 'AAC profile');
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/cross-branch access denied for AAC profile/);
  });

  test('restricted caller with missing docBranchId fails closed (403)', () => {
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    let err;
    try {
      assertBranchMatch(req, null, 'orphan doc');
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/fail-closed/);
  });

  test('ObjectId-like strings compare correctly (toString equivalence)', () => {
    const req = {
      branchScope: { restricted: true, branchId: { toString: () => 'oid-1' } },
    };
    expect(() => assertBranchMatch(req, { toString: () => 'oid-1' }, 'document')).not.toThrow();
    expect(() => assertBranchMatch(req, { toString: () => 'oid-2' }, 'document')).toThrow(
      /cross-branch/
    );
  });

  // ─── effectiveBranchScope ──────────────────────────────────────
  test('effectiveBranchScope: restricted always returns own branchId, ignoring query input', () => {
    const req = {
      branchScope: { restricted: true, branchId: 'branch-A' },
      query: { branchId: 'branch-B-tried-to-spoof' },
    };
    expect(effectiveBranchScope(req)).toBe('branch-A');
  });

  test('effectiveBranchScope: cross-branch honours query branchId when supplied', () => {
    const req = {
      branchScope: { restricted: false, branchId: null },
      query: { branchId: 'branch-X' },
    };
    expect(effectiveBranchScope(req)).toBe('branch-X');
  });

  test('effectiveBranchScope: cross-branch + no query returns null (= all branches)', () => {
    const req = {
      branchScope: { restricted: false, branchId: null },
      query: {},
    };
    expect(effectiveBranchScope(req)).toBe(null);
  });

  test('effectiveBranchScope: no branchScope returns null', () => {
    expect(effectiveBranchScope({})).toBe(null);
    expect(effectiveBranchScope(null)).toBe(null);
  });
});

// ════════════════════════════════════════════════════════════════════
// Route handler — cross-branch denial via direct-exec pattern
// ════════════════════════════════════════════════════════════════════
//
// Mirrors the W257k handler-stub-and-invoke pattern: stub the service,
// require the router, locate the layer, invoke the handler with a fake
// req/res. This bypasses authenticate + requireBranchAccess middleware
// (which is fine — we're testing the handler's own assertBranchMatch
// usage, not the middleware chain).

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

describe('W269 — aac routes cross-branch denial', () => {
  let aacStub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    aacStub = {
      getByBeneficiary: jest.fn(),
      upsertProfile: jest.fn(),
      transitionPecsPhase: jest.fn(),
      listByBranch: jest.fn(),
      listOverdueReviews: jest.fn(),
      listSymbols: jest.fn(),
      createSymbol: jest.fn(),
      publishSymbol: jest.fn(),
    };
    jest.doMock('../services/aacProfile.service', () => aacStub);
    router = require('../routes/aac.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/aacProfile.service');
    jest.resetModules();
  });

  beforeEach(() => {
    aacStub.getByBeneficiary.mockReset();
    aacStub.transitionPecsPhase.mockReset();
  });

  test('GET /profile/:beneficiaryId returns 403 when restricted caller hits cross-branch profile', async () => {
    aacStub.getByBeneficiary.mockResolvedValue({
      _id: 'p1',
      beneficiaryId: 'b1',
      branchId: 'branch-B',
      primaryModality: 'low_tech',
    });
    const handler = _findHandler(router, 'get', '/profile/:beneficiaryId');
    expect(handler).toBeTruthy();
    const req = {
      params: { beneficiaryId: 'b1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(res._body.error).toMatch(/cross-branch/);
  });

  test('GET /profile/:beneficiaryId succeeds for matching branch', async () => {
    aacStub.getByBeneficiary.mockResolvedValue({
      _id: 'p1',
      beneficiaryId: 'b1',
      branchId: 'branch-A',
    });
    const handler = _findHandler(router, 'get', '/profile/:beneficiaryId');
    const req = {
      params: { beneficiaryId: 'b1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._body.success).toBe(true);
  });

  test('POST /profile/:beneficiaryId/pecs-phase returns 403 when profile is in another branch', async () => {
    aacStub.getByBeneficiary.mockResolvedValue({
      _id: 'p1',
      beneficiaryId: 'b1',
      branchId: 'branch-B',
    });
    const handler = _findHandler(router, 'post', '/profile/:beneficiaryId/pecs-phase');
    expect(handler).toBeTruthy();
    const req = {
      params: { beneficiaryId: 'b1' },
      body: { toPhase: 2 },
      user: { _id: 'user-1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    // Service mutation must NOT have been invoked.
    expect(aacStub.transitionPecsPhase).not.toHaveBeenCalled();
  });

  test('GET /profiles forces caller branch into filter (ignores spoofed query branchId)', async () => {
    aacStub.listByBranch.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/profiles');
    const req = {
      query: { branchId: 'branch-B-spoof' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    // First arg passed to listByBranch MUST be branch-A, not branch-B-spoof.
    expect(aacStub.listByBranch).toHaveBeenCalledWith('branch-A', expect.any(Object));
  });

  test('GET /reviews/overdue forces caller branch into filter', async () => {
    aacStub.listOverdueReviews.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/reviews/overdue');
    const req = {
      query: { branchId: 'branch-B-spoof' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(aacStub.listOverdueReviews).toHaveBeenCalledWith('branch-A', expect.any(Object));
  });
});

describe('W269 — gas routes cross-branch denial', () => {
  let gasStub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    gasStub = {
      createScale: jest.fn(),
      getActiveByGoal: jest.fn(),
      getScaleById: jest.fn(),
      getScoringById: jest.fn(),
      listVersions: jest.fn(),
      supersedeScale: jest.fn(),
      archiveScale: jest.fn(),
      recordScoring: jest.fn(),
      supersedeScoring: jest.fn(),
      listScoringsByGoal: jest.fn(),
      listScoringsByBeneficiary: jest.fn(),
      computeIndividualTScore: jest.fn(),
      computeBeneficiaryComposite: jest.fn(),
    };
    jest.doMock('../services/gas.service', () => gasStub);
    router = require('../routes/gas.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/gas.service');
    jest.resetModules();
  });

  beforeEach(() => {
    Object.values(gasStub).forEach(fn => fn.mockReset && fn.mockReset());
  });

  test('GET /scale/goal/:goalId returns 403 cross-branch', async () => {
    gasStub.getActiveByGoal.mockResolvedValue({
      _id: 's1',
      goalId: 'g1',
      branchId: 'branch-B',
    });
    const handler = _findHandler(router, 'get', '/scale/goal/:goalId');
    const req = {
      params: { goalId: 'g1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  test('POST /scoring rejects cross-branch scale targeting', async () => {
    gasStub.getScaleById.mockResolvedValue({
      _id: 's1',
      branchId: 'branch-B',
    });
    const handler = _findHandler(router, 'post', '/scoring');
    const req = {
      body: { scaleId: 's1', achievedLevel: 1 },
      user: { _id: 'user-1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(gasStub.recordScoring).not.toHaveBeenCalled();
  });

  test('POST /scale forces body.branchId to caller branch + passes enforceBranch', async () => {
    gasStub.createScale.mockResolvedValue({ _id: 'created' });
    const handler = _findHandler(router, 'post', '/scale');
    const req = {
      body: { goalId: 'g1', beneficiaryId: 'b1', branchId: 'branch-B-spoof' },
      user: { _id: 'user-1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    // First arg's branchId MUST be branch-A, not branch-B-spoof.
    const [body, , opts] = gasStub.createScale.mock.calls[0];
    expect(body.branchId).toBe('branch-A');
    expect(opts.enforceBranch).toBe('branch-A');
  });

  test('PATCH /scale/:id/archive returns 403 when scale belongs to another branch', async () => {
    gasStub.getScaleById.mockResolvedValue({
      _id: 's1',
      branchId: 'branch-B',
    });
    const handler = _findHandler(router, 'patch', '/scale/:id/archive');
    const req = {
      params: { id: 's1' },
      body: { archiveReason_ar: 'تم' },
      user: { _id: 'user-1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(gasStub.archiveScale).not.toHaveBeenCalled();
  });
});

describe('W269 — bip-tracking routes cross-branch denial', () => {
  let bipStub;
  let router;
  let FBA;

  beforeAll(async () => {
    jest.resetModules();
    bipStub = {
      recordFidelityCheck: jest.fn(),
      listFidelityChecks: jest.fn(),
      computeFidelityTrend: jest.fn(),
      recordEffectivenessReading: jest.fn(),
      listEffectivenessReadings: jest.fn(),
      computeEffectivenessTrend: jest.fn(),
      listAtRiskBips: jest.fn(),
      _diagnoseBip: jest.fn(() => 'working'),
    };
    jest.doMock('../services/bipFidelityEffectiveness.service', () => bipStub);
    // The route lazily loads FBA via mongoose.model — stub that path.
    const mongoose = require('mongoose');
    const mockModel = {
      findById: jest.fn(),
    };
    const originalModel = mongoose.model.bind(mongoose);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehavioralFunctionAssessment') return mockModel;
      return originalModel(name);
    });
    FBA = mockModel;
    router = require('../routes/bip-tracking.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/bipFidelityEffectiveness.service');
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    Object.values(bipStub).forEach(fn => fn.mockReset && fn.mockReset());
    FBA.findById.mockReset();
  });

  test('POST /fidelity returns 403 when FBA is in another branch', async () => {
    FBA.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'fba1', branch: 'branch-B' }),
    });
    const handler = _findHandler(router, 'post', '/fidelity');
    const req = {
      body: {
        fbaAssessmentId: 'fba1',
        criteria: [{ criterion_ar: 'x', score: 80 }],
      },
      user: { _id: 'user-1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(bipStub.recordFidelityCheck).not.toHaveBeenCalled();
  });

  test('GET /fidelity/fba/:fbaAssessmentId returns 404 when FBA not found', async () => {
    FBA.findById.mockReturnValue({ lean: () => Promise.resolve(null) });
    const handler = _findHandler(router, 'get', '/fidelity/fba/:fbaAssessmentId');
    const req = {
      params: { fbaAssessmentId: 'missing' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  test('GET /diagnosis/fba/:fbaAssessmentId returns 403 cross-branch', async () => {
    FBA.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'fba1', branch: 'branch-B' }),
    });
    const handler = _findHandler(router, 'get', '/diagnosis/fba/:fbaAssessmentId');
    const req = {
      params: { fbaAssessmentId: 'fba1' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(bipStub.computeFidelityTrend).not.toHaveBeenCalled();
  });

  test('GET /at-risk forces caller branchId into service options', async () => {
    bipStub.listAtRiskBips.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/at-risk');
    const req = {
      query: { branchId: 'branch-B-spoof' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(bipStub.listAtRiskBips).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'branch-A' })
    );
  });
});
