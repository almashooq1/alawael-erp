'use strict';

/**
 * timeline-routes-branch-isolation-wave1138.test.js — Wave 1138.
 *
 * W269-class fix verification: the unified-timeline read API
 * (domains/timeline/routes/timeline.routes.js) previously exposed the FULL
 * longitudinal PHI history of ANY beneficiary to ANY branch-restricted
 * caller. W1138 added Layer-B enforcement (assertBranchMatch +
 * enforceBeneficiaryBranch + episode-keyed fallback) on all 4 endpoints:
 *
 *   GET  /beneficiary/:id  — enforceBeneficiaryBranch on path id
 *   GET  /episode/:id      — episode.branchId match (beneficiary fallback)
 *   GET  /:id              — event.branchId match (beneficiary fallback)
 *   POST /                 — body.beneficiaryId ownership + branchId
 *                            spoof-override for restricted callers
 *
 * Pattern: direct-handler invocation (W269f lineage) — mocked
 * mongoose.model registry + stubbed timelineService.
 */

describe('W1138 — unified timeline routes cross-branch isolation', () => {
  let router;
  let beneficiaryModel;
  let episodeModel;
  let serviceStub;

  const VALID_OID = '507f1f77bcf86cd799439011';

  beforeAll(() => {
    jest.resetModules();

    serviceStub = {
      getBeneficiaryTimeline: jest.fn(),
      getEpisodeTimeline: jest.fn(),
      getEventById: jest.fn(),
      addEvent: jest.fn(),
    };
    jest.doMock('../domains/timeline/services/TimelineService', () => ({
      TimelineService: function () {},
      timelineService: serviceStub,
    }));

    const mongoose = require('mongoose');
    beneficiaryModel = { findById: jest.fn() };
    episodeModel = { findById: jest.fn() };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') return beneficiaryModel;
      if (name === 'EpisodeOfCare') return episodeModel;
      // model registration calls (CareTimeline etc.) + unknown lookups
      return {
        findById: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
        findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
      };
    });

    router = require('../domains/timeline/routes/timeline.routes');
  });

  afterAll(() => {
    jest.dontMock('../domains/timeline/services/TimelineService');
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    beneficiaryModel.findById.mockReset();
    episodeModel.findById.mockReset();
    serviceStub.getBeneficiaryTimeline.mockReset();
    serviceStub.getEpisodeTimeline.mockReset();
    serviceStub.getEventById.mockReset();
    serviceStub.addEvent.mockReset();
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
      if (res._status === undefined) res._status = 200;
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

  function _mockEpisode(doc) {
    episodeModel.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(doc) }),
    });
  }

  /* ─── GET /beneficiary/:id ─────────────────────────────────────────────── */

  test('GET /beneficiary/:id → 403 cross-branch, service NOT called', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/beneficiary/:id');
    expect(handler).toBeTruthy();
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(403);
    expect(serviceStub.getBeneficiaryTimeline).not.toHaveBeenCalled();
  });

  test('GET /beneficiary/:id → 200 same-branch', async () => {
    _mockBeneficiary('branch-A');
    serviceStub.getBeneficiaryTimeline.mockResolvedValue({ data: [], total: 0 });
    const handler = _findHandler('get', '/beneficiary/:id');
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(200);
    expect(serviceStub.getBeneficiaryTimeline).toHaveBeenCalledWith(
      VALID_OID,
      expect.any(Object),
      expect.any(Object)
    );
  });

  test('GET /beneficiary/:id → 400 on invalid ObjectId', async () => {
    const handler = _findHandler('get', '/beneficiary/:id');
    const req = {
      params: { id: 'not-an-oid' },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(400);
    expect(serviceStub.getBeneficiaryTimeline).not.toHaveBeenCalled();
  });

  test('GET /beneficiary/:id → 404 when beneficiary not found (restricted)', async () => {
    _mockBeneficiary(null);
    const handler = _findHandler('get', '/beneficiary/:id');
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(404);
  });

  test('GET /beneficiary/:id → unrestricted caller passes without lookup', async () => {
    serviceStub.getBeneficiaryTimeline.mockResolvedValue({ data: [], total: 0 });
    const handler = _findHandler('get', '/beneficiary/:id');
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(200);
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });

  /* ─── GET /episode/:id ─────────────────────────────────────────────────── */

  test('GET /episode/:id → 403 cross-branch via episode.branchId', async () => {
    _mockEpisode({ _id: 'ep1', branchId: 'branch-B', beneficiaryId: 'ben1' });
    const handler = _findHandler('get', '/episode/:id');
    expect(handler).toBeTruthy();
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(403);
    expect(serviceStub.getEpisodeTimeline).not.toHaveBeenCalled();
  });

  test('GET /episode/:id → 200 same-branch', async () => {
    _mockEpisode({ _id: 'ep1', branchId: 'branch-A', beneficiaryId: 'ben1' });
    serviceStub.getEpisodeTimeline.mockResolvedValue({ data: [], total: 0 });
    const handler = _findHandler('get', '/episode/:id');
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(200);
  });

  test('GET /episode/:id → 404 episode not found (restricted)', async () => {
    _mockEpisode(null);
    const handler = _findHandler('get', '/episode/:id');
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(404);
  });

  test('GET /episode/:id → legacy episode without branchId falls back to beneficiary branch (403)', async () => {
    _mockEpisode({ _id: 'ep1', beneficiaryId: VALID_OID });
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/episode/:id');
    const req = {
      params: { id: VALID_OID },
      query: {},
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(403);
    expect(serviceStub.getEpisodeTimeline).not.toHaveBeenCalled();
  });

  /* ─── GET /:id (single event) ──────────────────────────────────────────── */

  test('GET /:id → 403 cross-branch via event.branchId', async () => {
    serviceStub.getEventById.mockResolvedValue({
      _id: 'ev1',
      branchId: 'branch-B',
      beneficiaryId: 'ben1',
    });
    const handler = _findHandler('get', '/:id');
    expect(handler).toBeTruthy();
    const req = {
      params: { id: VALID_OID },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(403);
    expect(res._body && res._body.data).toBeUndefined();
  });

  test('GET /:id → un-tagged event falls back to beneficiary branch (403)', async () => {
    serviceStub.getEventById.mockResolvedValue({ _id: 'ev1', beneficiaryId: VALID_OID });
    _mockBeneficiary('branch-B');
    const handler = _findHandler('get', '/:id');
    const req = {
      params: { id: VALID_OID },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(403);
  });

  test('GET /:id → 200 same-branch event', async () => {
    serviceStub.getEventById.mockResolvedValue({
      _id: 'ev1',
      branchId: 'branch-A',
      beneficiaryId: 'ben1',
    });
    const handler = _findHandler('get', '/:id');
    const req = {
      params: { id: VALID_OID },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(200);
    expect(res._body.data._id).toBe('ev1');
  });

  /* ─── POST / ───────────────────────────────────────────────────────────── */

  test('POST / → 403 when body.beneficiaryId belongs to a foreign branch', async () => {
    _mockBeneficiary('branch-B');
    const handler = _findHandler('post', '/');
    expect(handler).toBeTruthy();
    const req = {
      body: { beneficiaryId: VALID_OID, eventType: 'note_added' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(403);
    expect(serviceStub.addEvent).not.toHaveBeenCalled();
  });

  test('POST / → restricted caller cannot spoof a foreign branchId (forced to own)', async () => {
    _mockBeneficiary('branch-A');
    serviceStub.addEvent.mockResolvedValue({ _id: 'ev-new' });
    const handler = _findHandler('post', '/');
    const req = {
      body: { beneficiaryId: VALID_OID, eventType: 'note_added', branchId: 'branch-EVIL' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    await handler(req, res, () => {});
    expect(res._status).toBe(201);
    expect(serviceStub.addEvent).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'branch-A' })
    );
  });

  /* ─── Static anti-regression ───────────────────────────────────────────── */

  test('source keeps W1138 guards wired (anti-regression)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'domains', 'timeline', 'routes', 'timeline.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/enforceBeneficiaryBranch\(req,\s*req\.params\.id\)/);
    expect(src).toMatch(/enforceEpisodeBranch\(req,\s*req\.params\.id\)/);
    expect(src).toMatch(/enforceBeneficiaryBranch\(req,\s*req\.body\.beneficiaryId\)/);
    expect(src).toMatch(/assertBranchMatch\(req,\s*event\.branchId/);
    expect(src).toMatch(/req\.body\.branchId\s*=\s*req\.branchScope\.branchId/);
    // W269h class — req.branchId must never appear
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});
