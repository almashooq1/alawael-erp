'use strict';

/**
 * self-advocacy-routes-wave518.test.js — Wave 518 drift guard.
 *
 * Locks the shape of the W518 REST surface for the W462
 * SelfAdvocacyTrainingPlan model. Pairs with `self-advocacy-wave462` static
 * + `self-advocacy-behavioral-wave462` runtime guards. This wave covers
 * routes layer only.
 *
 * Static analysis (no DB, no boot).
 *
 * Coverage:
 *   1. File shape + middleware chain
 *   2. Cross-tenant isolation per W269
 *   3. 12 endpoints with the documented HTTP verb shape
 *   4. Enum mirror — 5 lists match model + ModuleCompletionSchema byte-for-byte
 *   5. Registry mount via dualMountAuth at /self-advocacy
 *   6. Role hygiene
 *   7. Singleton-per-beneficiary discipline:
 *      - POST / checks existing + returns 409 (NOT relying on unique-index)
 *      - create always seeds modules via buildInitialModules() with all 5 rights
 *      - create always sets status='active'
 *   8. Anti-mass-assignment — no req.body spread + no Object.assign;
 *      PATCH doesn't allow flipping status / modules / completionPercentage
 *   9. PII bounds match model
 */

const fs = require('fs');
const path = require('path');

const ROUTES_PATH = path.join(__dirname, '..', 'routes', 'self-advocacy.routes.js');
const REGISTRY_PATH = path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js');
const MODEL_PATH = path.join(__dirname, '..', 'models', 'SelfAdvocacyTrainingPlan.js');

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

