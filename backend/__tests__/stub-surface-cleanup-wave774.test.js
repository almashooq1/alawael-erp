'use strict';

/**
 * stub-surface-cleanup-wave774.test.js — W774 drift guard.
 * 1. Hollow dashboard.routes.unified deleted (zero consumers; ceo-dashboard + stats live).
 * 2. Hollow smart-attendance.routes (hyphen) deleted; real engine is smart_attendance.routes via hr.registry.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const PHASES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'phases.registry.js'),
  'utf8'
);
const HR = fs.readFileSync(path.join(BACKEND, 'routes', 'registries', 'hr.registry.js'), 'utf8');

describe('W774 — dashboard.routes.unified hollow stub removed', () => {
  it('dashboard.routes.unified.js deleted', () => {
    expect(fs.existsSync(path.join(BACKEND, 'routes', 'dashboard.routes.unified.js'))).toBe(false);
  });

  it('phases.registry no longer mounts dashboard-unified paths', () => {
    expect(PHASES).not.toMatch(/dashboard-unified/);
    expect(PHASES).not.toMatch(/dashboard\.routes\.unified/);
  });

  it('ceo-dashboard and dashboard engines stay mounted', () => {
    expect(PHASES).toMatch(/ceoDashboard\.routes/);
    expect(PHASES).toMatch(/dashboard\.stats/);
    expect(PHASES).toMatch(/dashboardWidget\.routes/);
  });
});

describe('W774 — smart-attendance hyphen CRUD stub removed', () => {
  it('smart-attendance.routes.js (hyphen stub) deleted', () => {
    expect(fs.existsSync(path.join(BACKEND, 'routes', 'smart-attendance.routes.js'))).toBe(false);
  });

  it('phases.registry no longer mounts smart-attendance-crud paths', () => {
    expect(PHASES).not.toMatch(/smart-attendance-crud/);
    expect(PHASES).not.toMatch(/routes\/smart-attendance\.routes/);
  });

  it('hr.registry keeps real smart_attendance.routes at /smart-attendance', () => {
    expect(HR).toMatch(/smart_attendance\.routes/);
    expect(HR).toMatch(/dualMount\(app,\s*'smart-attendance'/);
  });
});
