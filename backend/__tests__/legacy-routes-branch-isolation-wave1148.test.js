/**
 * core-routes-branch-isolation continuation — Wave 1148 (W269-class).
 *
 * Legacy routes/ dir sweep: 7 live beneficiary-keyed route files had ZERO
 * ownership verification on /:beneficiaryId paths. requireBranchAccess (used
 * by 4 of them) only blocks explicit foreign branchId in query/body — it
 * does NOT verify that the beneficiary named in the path belongs to the
 * caller's branch. Any authenticated staff member could read PHI for any
 * beneficiary across all branches.
 *
 * Fix (same recipe as W1140 + W1146):
 *   - require { branchScopedBeneficiaryParam, bodyScopedBeneficiaryGuard }
 *     from middleware/assertBranchMatch
 *   - router.param('beneficiaryId', branchScopedBeneficiaryParam)
 *   - router.use(bodyScopedBeneficiaryGuard)  [direct-router files]
 *   - beneficiary-red-flags is a factory (createRedFlagRouter) — hook wired
 *     inside the factory so every instance gets it.
 *
 * NOT touched (already protected — verified this wave):
 *   - beneficiary-consents.routes.js  → utils/beneficiaryBranchGate
 *   - therapist-portal.routes.js      → W269d caseload guard (stronger)
 *   - risk-sweep.routes.js            → inline CROSS_BRANCH_FORBIDDEN (W413)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

/** Files that wire the param hook directly on the module-level router. */
const DIRECT_ROUTER_FILES = [
  'communityIntegration.routes.js',
  'independentLiving.routes.js',
  'mhpss.routes.js',
  'phase37.routes.js',
  'rehabilitationPlan.routes.js',
  'therapy-sessions.routes.js',
];

const FACTORY_FILES = ['beneficiary-red-flags.routes.js'];

const read = f => fs.readFileSync(path.join(ROUTES_DIR, f), 'utf8');

describe('W1148 — legacy routes/ branch isolation (static wiring)', () => {
  describe.each(DIRECT_ROUTER_FILES)('%s', file => {
    let src;
    beforeAll(() => {
      src = read(file);
    });

    it('requires both Layer-B middlewares from assertBranchMatch', () => {
      expect(src).toMatch(/branchScopedBeneficiaryParam/);
      expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
      expect(src).toMatch(/require\(\s*['"]\.\.\/middleware\/assertBranchMatch['"]\s*\)/);
    });

    it('registers the beneficiaryId param hook', () => {
      expect(src).toMatch(
        /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
      );
    });

    it('mounts the body guard router-wide', () => {
      expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
    });
  });

  describe.each(FACTORY_FILES)('%s (factory)', file => {
    it('wires the param hook inside the factory', () => {
      const src = read(file);
      expect(src).toMatch(/branchScopedBeneficiaryParam/);
      expect(src).toMatch(
        /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
      );
    });
  });

  it('no file in the W1148 set reads req.branchId (W269h class)', () => {
    for (const file of [...DIRECT_ROUTER_FILES, ...FACTORY_FILES]) {
      expect(read(file)).not.toMatch(/req\.branchId\b/);
    }
  });

  it('no file in the W1148 set uses /beneficiary/:id path shape (param hook would not fire)', () => {
    for (const file of [...DIRECT_ROUTER_FILES, ...FACTORY_FILES]) {
      expect(read(file)).not.toMatch(/beneficiary\/:id(?![a-zA-Z])/);
    }
  });
});

describe('W1148 — behavioral (representative: therapy-sessions router)', () => {
  let mongoose;

  beforeEach(() => {
    jest.resetModules();
    mongoose = require('mongoose');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function loadRouter() {
    return require('../routes/therapy-sessions.routes');
  }

  function paramHandler(router) {
    expect(router.params).toBeDefined();
    expect(router.params.beneficiaryId).toBeDefined();
    return router.params.beneficiaryId[0];
  }

  it('registers a beneficiaryId param callback on the router', () => {
    const router = loadRouter();
    expect(typeof paramHandler(router)).toBe('function');
  });

  it('403s a branch-restricted caller for a foreign-branch beneficiary', async () => {
    const beneficiaryDoc = { _id: 'b1', branchId: 'branch-OTHER' };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') {
        return {
          findById: () => ({
            select: () => ({ lean: () => Promise.resolve(beneficiaryDoc) }),
          }),
        };
      }
      throw new Error(`unexpected model ${name}`);
    });
    const router = loadRouter();
    const handler = paramHandler(router);

    const req = {
      branchScope: { restricted: true, branchId: 'branch-MINE' },
      params: {},
    };
    let statusCode;
    const res = {
      status(c) {
        statusCode = c;
        return this;
      },
      json: () => undefined,
    };
    const next = jest.fn();

    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a same-branch beneficiary', async () => {
    const beneficiaryDoc = { _id: 'b1', branchId: 'branch-MINE' };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') {
        return {
          findById: () => ({
            select: () => ({ lean: () => Promise.resolve(beneficiaryDoc) }),
          }),
        };
      }
      throw new Error(`unexpected model ${name}`);
    });
    const router = loadRouter();
    const handler = paramHandler(router);

    const req = {
      branchScope: { restricted: true, branchId: 'branch-MINE' },
      params: {},
    };
    const res = {
      status() {
        throw new Error('should not respond');
      },
      json() {
        throw new Error('should not respond');
      },
    };
    const next = jest.fn();

    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
  });

  it('no-ops (next, no DB) for unrestricted callers', async () => {
    const modelSpy = jest.spyOn(mongoose, 'model').mockImplementation(() => {
      throw new Error('DB should not be touched');
    });
    const router = loadRouter();
    const handler = paramHandler(router);

    const req = { branchScope: { restricted: false }, params: {} };
    const next = jest.fn();
    await handler(
      req,
      {
        status() {
          throw new Error('should not respond');
        },
      },
      next,
      '507f1f77bcf86cd799439011'
    );
    expect(next).toHaveBeenCalledWith();
    expect(modelSpy).not.toHaveBeenCalledWith('Beneficiary');
  });

  it('factory router (red-flags) registers its own param callback', () => {
    const mod = require('../routes/beneficiary-red-flags.routes');
    const stub = { evaluateBeneficiary: async () => [], applyVerdicts: async () => [] };
    const router = mod.createRedFlagRouter({ engine: stub, store: stub });
    expect(router.params).toBeDefined();
    expect(router.params.beneficiaryId).toBeDefined();
    expect(typeof router.params.beneficiaryId[0]).toBe('function');
  });
});
