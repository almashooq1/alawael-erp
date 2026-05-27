'use strict';

/**
 * voice-log-routes-wave513.test.js — Wave 513 drift guard.
 *
 * Locks the shape of the W513 REST surface for the W460 BeneficiaryVoiceLog
 * model. Pairs with W460 model drift guard (`beneficiary-voice-log-wave460`)
 * + W460 behavioral counterpart. This wave covers the routes layer only.
 *
 * Static analysis (no DB, no boot) — reads route + registry source as text.
 *
 * Coverage:
 *   1. Route file exists + requires + auth + branch middleware
 *   2. Cross-tenant isolation per W269 doctrine — every handler uses
 *      branchFilter(req); never req.branchId; never bare findById
 *   3. 9 declared endpoints with the documented HTTP verb shape
 *   4. Enum lists mirror the W460 model byte-for-byte (drift = both fail)
 *   5. Registry mount via dualMountAuth at /voice-log (NOT plain dualMount)
 *   6. Roles use canonical names — no typos like 'admin_user' or
 *      'super-admin' (hyphen vs underscore class)
 *   7. Anti-mass-assignment: PATCH only touches a whitelisted set; create
 *      never spreads req.body. Per W506/W507 doctrine.
 *   8. PII-bounded inputs: text capped 2000 chars, audioUrl 500, etc.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_PATH = path.join(__dirname, '..', 'routes', 'voice-log.routes.js');
const REGISTRY_PATH = path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js');
const MODEL_PATH = path.join(__dirname, '..', 'models', 'BeneficiaryVoiceLog.js');

const ROUTES_SRC = fs.readFileSync(ROUTES_PATH, 'utf8');
const REGISTRY_SRC = fs.readFileSync(REGISTRY_PATH, 'utf8');
const MODEL_SRC = fs.readFileSync(MODEL_PATH, 'utf8');

// ═══════════════════════════════════════════════════════════════════════
// 1. File shape + middleware chain
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — file shape', () => {
  it('exists at backend/routes/voice-log.routes.js', () => {
    expect(fs.existsSync(ROUTES_PATH)).toBe(true);
  });

  it('exports an express.Router (single export)', () => {
    expect(ROUTES_SRC).toMatch(/const router = express\.Router\(\)/);
    expect(ROUTES_SRC).toMatch(/module\.exports = router/);
  });

  it('requires the W460 model', () => {
    expect(ROUTES_SRC).toMatch(/require\(['"]\.\.\/models\/BeneficiaryVoiceLog['"]\)/);
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
// 2. Cross-tenant isolation (W269 doctrine — fatal class)
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — cross-tenant isolation', () => {
  it('NEVER reads req.branchId (W269h drift guard class)', () => {
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });

  it('NEVER uses bare findById on params.id (must use findOne + branchFilter)', () => {
    // Allow findById in hydrate() for static maps, but not on the id param paths
    const idHandlerSections = [
      /router\.get\('\/:id'/,
      /router\.post\('\/:id\/action'/,
      /router\.post\('\/:id\/supersede'/,
      /router\.patch\('\/:id'/,
      /router\.delete\('\/:id'/,
    ];
    for (const re of idHandlerSections) {
      const m = ROUTES_SRC.match(re);
      expect(m).toBeTruthy();
    }
    // No `findById(req.params.id)` anywhere in the file
    expect(ROUTES_SRC).not.toMatch(/findById\(\s*req\.params\.id/);
  });

  it('applies branchFilter(req) on every list / get / mutate / delete handler', () => {
    // Count the number of branchFilter(req) usages — should be ≥ 9 (one per
    // endpoint that queries: list, byBeneficiary, stats, get, action,
    // supersede (× 2: row lookup + newer lookup), patch, delete).
    const occurrences = (ROUTES_SRC.match(/branchFilter\(req\)/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(9);
  });

  it('validates mongoose.isValidObjectId on every params.id handler', () => {
    // 5 endpoints take :id — each must guard
    const idGuards = ROUTES_SRC.match(/mongoose\.isValidObjectId\(req\.params\.id\)/g) || [];
    expect(idGuards.length).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Endpoints — 9 declared, correct HTTP verbs
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — endpoints', () => {
  const expected = [
    ['get', "'/'"],
    ['get', "'/by-beneficiary/:id'"],
    ['get', "'/stats'"],
    ['get', "'/:id'"],
    ['post', "'/'"],
    ['post', "'/:id/action'"],
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

  it('exactly 9 endpoints declared (no silent drift)', () => {
    const all = ROUTES_SRC.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
    expect(all.length).toBe(9);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Enum mirror — model is the source of truth
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — enum mirror with W460 model', () => {
  function extractEnum(src, key) {
    const re = new RegExp(`${key}\\s*:\\s*\\{[\\s\\S]*?enum\\s*:\\s*\\[([\\s\\S]*?)\\]`);
    const m = src.match(re);
    if (!m) return null;
    // Strip inline-line comments BEFORE splitting; model schema uses
    // `'value', // explanation` which would otherwise leak '/// I don't ...'
    // into the captured value (the apostrophe survives quote-strip).
    return m[1]
      .replace(/\/\/[^\n]*/g, '')
      .split(',')
      .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
      .filter(Boolean);
  }

  function extractRouteList(src, name) {
    const re = new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
    const m = src.match(re);
    if (!m) return null;
    return m[1]
      .split(',')
      .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
      .filter(Boolean);
  }

  it('ENTRY_KINDS matches model entryKind enum (9 values)', () => {
    const model = extractEnum(MODEL_SRC, 'entryKind');
    const route = extractRouteList(ROUTES_SRC, 'ENTRY_KINDS');
    expect(model).not.toBeNull();
    expect(route).not.toBeNull();
    expect(route.length).toBe(9);
    expect(route.sort()).toEqual(model.sort());
  });

  it('CAPTURE_MODALITIES matches model captureModality enum (4 values)', () => {
    const model = extractEnum(MODEL_SRC, 'captureModality');
    const route = extractRouteList(ROUTES_SRC, 'CAPTURE_MODALITIES');
    expect(route.length).toBe(4);
    expect(route.sort()).toEqual(model.sort());
  });

  it('CAPACITY_GRADES matches model capacityGrade enum (4 values)', () => {
    const model = extractEnum(MODEL_SRC, 'capacityGrade');
    const route = extractRouteList(ROUTES_SRC, 'CAPACITY_GRADES');
    expect(route.length).toBe(4);
    expect(route.sort()).toEqual(model.sort());
  });

  it('CAPTURED_BY_ROLES matches model capturedByRole enum (6 values inc. advocate)', () => {
    const model = extractEnum(MODEL_SRC, 'capturedByRole');
    const route = extractRouteList(ROUTES_SRC, 'CAPTURED_BY_ROLES');
    expect(route.length).toBe(6);
    expect(route).toContain('advocate');
    expect(route.sort()).toEqual(model.sort());
  });

  it('ACTION_TAKEN_VALUES matches model actionTaken enum (5 values)', () => {
    const model = extractEnum(MODEL_SRC, 'actionTaken');
    const route = extractRouteList(ROUTES_SRC, 'ACTION_TAKEN_VALUES');
    expect(route.length).toBe(5);
    expect(route.sort()).toEqual(model.sort());
  });

  it('LANGUAGES matches model language enum (3 values)', () => {
    const model = extractEnum(MODEL_SRC, 'language');
    const route = extractRouteList(ROUTES_SRC, 'LANGUAGES');
    expect(route.length).toBe(3);
    expect(route.sort()).toEqual(model.sort());
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Registry mount (dualMountAuth at /voice-log)
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — registry mount', () => {
  it('imports voiceLogRoutes via safeRequire', () => {
    expect(REGISTRY_SRC).toMatch(
      /const voiceLogRoutes = safeRequire\(['"]\.\.\/routes\/voice-log\.routes['"]\)/
    );
  });

  it('mounts at /voice-log via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(app,\s*['"]voice-log['"],\s*voiceLogRoutes,\s*authenticate\)/
    );
    // anti-regression: must never become plain dualMount (unauth)
    expect(REGISTRY_SRC).not.toMatch(/dualMount\(app,\s*['"]voice-log['"],\s*voiceLogRoutes\)/);
  });

  it('Wave 513 comment block precedes the mount call', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 513[\s\S]{0,1000}dualMountAuth\(app,\s*['"]voice-log['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Role-name hygiene
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — role hygiene', () => {
  it('READ_ROLES + WRITE_ROLES + DELETE_ROLES use snake_case, no hyphens', () => {
    // pull each role array
    const readM = ROUTES_SRC.match(/const READ_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const writeM = ROUTES_SRC.match(/const WRITE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const deleteM = ROUTES_SRC.match(/const DELETE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    expect(readM).toBeTruthy();
    expect(writeM).toBeTruthy();
    expect(deleteM).toBeTruthy();
    for (const m of [readM, writeM, deleteM]) {
      const roles = m[1]
        .split(',')
        .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
        .filter(Boolean);
      for (const r of roles) {
        expect(r).toMatch(/^[a-z][a-z_]*$/);
      }
    }
  });

  it('DELETE_ROLES is restricted to admin variants only', () => {
    const m = ROUTES_SRC.match(/const DELETE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const roles = m[1]
      .split(',')
      .map(s => s.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim())
      .filter(Boolean);
    for (const r of roles) {
      expect(r).toMatch(/admin/);
    }
  });

  it('CRPD-aware roles present in WRITE_ROLES (independent_advocate + cultural_officer)', () => {
    const m = ROUTES_SRC.match(/const WRITE_ROLES\s*=\s*\[([\s\S]*?)\]/);
    const roles = m[1];
    expect(roles).toMatch(/independent_advocate/);
    expect(roles).toMatch(/cultural_officer/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Anti-mass-assignment (W506/W507 doctrine)
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — anti-mass-assignment', () => {
  it('POST / never spreads req.body into create()', () => {
    // Match the create call — should NOT contain `...body` or `...req.body`
    const createBlock = ROUTES_SRC.match(/BeneficiaryVoiceLog\.create\(\{([\s\S]*?)\}\)/);
    expect(createBlock).toBeTruthy();
    expect(createBlock[1]).not.toMatch(/\.{3}body\b/);
    expect(createBlock[1]).not.toMatch(/\.{3}req\.body\b/);
  });

  it('PATCH /:id never uses Object.assign(row, req.body)', () => {
    expect(ROUTES_SRC).not.toMatch(/Object\.assign\(row,\s*req\.body/);
  });

  it('PATCH /:id immutable fields not touched (beneficiaryId / branchId / capturedBy)', () => {
    const patchBlock = ROUTES_SRC.match(/router\.patch\([\s\S]*?\}\);?\s*\n/);
    expect(patchBlock).toBeTruthy();
    expect(patchBlock[0]).not.toMatch(/row\.beneficiaryId\s*=/);
    expect(patchBlock[0]).not.toMatch(/row\.branchId\s*=/);
    expect(patchBlock[0]).not.toMatch(/row\.capturedBy\s*=/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. PII-bounded inputs
// ═══════════════════════════════════════════════════════════════════════

describe('W513 voice-log routes — input bounding', () => {
  it('content.text capped at 2000 chars matching the model', () => {
    expect(ROUTES_SRC).toMatch(/text\s*=\s*String\([^)]+\)\.slice\(0,\s*2000\)/);
    expect(MODEL_SRC).toMatch(/text:\s*\{[^}]*maxlength:\s*2000/);
  });

  it('content.audioUrl capped at 500 chars matching the model', () => {
    expect(ROUTES_SRC).toMatch(/audioUrl\s*=\s*String\([^)]+\)\.slice\(0,\s*500\)/);
    expect(MODEL_SRC).toMatch(/audioUrl:\s*\{[^}]*maxlength:\s*500/);
  });

  it('content.ratingValue clamped to [1, 5]', () => {
    expect(ROUTES_SRC).toMatch(
      /ratingValue\s*=\s*Math\.min\(5,\s*Math\.max\(1,\s*[a-zA-Z]+\.ratingValue\)\)/
    );
    expect(MODEL_SRC).toMatch(/ratingValue:\s*\{[\s\S]*?min:\s*1,\s*max:\s*5/);
  });

  it('supportArrangement capped at 500 chars matching the model', () => {
    expect(ROUTES_SRC).toMatch(/supportArrangement.*?\.slice\(0,\s*500\)/);
    expect(MODEL_SRC).toMatch(/supportArrangement:\s*\{[^}]*maxlength:\s*500/);
  });
});
