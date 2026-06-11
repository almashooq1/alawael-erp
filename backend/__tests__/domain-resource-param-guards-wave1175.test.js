'use strict';

/**
 * W1175 — resource-level branch ownership on domain routers (post-W1171).
 *
 * W1171 centrally populated req.branchScope on every domain mount, which
 * made branchScopedResourceParam hooks finally enforceable. This wave wires
 * resource :id ownership in 4 routers whose models carry branchId:
 *
 *   - ai-recommendations :id  → Recommendation   (respond / view / rate)
 *   - ar-vr             :id  → ARVRSession       (start/pause/resume/complete/abort/safety)
 *   - quality           :id  → CorrectiveAction  (/actions/:id/resolve)
 *   - family       :memberId → FamilyMember      (update / consents)
 *   - family         :commId → FamilyCommunication (follow-ups / homework)
 *
 * Plus two ambiguous-param renames in family (URL shape UNCHANGED — Express
 * param names are internal): /members/:id → :memberId and
 * /follow-ups/:id/complete → :commId so the hooks actually fire.
 *
 * Deliberately NOT hooked (documented decisions):
 *   - research /:id          → ResearchStudy has NO branchId (org-wide studies)
 *   - ar-vr /scenarios/:scenarioId → static in-memory registry, not a DB doc
 *   - :therapistId/:userId/:employeeId → staff identity params (caseload
 *     doctrine, not branch ownership)
 *   - reports :templateCode / notifications :templateId → branch-less templates
 */

const fs = require('fs');
const path = require('path');

const DOMAINS = path.resolve(__dirname, '../domains');

