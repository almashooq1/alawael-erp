'use strict';

/**
 * decision-rights-routes-wave515.test.js — Wave 515 drift guard.
 *
 * Locks the shape of the W515 REST surface for the W461
 * DecisionRightsAssessment model. Pairs with `decision-rights-wave461` static
 * + `decision-rights-behavioral-wave461` runtime guards. This wave covers
 * routes layer only.
 *
 * Static analysis (no DB, no boot).
 *
 * Coverage:
 *   1. File shape + middleware chain (auth + branch + body-scope)
 *   2. Cross-tenant isolation per W269 (never req.branchId; branchFilter
 *      on every query; mongoose.isValidObjectId guards on every :id)
 *   3. 10 endpoints with the documented HTTP verb shape
 *   4. Enum mirror — 4 lists (DECISION_TYPES / ROUTED_LAYERS / STATUSES /
 *      ASSESSED_BY_ROLES) match model byte-for-byte
 *   5. Registry mount via dualMountAuth at /decision-rights (never plain)
 *   6. Role hygiene + FINALIZE_ROLES strictly smaller than WRITE_ROLES
 *      (finalization needs higher trust)
 *   7. Anti-mass-assignment — no req.body spread in create, no
 *      Object.assign(row, req.body), draft→finalized transition only
 *      via /:id/finalize (no status field in PATCH allowlist)
 *   8. PII bounds match model (decisionDescription≤1000, supportArrangement
 *      ≤2000, notes≤2000, capacity[k] clamped [0,3])
 */

const fs = require('fs');
const path = require('path');

const ROUTES_PATH = path.join(__dirname, '..', 'routes', 'decision-rights.routes.js');
const REGISTRY_PATH = path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js');
const MODEL_PATH = path.join(__dirname, '..', 'models', 'DecisionRightsAssessment.js');

const ROUTES_SRC = fs.readFileSync(ROUTES_PATH, 'utf8');
const REGISTRY_SRC = fs.readFileSync(REGISTRY_PATH, 'utf8');
const MODEL_SRC = fs.readFileSync(MODEL_PATH, 'utf8');

function extractRouteList(src, name) {
  const re = new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  const m = src.match(re);
  if (!m) return null;
  return m[1]
    .replace(/\/\/[^\n]*/g, '')
    .split(',')
    .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
    .filter(Boolean);
}

