'use strict';

/**
 * dashboard-mount-wave776.test.js — W776 drift guard.
 * dashboard.stats was unmounted; dashboardWidget was on wrong prefix (/dashboard/widgets).
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const PHASES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'phases.registry.js'),
  'utf8'
);
const WIDGET_ROUTES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'dashboardWidget.routes.js'),
  'utf8'
);

describe('W776 — dashboard.stats + dashboardWidget co-mounted at /api/dashboard', () => {
  it('phases.registry mounts dashboard.stats before dashboardWidget', () => {
    const statsIdx = PHASES.indexOf('../routes/dashboard.stats');
    const widgetIdx = PHASES.indexOf('../routes/dashboardWidget.routes');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(widgetIdx).toBeGreaterThan(statsIdx);
    expect(PHASES).toMatch(
      /safeMount\(app,\s*\['\/api\/dashboard',\s*'\/api\/v1\/dashboard'\],\s*'\.\.\/routes\/dashboard\.stats'\)/
    );
  });

  it('wrong /dashboard/widgets mount removed', () => {
    expect(PHASES).not.toMatch(/dashboard\/widgets/);
  });

  it('dashboardWidget literal routes precede /:dashboardId', () => {
    const paramIdx = WIDGET_ROUTES.indexOf("router.get('/:dashboardId'");
    expect(WIDGET_ROUTES.indexOf("router.get('/health'")).toBeLessThan(paramIdx);
    expect(WIDGET_ROUTES.indexOf("router.get('/user/all'")).toBeLessThan(paramIdx);
    expect(WIDGET_ROUTES.indexOf("router.get('/templates'")).toBeLessThan(paramIdx);
  });

  it('widget stats moved off /stats (executive stats on dashboard.stats.js)', () => {
    expect(WIDGET_ROUTES).not.toMatch(/router\.get\('\/stats'/);
    expect(WIDGET_ROUTES).toMatch(/router\.get\('\/widget-stats'/);
  });
});
