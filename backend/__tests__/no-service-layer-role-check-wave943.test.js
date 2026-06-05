/**
 * no-service-layer-role-check-wave943.test.js — H4 drift guard
 *
 * WHY (AUTHZ_REMEDIATION_BACKLOG H4): "authz leaks into ~104 business-logic
 * sites; services should be role-check-free (authz at the middleware/route
 * boundary)." A 2026-06-05 re-measure found the "104" is STALE — the service
 * layer is ALREADY role-check-free: zero inline `req.user.role` / `requireRole`
 * checks across 640 service files (services/ + domains/<x>/services). Authz
 * lives where it belongs (routes/middleware). The only service-layer authz is
 * the RBAC infra itself (services/security/rbacService.js resolver) and the
 * ADR-019/W275 `enforceMfa` factory option (intentional defense-in-depth) —
 * neither is an inline req.user role leak.
 *
 * This guard LOCKS that clean state so authz can't creep back into services:
 * any service-layer file that reads `req.user.role(s)` / `req.user.isAdmin` /
 * `req.user.permissions` or calls `requireRole()` / `hasRole()` fails CI.
 * Baseline = ZERO. Non-behavior-changing (a test only). The broader scopedFind()
 * facade consolidation (the rest of H4) stays a separate design-gated effort.
 *
 * Pure source scan, no DB/boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  '__tests__',
  'tests',
  'node_modules',
  '_archived',
  '_archive',
  '_backups',
  'coverage',
]);

// Inline authz patterns that do NOT belong in the service layer. (NOT
// `.hasPermission(` — that is the rbacService resolver definition, the infra
// itself; and NOT `enforceMfa` — the intentional W275 factory option.)
const LEAK_PATTERNS = [
  /req\.user\??\.roles?\b/,
  /req\.user\??\.isAdmin\b/,
  /req\.user\??\.permissions\b/,
  /\brequireRole\s*\(/,
  /\bhasRole\s*\(/,
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** All files in services/, plus any file under a domains/.../services/ path. */
function collectServiceFiles() {
  const files = [];
  walk(path.join(BACKEND_ROOT, 'services'), files);
  const domainFiles = [];
  walk(path.join(BACKEND_ROOT, 'domains'), domainFiles);
  for (const f of domainFiles) {
    if (path.relative(BACKEND_ROOT, f).split(path.sep).includes('services')) files.push(f);
  }
  return files;
}

function leakHits(src) {
  return LEAK_PATTERNS.filter(re => re.test(src)).map(re => re.source);
}

describe('H4 — the service layer stays role-check-free (authz at the boundary)', () => {
  it('self-test: DETECTS an inline service-layer role check', () => {
    expect(leakHits("if (req.user.role === 'admin') return;").length).toBeGreaterThan(0);
    expect(leakHits("requireRole(['admin'])(req, res, next);").length).toBeGreaterThan(0);
    expect(leakHits('if (req.user.isAdmin) {}').length).toBeGreaterThan(0);
  });

  it('self-test: IGNORES legitimate service code (scope helpers, rbac resolver, mfa option)', () => {
    expect(leakHits('const b = effectiveBranchScope(req);').length).toBe(0);
    expect(leakHits('this.rbac.hasPermission(role, perm);').length).toBe(0); // resolver infra
    expect(leakHits('createService({ enforceMfa: true });').length).toBe(0);
    expect(leakHits('const items = await Model.find({ ...branchFilter(req) });').length).toBe(0);
  });

  it('the service layer has ZERO inline role checks (baseline)', () => {
    const violations = [];
    for (const file of collectServiceFiles()) {
      let src;
      try {
        src = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const hits = leakHits(src);
      if (hits.length) {
        violations.push(
          `${path.relative(BACKEND_ROOT, file).split(path.sep).join('/')}: ${hits.join(', ')}`
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

module.exports = { leakHits, collectServiceFiles };