// Extract a NAMED enum occurrence (e.g., the SECOND `status` enum which is
// the ModuleCompletionSchema's module status, distinct from the plan's
// top-level status). Returns the Nth match.
function extractModelEnumNth(src, key, n) {
  const re = new RegExp(`${key}\\s*:\\s*\\{[\\s\\S]*?enum\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'g');
  let i = 0;
  let match;
  while ((match = re.exec(src)) !== null) {
    if (i === n) {
      return match[1]
        .replace(/\/\/[^\n]*/g, '')
        .split(',')
        .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
        .filter(Boolean);
    }
    i++;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. File shape + middleware chain
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — file shape', () => {
  it('exists at backend/routes/self-advocacy.routes.js', () => {
    expect(fs.existsSync(ROUTES_PATH)).toBe(true);
  });

  it('exports an express.Router', () => {
    expect(ROUTES_SRC).toMatch(/const router = express\.Router\(\)/);
    expect(ROUTES_SRC).toMatch(/module\.exports = router/);
  });

  it('requires the W462 model', () => {
    expect(ROUTES_SRC).toMatch(/require\(['"]\.\.\/models\/SelfAdvocacyTrainingPlan['"]\)/);
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
// 2. Cross-tenant isolation (W269)
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — cross-tenant isolation', () => {
  it('NEVER reads req.branchId (W269h drift guard class)', () => {
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });

  it('NEVER uses bare findById(req.params.id)', () => {
    expect(ROUTES_SRC).not.toMatch(/findById\(\s*req\.params\.id/);
  });

  it('applies branchFilter(req) on every query / mutate handler', () => {
    const occurrences = (ROUTES_SRC.match(/branchFilter\(req\)/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(9);
  });

  it('validates mongoose.isValidObjectId on every params.id handler', () => {
    const idGuards = ROUTES_SRC.match(/mongoose\.isValidObjectId\(req\.params\.id\)/g) || [];
    expect(idGuards.length).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Endpoints — 12 declared
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — endpoints', () => {
  const expected = [
    ['get', "'/'"],
    ['get', "'/by-beneficiary/:id'"],
    ['get', "'/stats'"],
    ['get', "'/:id'"],
    ['post', "'/'"],
    ['post', "'/:id/module/:rightCode/start'"],
    ['post', "'/:id/module/:rightCode/complete'"],
    ['post', "'/:id/module/:rightCode/skip'"],
    ['post', "'/:id/hold'"],
    ['post', "'/:id/resume'"],
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

  it('exactly 12 endpoints declared (4 GET + 6 POST + 1 PATCH + 1 DELETE)', () => {
    const all = ROUTES_SRC.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
    expect(all.length).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Enum mirror — model is the source of truth
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — enum mirror with W462 model', () => {
  it('TRACKS matches model track enum (4 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'track');
    const route = extractRouteList(ROUTES_SRC, 'TRACKS');
    expect(model).not.toBeNull();
    expect(route).not.toBeNull();
    expect(route.length).toBe(4);
    expect(route.sort()).toEqual(model.sort());
  });

  it('STATUSES matches plan-level status enum (4 values: active/on_hold/completed/archived)', () => {
    // Plan-level status is the SECOND status enum in the model file
    // (first is the embedded ModuleCompletionSchema's status, with 4 different values).
    const planStatus = extractModelEnumNth(MODEL_SRC, 'status', 1);
    const route = extractRouteList(ROUTES_SRC, 'STATUSES');
    expect(planStatus).not.toBeNull();
    expect(route.length).toBe(4);
    expect(route.sort()).toEqual(planStatus.sort());
    expect(route).toContain('active');
    expect(route).toContain('on_hold');
    expect(route).toContain('completed');
    expect(route).toContain('archived');
  });

  it('RIGHT_CODES matches ModuleCompletionSchema rightCode enum (5 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'rightCode');
    const route = extractRouteList(ROUTES_SRC, 'RIGHT_CODES');
    expect(model).not.toBeNull();
    expect(route.length).toBe(5);
    expect(route.sort()).toEqual(model.sort());
    expect(route).toContain('be_heard');
    expect(route).toContain('consent');
    expect(route).toContain('refuse');
    expect(route).toContain('complain');
    expect(route).toContain('community');
  });

  it('MODULE_STATUSES matches ModuleCompletionSchema status enum (4 values)', () => {
    // Module-level status is the FIRST status enum in the file
    // (embedded schema is defined before the parent schema).
    const moduleStatus = extractModelEnumNth(MODEL_SRC, 'status', 0);
    const route = extractRouteList(ROUTES_SRC, 'MODULE_STATUSES');
    expect(moduleStatus).not.toBeNull();
    expect(route.length).toBe(4);
    expect(route.sort()).toEqual(moduleStatus.sort());
  });

  it('DELIVERED_BY_ROLES matches ModuleCompletionSchema deliveredByRole enum (5 values)', () => {
    const model = extractModelEnum(MODEL_SRC, 'deliveredByRole');
    const route = extractRouteList(ROUTES_SRC, 'DELIVERED_BY_ROLES');
    expect(model).not.toBeNull();
    expect(route.length).toBe(5);
    expect(route.sort()).toEqual(model.sort());
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Registry mount
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — registry mount', () => {
  it('imports selfAdvocacyRoutes via safeRequire', () => {
    expect(REGISTRY_SRC).toMatch(
      /const selfAdvocacyRoutes = safeRequire\(['"]\.\.\/routes\/self-advocacy\.routes['"]\)/
    );
  });

  it('mounts at /self-advocacy via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(app,\s*['"]self-advocacy['"],\s*selfAdvocacyRoutes,\s*authenticate\)/
    );
    expect(REGISTRY_SRC).not.toMatch(
      /dualMount\(app,\s*['"]self-advocacy['"],\s*selfAdvocacyRoutes\)/
    );
  });

  it('Wave 518 comment block precedes the mount call', () => {
    expect(REGISTRY_SRC).toMatch(
      /Wave 518[\s\S]{0,2000}dualMountAuth\(app,\s*['"]self-advocacy['"]/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Role hygiene
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — role hygiene', () => {
  it('READ / WRITE / DELETE role lists use snake_case', () => {
    for (const name of ['READ_ROLES', 'WRITE_ROLES', 'DELETE_ROLES']) {
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

  it('CRPD-aware roles present in WRITE_ROLES (independent_advocate)', () => {
    const m = ROUTES_SRC.match(/const WRITE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    expect(m[1]).toMatch(/independent_advocate/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Singleton-per-beneficiary discipline
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — singleton-per-beneficiary discipline', () => {
  it('POST / checks for existing plan + returns 409 explicitly', () => {
    // Match the create route body
    const createBlock = ROUTES_SRC.match(
      /router\.post\('\/',\s*requireRole\(WRITE_ROLES\)[\s\S]*?(?=router\.(?:get|post|patch|delete|use)\(|\/\/ ── Helper:)/
    );
    expect(createBlock).toBeTruthy();
    expect(createBlock[0]).toMatch(/SelfAdvocacyTrainingPlan\.findOne\(/);
    expect(createBlock[0]).toMatch(/return\s+res\.status\(409\)/);
  });

  it('POST / always sets status="active" on create', () => {
    const createBlock = ROUTES_SRC.match(/SelfAdvocacyTrainingPlan\.create\(\{([\s\S]*?)\}\)/);
    expect(createBlock).toBeTruthy();
    expect(createBlock[1]).toMatch(/status:\s*['"]active['"]/);
  });

  it('POST / seeds modules via buildInitialModules() (5 slots)', () => {
    expect(ROUTES_SRC).toMatch(/modules:\s*buildInitialModules\(\)/);
    // The helper must spread RIGHT_CODES
    expect(ROUTES_SRC).toMatch(/RIGHT_CODES\.map\(/);
  });

  it('Model declares beneficiaryId as unique (singleton invariant)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]+?unique:\s*true/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Anti-mass-assignment + immutable derived fields
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — anti-mass-assignment', () => {
  it('POST / never spreads req.body into create()', () => {
    const createBlock = ROUTES_SRC.match(/SelfAdvocacyTrainingPlan\.create\(\{([\s\S]*?)\}\)/);
    expect(createBlock).toBeTruthy();
    expect(createBlock[1]).not.toMatch(/\.{3}body\b/);
    expect(createBlock[1]).not.toMatch(/\.{3}req\.body\b/);
  });

  it('NEVER uses Object.assign(plan, req.body)', () => {
    expect(ROUTES_SRC).not.toMatch(/Object\.assign\(plan,\s*req\.body/);
  });

  it('PATCH /:id never touches completionPercentage / modules / completedAt directly', () => {
    const patchBlock = ROUTES_SRC.match(
      /router\.patch\([\s\S]*?(?=router\.(?:get|post|patch|delete|use)\(|module\.exports)/
    );
    expect(patchBlock).toBeTruthy();
    expect(patchBlock[0]).not.toMatch(/plan\.completionPercentage\s*=/);
    expect(patchBlock[0]).not.toMatch(/plan\.modules\s*=/);
    expect(patchBlock[0]).not.toMatch(/plan\.completedAt\s*=/);
    // status is only flipped by /hold + /resume + /finalize-via-modules,
    // never by PATCH. Regex excludes === (comparison) by requiring the next
    // char not be '=' — assignment only.
    expect(patchBlock[0]).not.toMatch(/plan\.status\s*=[^=]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. PII bounds match model
// ═══════════════════════════════════════════════════════════════════════

describe('W518 self-advocacy routes — input bounding', () => {
  it('notes capped at 2000 chars matching plan model', () => {
    expect(ROUTES_SRC).toMatch(/notes[\s\S]{0,200}\.slice\(0,\s*2000\)/);
    expect(MODEL_SRC).toMatch(/notes:\s*\{[^}]*maxlength:\s*2000/);
  });

  it('trackSelectionReasoning capped at 500 chars matching model', () => {
    expect(ROUTES_SRC).toMatch(/trackSelectionReasoning[\s\S]{0,200}\.slice\(0,\s*500\)/);
    expect(MODEL_SRC).toMatch(/trackSelectionReasoning:\s*\{[^}]*maxlength:\s*500/);
  });

  it('reasonableAdjustments items capped at 500 chars + ≤20 entries', () => {
    expect(ROUTES_SRC).toMatch(/reasonableAdjustments[\s\S]{0,200}\.slice\(0,\s*20\)/);
    expect(MODEL_SRC).toMatch(/reasonableAdjustments:\s*\[\{[^}]*maxlength:\s*500/);
  });

  it('module skipReason ≥5 chars + ≤500 chars matching model', () => {
    expect(ROUTES_SRC).toMatch(/skipReason\.length\s*<\s*5/);
    expect(ROUTES_SRC).toMatch(/skipReason[\s\S]{0,200}\.slice\(0,\s*500\)/);
    expect(MODEL_SRC).toMatch(/skipReason:\s*\{[^}]*maxlength:\s*500/);
  });

  it('module sessionsRequired bounded [1, 10] matching model', () => {
    expect(ROUTES_SRC).toMatch(/sessionsRequired\s*>=\s*1[\s\S]{0,100}sessionsRequired\s*<=\s*10/);
    expect(MODEL_SRC).toMatch(/sessionsRequired:\s*\{[\s\S]*?min:\s*1,\s*max:\s*10/);
  });
});