function extractModelEnum(src, key) {
  const re = new RegExp(`${key}\\s*:\\s*\\{[\\s\\S]*?enum\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const m = src.match(re);
  if (!m) return null;
  return m[1]
    .replace(/\/\/[^\n]*/g, '')
    .split(',')
    .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
    .filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. File shape + middleware chain
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — file shape', () => {
  it('exists at backend/routes/decision-rights.routes.js', () => {
    expect(fs.existsSync(ROUTES_PATH)).toBe(true);
  });

  it('exports an express.Router', () => {
    expect(ROUTES_SRC).toMatch(/const router = express\.Router\(\)/);
    expect(ROUTES_SRC).toMatch(/module\.exports = router/);
  });

  it('requires the W461 model', () => {
    expect(ROUTES_SRC).toMatch(/require\(['"]\.\.\/models\/DecisionRightsAssessment['"]\)/);
  });

  it('uses authenticateToken + requireBranchAccess + bodyScopedBeneficiaryGuard', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
  });

  it('imports branchFilter + safeError + assertBranchMatch helpers', () => {
    expect(ROUTES_SRC).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(ROUTES_SRC).toMatch(/require\(['"]\.\.\/utils\/safeError['"]\)/);
    expect(ROUTES_SRC).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Cross-tenant isolation (W269 doctrine)
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — cross-tenant isolation', () => {
  it('NEVER reads req.branchId (W269h drift guard class)', () => {
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });

  it('NEVER uses bare findById(req.params.id)', () => {
    expect(ROUTES_SRC).not.toMatch(/findById\(\s*req\.params\.id/);
  });

  it('applies branchFilter(req) on every query / mutate handler', () => {
    const occurrences = (ROUTES_SRC.match(/branchFilter\(req\)/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(10);
  });

  it('validates mongoose.isValidObjectId on every params.id handler', () => {
    const idGuards = ROUTES_SRC.match(/mongoose\.isValidObjectId\(req\.params\.id\)/g) || [];
    expect(idGuards.length).toBeGreaterThanOrEqual(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Endpoints — 10 declared, correct HTTP verbs
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — endpoints', () => {
  const expected = [
    ['get', "'/'"],
    ['get', "'/by-beneficiary/:id'"],
    ['get', "'/pending-review'"],
    ['get', "'/stats'"],
    ['get', "'/:id'"],
    ['post', "'/'"],
    ['post', "'/:id/finalize'"],
    ['post', "'/:id/record-outcome'"],
    ['post', "'/:id/supersede'"],
    ['patch', "'/:id'"],
    ['delete', "'/:id'"],
  ];
  for (const [verb, route] of expected) {
    it(`declares ${verb.toUpperCase()} ${route}`, () => {
      const re = new RegExp(
        `router\\.${verb}\\(\\s*${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      );
      expect(ROUTES_SRC).toMatch(re);
    });
  }

  it('exactly 11 endpoints declared (4 POST + 5 GET + 1 PATCH + 1 DELETE)', () => {
    const all = ROUTES_SRC.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
    expect(all.length).toBe(11);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Enum mirror — model is the source of truth
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — enum mirror with W461 model', () => {
  it('DECISION_TYPES matches model decisionType enum (12 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'decisionType');
    const route = extractRouteList(ROUTES_SRC, 'DECISION_TYPES');
    expect(model).not.toBeNull();
    expect(route).not.toBeNull();
    expect(route.length).toBe(12);
    expect(route.sort()).toEqual(model.sort());
  });

  it('ROUTED_LAYERS matches model routedLayer enum (4 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'routedLayer');
    const route = extractRouteList(ROUTES_SRC, 'ROUTED_LAYERS');
    expect(route.length).toBe(4);
    expect(route.sort()).toEqual(model.sort());
  });

  it('STATUSES matches model status enum (3 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'status');
    const route = extractRouteList(ROUTES_SRC, 'STATUSES');
    expect(route.length).toBe(3);
    expect(route.sort()).toEqual(model.sort());
  });

  it('ASSESSED_BY_ROLES matches model assessedByRole enum (5 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'assessedByRole');
    const route = extractRouteList(ROUTES_SRC, 'ASSESSED_BY_ROLES');
    expect(route.length).toBe(5);
    expect(route.sort()).toEqual(model.sort());
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Registry mount
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — registry mount', () => {
  it('imports decisionRightsRoutes via safeRequire', () => {
    expect(REGISTRY_SRC).toMatch(
      /const decisionRightsRoutes = safeRequire\(['"]\.\.\/routes\/decision-rights\.routes['"]\)/
    );
  });

  it('mounts at /decision-rights via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(app,\s*['"]decision-rights['"],\s*decisionRightsRoutes,\s*authenticate\)/
    );
    expect(REGISTRY_SRC).not.toMatch(
      /dualMount\(app,\s*['"]decision-rights['"],\s*decisionRightsRoutes\)/
    );
  });

  it('Wave 515 comment block precedes the mount call', () => {
    expect(REGISTRY_SRC).toMatch(
      /Wave 515[\s\S]{0,1000}dualMountAuth\(app,\s*['"]decision-rights['"]/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Role hygiene + finalization escalation
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — role hygiene', () => {
  it('READ / WRITE / FINALIZE / DELETE role lists use snake_case', () => {
    for (const name of ['READ_ROLES', 'WRITE_ROLES', 'FINALIZE_ROLES', 'DELETE_ROLES']) {
      const m = ROUTES_SRC.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
      expect(m).toBeTruthy();
      const roles = m[1]
        .split(',')
        .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
        .filter(Boolean);
      for (const r of roles) {
        expect(r).toMatch(/^[a-z][a-z_]*$/);
      }
    }
  });

  it('FINALIZE_ROLES is a strict subset of WRITE_ROLES (finalization is escalation)', () => {
    const writeM = ROUTES_SRC.match(/const WRITE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const finalizeM = ROUTES_SRC.match(/const FINALIZE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const parse = m =>
      m[1]
        .split(',')
        .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
        .filter(Boolean);
    const writeSet = new Set(parse(writeM));
    const finalize = parse(finalizeM);
    for (const r of finalize) {
      expect(writeSet.has(r)).toBe(true);
    }
    // Strict subset: at least 1 write role NOT in finalize (independent_advocate)
    expect(finalize.length).toBeLessThan(writeSet.size);
  });

  it('DELETE_ROLES is admin-only variants', () => {
    const m = ROUTES_SRC.match(/const DELETE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const roles = m[1]
      .split(',')
      .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
      .filter(Boolean);
    for (const r of roles) {
      expect(r).toMatch(/admin/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Anti-mass-assignment + status-transition discipline
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — anti-mass-assignment', () => {
  it('POST / never spreads req.body into create()', () => {
    const createBlock = ROUTES_SRC.match(/DecisionRightsAssessment\.create\(\{([\s\S]*?)\}\)/);
    expect(createBlock).toBeTruthy();
    expect(createBlock[1]).not.toMatch(/\.{3}body\b/);
    expect(createBlock[1]).not.toMatch(/\.{3}req\.body\b/);
  });

  it('NEVER uses Object.assign(row, req.body)', () => {
    expect(ROUTES_SRC).not.toMatch(/Object\.assign\(row,\s*req\.body/);
  });

  it('PATCH /:id immutable fields not touched (beneficiaryId / branchId / assessedBy / status)', () => {
    // Match the patch handler body from its declaration up to the next
    // route declaration (DELETE /:id is the next one in the file).
    const patchBlock = ROUTES_SRC.match(
      /router\.patch\([\s\S]*?(?=router\.(?:get|post|patch|delete|use)\(|module\.exports)/
    );
    expect(patchBlock).toBeTruthy();
    expect(patchBlock[0]).not.toMatch(/row\.beneficiaryId\s*=/);
    expect(patchBlock[0]).not.toMatch(/row\.branchId\s*=/);
    expect(patchBlock[0]).not.toMatch(/row\.assessedBy\s*=/);
    expect(patchBlock[0]).not.toMatch(/row\.status\s*=\s*['"]finalized/);
    expect(patchBlock[0]).not.toMatch(/row\.status\s*=\s*['"]superseded/);
  });

  it('POST / always creates with status="draft"', () => {
    const createBlock = ROUTES_SRC.match(/DecisionRightsAssessment\.create\(\{([\s\S]*?)\}\)/);
    expect(createBlock[1]).toMatch(/status:\s*['"]draft['"]/);
  });

  it('finalize route requires status transition draft → finalized only (409 otherwise)', () => {
    expect(ROUTES_SRC).toMatch(/row\.status\s*!==\s*['"]draft['"]/);
    expect(ROUTES_SRC).toMatch(/row\.status\s*=\s*['"]finalized['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. PII bounds match model
// ═══════════════════════════════════════════════════════════════════════

describe('W515 decision-rights routes — input bounding', () => {
  it('decisionDescription capped at 1000 chars matching model', () => {
    expect(ROUTES_SRC).toMatch(/decisionDescription[\s\S]{0,200}\.slice\(0,\s*1000\)/);
    expect(MODEL_SRC).toMatch(/decisionDescription:\s*\{[^}]*maxlength:\s*1000/);
  });

  it('supportArrangement capped at 2000 chars matching model', () => {
    expect(ROUTES_SRC).toMatch(/supportArrangement[\s\S]{0,200}\.slice\(0,\s*2000\)/);
    expect(MODEL_SRC).toMatch(/supportArrangement:\s*\{[^}]*maxlength:\s*2000/);
  });

  it('notes capped at 2000 chars matching model', () => {
    expect(ROUTES_SRC).toMatch(/notes[\s\S]{0,100}\.slice\(0,\s*2000\)/);
    expect(MODEL_SRC).toMatch(/notes:\s*\{[^}]*maxlength:\s*2000/);
  });

  it('assessmentInstrument capped at 200 chars matching model', () => {
    expect(ROUTES_SRC).toMatch(/assessmentInstrument[\s\S]{0,200}\.slice\(0,\s*200\)/);
    expect(MODEL_SRC).toMatch(/assessmentInstrument:\s*\{[^}]*maxlength:\s*200/);
  });

  it('capacity fields clamped to [0, 3] matching model', () => {
    // route clamps via Math.min(3, Math.max(0, ...))
    expect(ROUTES_SRC).toMatch(/Math\.min\(3,\s*Math\.max\(0,/);
    // model declares min: 0, max: 3
    expect(MODEL_SRC).toMatch(/understanding:\s*\{\s*type:\s*Number,\s*min:\s*0,\s*max:\s*3/);
  });

  it('decisionOutcome required ≥5 chars on /record-outcome', () => {
    expect(ROUTES_SRC).toMatch(/outcome\.length\s*<\s*5/);
  });
});
