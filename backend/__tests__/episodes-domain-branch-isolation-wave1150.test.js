'use strict';

/**
 * W1150 — episodes domain branch-isolation drift guard.
 *
 * Closes the two remaining W269-class gaps in domains/episodes after W1140:
 *
 *   1. List spoofing — GET /, /statistics, /phase/:phase honoured raw
 *      `req.query.branchId`, letting RESTRICTED callers read foreign-branch
 *      episode lists by passing (or omitting) ?branchId=. All three now go
 *      through effectiveBranchScope(req); /therapist/:therapistId gained a
 *      branch filter down to the repository.
 *
 *   2. Episode-keyed `:id` routes — GET /:id, PUT /:id, the 4 workflow
 *      transitions, team add/remove, and /:id/summary loaded the episode
 *      WITHOUT verifying its branchId. Routes renamed `:id` → `:episodeId`
 *      and a router.param('episodeId') hook (the new generic
 *      branchScopedResourceParam factory) asserts ownership for restricted
 *      callers BEFORE any handler runs.
 *
 * Static + behavioral, mirrors the W1140/W1146/W1148 guard pattern.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = path.resolve(__dirname, '../domains/episodes/routes/episodes.routes.js');
const INDEX_SRC = path.resolve(__dirname, '../domains/episodes/index.js');
const MW_SRC = path.resolve(__dirname, '../middleware/assertBranchMatch.js');

describe('W1150 — static wiring (episodes routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(ROUTES_SRC, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope from assertBranchMatch', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test("wires router.param('episodeId', branchScopedResourceParam(...)) with EpisodeOfCare", () => {
    expect(src).toMatch(/router\.param\(\s*['"]episodeId['"]/);
    expect(src).toMatch(/modelName:\s*['"]EpisodeOfCare['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO route registered with bare :id (must be :episodeId so the hook fires)', () => {
    // Express matches param names literally — a `/:id` route silently
    // bypasses the episodeId hook. Ban the shape outright in this file.
    expect(src).not.toMatch(/router\.(get|put|post|delete|patch)\(\s*['"`]\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('NO raw req.query.branchId reads remain (spoofing vector closed)', () => {
    // effectiveBranchScope() already honours query.branchId for
    // unrestricted callers — any direct read re-opens the spoof.
    expect(src).not.toMatch(/req\.query\.branchId/);
  });

  test('list endpoints route branch scoping through effectiveBranchScope', () => {
    expect(src.match(/effectiveBranchScope\(req\)/g).length).toBeGreaterThanOrEqual(4);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1150 — static wiring (repository + middleware)', () => {
  test('findByTherapist accepts + applies a branchId filter', () => {
    const src = fs.readFileSync(INDEX_SRC, 'utf8');
    expect(src).toMatch(/findByTherapist\(\s*therapistId\s*,\s*\{[^}]*branchId/);
    expect(src).toMatch(/\.\.\.\(branchId && \{ branchId \}\)/);
  });

  test('assertBranchMatch exports the generic branchScopedResourceParam factory', () => {
    const src = fs.readFileSync(MW_SRC, 'utf8');
    expect(src).toMatch(/function branchScopedResourceParam\(/);
    expect(src).toMatch(/branchScopedResourceParam,/);
    // fail-closed contract markers
    expect(src).toMatch(/refusing for safety \(fail-closed\)/);
  });
});

describe('W1150 — behavioral (episodeId param hook)', () => {
  let router;
  let episodeModel;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    episodeModel = { findById: jest.fn() };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'EpisodeOfCare') return episodeModel;
      return {
        findById: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
        findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
      };
    });
    router = require('../domains/episodes/routes/episodes.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    episodeModel.findById.mockReset();
  });

  function _mockEpisode(branchId) {
    episodeModel.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'ep1', branchId }),
      }),
    });
  }

  function _paramHandler() {
    const fns = router.params && router.params.episodeId;
    return Array.isArray(fns) && fns[0];
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

  test('router registers an episodeId param callback', () => {
    expect(typeof _paramHandler()).toBe('function');
  });

  test('403 on cross-branch episode, next() NOT called', async () => {
    _mockEpisode('branch-B');
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('next() on same-branch episode', async () => {
    _mockEpisode('branch-A');
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('404 when episode not found (restricted)', async () => {
    _mockEpisode(null);
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('no-op (no DB lookup) for unrestricted / missing branchScope', async () => {
    const handler = _paramHandler();
    for (const req of [{}, { branchScope: { restricted: false } }]) {
      const res = _mockRes();
      const next = jest.fn();
      await handler(req, res, next, '507f1f77bcf86cd799439011');
      expect(next).toHaveBeenCalledWith();
    }
    expect(episodeModel.findById).not.toHaveBeenCalled();
  });

  test('non-ObjectId param value falls through to the route handler (next, no lookup)', async () => {
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, 'statistics-is-not-hex');
    expect(next).toHaveBeenCalledWith();
    expect(episodeModel.findById).not.toHaveBeenCalled();
  });

  test('W597 secondment: branchIds[] array honoured by the hook', async () => {
    _mockEpisode('branch-B');
    const handler = _paramHandler();
    const req = {
      branchScope: { restricted: true, branchId: 'branch-A', branchIds: ['branch-A', 'branch-B'] },
    };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('W1150 — behavioral (factory fail-closed contract)', () => {
  test('503 when model unregistered AND loadModel throws (restricted)', async () => {
    jest.resetModules();
    const mongoose = require('mongoose');
    const spy = jest.spyOn(mongoose, 'model').mockImplementation(() => {
      throw new Error('not registered');
    });
    const { branchScopedResourceParam } = require('../middleware/assertBranchMatch');
    const handler = branchScopedResourceParam({
      modelName: 'NopeModel',
      loadModel: () => {
        throw new Error('no such file');
      },
    });
    const res = {};
    res.status = jest.fn(code => {
      res._status = code;
      return res;
    });
    res.json = jest.fn(() => res);
    const next = jest.fn();
    await handler(
      { branchScope: { restricted: true, branchId: 'branch-A' } },
      res,
      next,
      '507f1f77bcf86cd799439011'
    );
    expect(res._status).toBe(503);
    expect(next).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('factory throws synchronously without modelName (misuse guard)', () => {
    const { branchScopedResourceParam } = require('../middleware/assertBranchMatch');
    expect(() => branchScopedResourceParam({})).toThrow(/modelName/);
  });
});
