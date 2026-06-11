/**
 * W1190 — static drift guard: dashboard-saved-views must self-authenticate.
 *
 * WHY: `routes/dashboard-saved-views.routes.js` is mounted TWICE —
 *   (a) app.js `/api/v1/dashboards/saved-views` WITH an injected `authenticate`,
 *   (b) phases.registry `safeMount(['/api/dashboard-saved-views', …])` which
 *       injects NO middleware (safeMount === bare `app.use`, no auth variant).
 * Before W1190 the router had no router-level gate, so mount (b) exposed the
 * full list/create/update/delete surface to ANONYMOUS callers — and because the
 * owner guards read `if (view.ownerUserId && …)`, an owner-less view (POSTed
 * anonymously, ownerUserId → null) could be PATCHed/DELETEd by anyone.
 *
 * The fix is a router-level `router.use(authenticate)` inside buildRouter, which
 * protects EVERY mount (current + future). This guard locks that in so a future
 * edit can't silently drop it and re-open the hole. Pairs with the behavioral
 * counterpart `dashboard-saved-views-auth-behavioral-wave1190.test.js`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'dashboard-saved-views.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'phases.registry.js');

describe('W1190 dashboard-saved-views self-authentication (static)', () => {
  const src = fs.readFileSync(ROUTE_FILE, 'utf8');

  test('imports `authenticate` from the canonical middleware/auth', () => {
    expect(src).toMatch(/require\(\s*['"]\.\.\/middleware\/auth['"]\s*\)/);
    expect(src).toMatch(/\bauthenticate\b/);
  });

  test('applies router.use(authenticate) at the router level', () => {
    expect(src).toMatch(/router\.use\(\s*authenticate\s*\)/);
  });

  test('the auth gate precedes every route handler (no unguarded verb)', () => {
    const gateIdx = src.search(/router\.use\(\s*authenticate\s*\)/);
    const firstVerbIdx = src.search(/router\.(get|post|put|patch|delete)\(/);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(firstVerbIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(firstVerbIdx);
  });

  test('phases.registry still mounts it via auth-less safeMount (the reason the gate is load-bearing)', () => {
    // If this mount is ever removed/changed, this assertion fails and prompts a
    // re-confirmation that the self-auth is still the load-bearing protection.
    const reg = fs.readFileSync(REGISTRY, 'utf8');
    expect(reg).toMatch(/safeMount\([\s\S]{0,120}dashboard-saved-views\.routes/);
  });
});