const HOOKS = [
  {
    label: 'ai-recommendations',
    rel: 'ai-recommendations/routes/recommendations.routes.js',
    param: 'id',
    modelName: 'Recommendation',
    modelRel: '../models/Recommendation',
  },
  {
    label: 'ar-vr',
    rel: 'ar-vr/routes/ar-vr.routes.js',
    param: 'id',
    modelName: 'ARVRSession',
    modelRel: '../models/ARVRSession',
  },
  {
    label: 'quality',
    rel: 'quality/routes/quality.routes.js',
    param: 'id',
    modelName: 'CorrectiveAction',
    modelRel: '../models/CorrectiveAction',
  },
  {
    label: 'family (memberId)',
    rel: 'family/routes/family.routes.js',
    param: 'memberId',
    modelName: 'FamilyMember',
    modelRel: '../models/FamilyMember',
  },
  {
    label: 'family (commId)',
    rel: 'family/routes/family.routes.js',
    param: 'commId',
    modelName: 'FamilyCommunication',
    modelRel: '../models/FamilyCommunication',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Static — each hook is wired with the right model + import present
// ─────────────────────────────────────────────────────────────────────────────
describe.each(HOOKS)('W1175 — $label resource ownership hook', ({ rel, param, modelName, modelRel }) => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(path.join(DOMAINS, rel), 'utf8');
  });

  test('imports branchScopedResourceParam from assertBranchMatch', () => {
    expect(src).toMatch(
      /branchScopedResourceParam,?\s*\}\s*=\s*require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)|branchScopedResourceParam,/
    );
    expect(src).toContain("require('../../../middleware/assertBranchMatch')");
  });

  test(`router.param('${param}') wired to branchScopedResourceParam({ modelName: '${modelName}' })`, () => {
    const re = new RegExp(
      `router\\.param\\(\\s*['"]${param}['"],\\s*branchScopedResourceParam\\(\\{[^}]*modelName:\\s*['"]${modelName}['"]`
    );
    expect(src).toMatch(re);
  });

  test('hook carries a loadModel fallback for unregistered-model safety', () => {
    const re = new RegExp(
      `['"]${param}['"],\\s*branchScopedResourceParam\\(\\{[\\s\\S]*?loadModel:\\s*\\(\\)\\s*=>\\s*require\\(['"]${modelRel.replace(/\//g, '\\/')}['"]\\)`
    );
    expect(src).toMatch(re);
  });

  test('hook is declared AFTER requireBranchAccess (activation order)', () => {
    const rbaIdx = src.indexOf('router.use(requireBranchAccess)');
    const hookIdx = src.search(new RegExp(`router\\.param\\(\\s*['"]${param}['"]`));
    expect(rbaIdx).toBeGreaterThan(-1);
    expect(hookIdx).toBeGreaterThan(rbaIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Static — the family ambiguous :id params were renamed to hooked names
// ─────────────────────────────────────────────────────────────────────────────
describe('W1175 — family ambiguous-param renames', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(path.join(DOMAINS, 'family/routes/family.routes.js'), 'utf8');
  });

  test('no unhooked /:id route remains in the family router', () => {
    expect(src).not.toMatch(/['"][^'"]*\/:id\b/);
  });

  test('/members/:memberId update route uses the hooked param', () => {
    expect(src).toMatch(/'\/members\/:memberId'/);
    expect(src).toMatch(/updateFamilyMember\(req\.params\.memberId/);
  });

  test('/follow-ups/:commId/complete uses the hooked param', () => {
    expect(src).toMatch(/'\/follow-ups\/:commId\/complete'/);
    expect(src).toMatch(/completeFollowUp\(\s*req\.params\.commId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Behavioral — branchScopedResourceParam enforcement contract
// ─────────────────────────────────────────────────────────────────────────────
describe('W1175 — branchScopedResourceParam behavioral contract', () => {
  const { branchScopedResourceParam } = require('../middleware/assertBranchMatch');

  function makeRes() {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    return res;
  }

  test('unrestricted caller (no branchScope) → next() with no lookup', async () => {
    const hook = branchScopedResourceParam({ modelName: 'W1175NoSuchModel' });
    const next = jest.fn();
    await hook({ branchScope: { restricted: false } }, makeRes(), next, 'a'.repeat(24));
    expect(next).toHaveBeenCalledWith();
  });

  test('restricted caller + foreign-branch doc → 403', async () => {
    const mongoose = require('mongoose');
    const spy = jest.spyOn(mongoose, 'model').mockReturnValue({
      findById: () => ({
        select: () => ({ lean: async () => ({ branchId: 'branch-B' }) }),
      }),
    });
    try {
      const hook = branchScopedResourceParam({ modelName: 'W1175Probe', label: 'مورد' });
      const res = makeRes();
      const next = jest.fn();
      await hook(
        { branchScope: { restricted: true, branchId: 'branch-A' } },
        res,
        next,
        'a'.repeat(24)
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    } finally {
      spy.mockRestore();
    }
  });

  test('restricted caller + own-branch doc → next()', async () => {
    const mongoose = require('mongoose');
    const spy = jest.spyOn(mongoose, 'model').mockReturnValue({
      findById: () => ({
        select: () => ({ lean: async () => ({ branchId: 'branch-A' }) }),
      }),
    });
    try {
      const hook = branchScopedResourceParam({ modelName: 'W1175Probe2' });
      const next = jest.fn();
      await hook(
        { branchScope: { restricted: true, branchId: 'branch-A' } },
        makeRes(),
        next,
        'b'.repeat(24)
      );
      expect(next).toHaveBeenCalledWith();
    } finally {
      spy.mockRestore();
    }
  });

  test('restricted caller + missing doc → 404', async () => {
    const mongoose = require('mongoose');
    const spy = jest.spyOn(mongoose, 'model').mockReturnValue({
      findById: () => ({ select: () => ({ lean: async () => null }) }),
    });
    try {
      const hook = branchScopedResourceParam({ modelName: 'W1175Probe3' });
      const res = makeRes();
      const next = jest.fn();
      await hook(
        { branchScope: { restricted: true, branchId: 'branch-A' } },
        res,
        next,
        'c'.repeat(24)
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(404);
    } finally {
      spy.mockRestore();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Documented non-hooks stay true (deliberate-decision ratchet)
// ─────────────────────────────────────────────────────────────────────────────
describe('W1175 — documented non-hook decisions hold', () => {
  test('ResearchStudy (canonical) still has no branchId — research /:id stays unhooked', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../models/ResearchStudy.js'), 'utf8');
    // If branchId is ever added to the canonical study schema, this wave's
    // decision must be revisited: hook research /:id in the same PR.
    expect(src).not.toMatch(/branchId\s*:/);
  });

  test('ar-vr :scenarioId remains a static-registry lookup (no DB ownership applicable)', () => {
    const src = fs.readFileSync(path.join(DOMAINS, 'ar-vr/routes/ar-vr.routes.js'), 'utf8');
    expect(src).toMatch(/getScenario\(req\.params\.scenarioId\)/);
    expect(src).not.toMatch(/router\.param\(\s*['"]scenarioId['"]/);
  });
});
