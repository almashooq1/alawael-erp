'use strict';

/**
 * W345 — CAPA Pass 4 REST surface drift guard.
 *
 * Static-analysis test (W325 P2 / W337 / W344 pattern). Asserts the route
 * contract: methods, MFA tiers, error mapping, mounting, and the app.js
 * wireCapa call. Does NOT load mongoose (mocked by jest.setup.js).
 */

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'capa.routes.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

describe('W345 — CAPA REST surface contract', () => {
  it('exposes health probe with no auth (states + types + sources)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/health['"]/);
    expect(ROUTES_SRC).toMatch(/states:\s*lib\.LIFECYCLE_STATES/);
    expect(ROUTES_SRC).toMatch(/types:\s*lib\.CAPA_TYPES/);
    expect(ROUTES_SRC).toMatch(/sources:\s*lib\.SOURCE_MODULES/);
  });

  it('mounts authenticate + attachMfaActor as global middleware', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*attachMfaActor\s*\)/);
  });

  it('GET / + GET /overdue + GET /:id + GET /:id/audit all require tier 1', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/overdue['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
    expect(ROUTES_SRC).toMatch(
      /router\.get\(\s*['"]\/:id\/audit['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
  });

  it('POST / (create) requires tier 1; lib enforces stricter on transitions', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
  });

  it('POST /:id/transition requires tier 1 baseline + delegates MFA check to service', () => {
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/:id\/transition['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
    // Reads req.mfaActor.tier and passes it to the service
    expect(ROUTES_SRC).toMatch(/mfaTier\s*=\s*req\.mfaActor\??.tier/);
  });

  it('POST /sweep requires tier 2 (admin action)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/sweep['"]\s*,\s*requireMfaTier\(\s*2\s*\)/);
  });

  it('mapErrorToHttp maps all 5 known error codes correctly', () => {
    expect(ROUTES_SRC).toMatch(/CAPA_NOT_FOUND[\s\S]*status:\s*404/);
    expect(ROUTES_SRC).toMatch(/INVALID_TRANSITION[\s\S]*status:\s*422/);
    expect(ROUTES_SRC).toMatch(/REASON_CODE_REQUIRED[\s\S]*status:\s*400/);
    expect(ROUTES_SRC).toMatch(/MFA_TIER_INSUFFICIENT[\s\S]*status:\s*403/);
    expect(ROUTES_SRC).toMatch(/CapaTransitionError[\s\S]*status:\s*422/);
  });

  it('uses req.app._capaService (late binding to bootstrap-wired instance)', () => {
    expect(ROUTES_SRC).toMatch(/req\.app\._capaService/);
  });

  it('throws SERVICE_NOT_WIRED when bootstrap was not called', () => {
    expect(ROUTES_SRC).toMatch(/err\.code\s*=\s*['"]SERVICE_NOT_WIRED['"]/);
  });
});

describe('W834 — CAPA branch isolation + anti-mass-assignment', () => {
  it('mounts requireBranchAccess after authenticate', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  it('uses _resolveScopedBranchId + effectiveBranchScope for list queries', () => {
    expect(ROUTES_SRC).toMatch(/function _resolveScopedBranchId/);
    expect(ROUTES_SRC).toMatch(/effectiveBranchScope\(req\)/);
    expect(ROUTES_SRC).toMatch(/branchId = _resolveScopedBranchId\(req\)/);
  });

  it('GET /:id + GET /:id/audit scope with branchFilter + ObjectId guard', () => {
    expect(ROUTES_SRC).toMatch(/mongoose\.isValidObjectId\(req\.params\.id\)/);
    expect(ROUTES_SRC).toMatch(
      /findOne\(\s*\{\s*_id:\s*req\.params\.id,\s*\.\.\.branchFilter\(req\)/
    );
  });

  it('POST / uses explicit DTO (no ...req.body spread)', () => {
    expect(ROUTES_SRC).not.toMatch(/\.\.\.req\.body/);
    expect(ROUTES_SRC).toMatch(/source:\s*body\.source/);
    expect(ROUTES_SRC).toMatch(/branchId:\s*_resolveScopedBranchId\(req\)/);
  });

  it('POST /:id/transition verifies branch ownership before service call', () => {
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/:id\/transition['"][\s\S]*findOne\(\s*\{\s*_id:\s*req\.params\.id,\s*\.\.\.branchFilter\(req\)/
    );
  });
});

describe('W345 — bootstrap mounts routes under both /api and /api/v1', () => {
  it('mounts at /api/quality/capa', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/quality\/capa['"]\s*,\s*capaRouter\s*\)/
    );
  });

  it('mounts at /api/v1/quality/capa (versioned dual-mount)', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/v1\/quality\/capa['"]\s*,\s*capaRouter\s*\)/
    );
  });

  it('require path is ../routes/quality/capa.routes', () => {
    expect(BOOTSTRAP_SRC).toMatch(/require\(\s*['"]\.\.\/routes\/quality\/capa\.routes['"]\s*\)/);
  });
});

describe('W345 — app.js wires CAPA bootstrap', () => {
  it('app.js calls wireCapa(app, {logger})', () => {
    expect(APP_SRC).toMatch(
      /require\(\s*['"]\.\/startup\/capaBootstrap['"]\s*\)\.wireCapa\(\s*app\s*,\s*\{\s*logger\s*\}\s*\)/
    );
  });

  it('wireCapa call appears AFTER wireAiRecommendations (consistent grouping with W334)', () => {
    const aiIdx = APP_SRC.indexOf('wireAiRecommendations(app');
    const capaIdx = APP_SRC.indexOf('wireCapa(app');
    expect(aiIdx).toBeGreaterThan(-1);
    expect(capaIdx).toBeGreaterThan(aiIdx);
  });
});
