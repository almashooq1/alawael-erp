'use strict';

/**
 * stub-surface-cleanup-wave775.test.js — W775 bulk Phase-0 de-bloat.
 * Deletes 19 hollow stubs; wires real engines for system-settings (phases),
 * form-templates, specialized-programs → programs domain.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const REG = fs.readFileSync(path.join(BACKEND, 'routes', '_registry.js'), 'utf8');
const PHASES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'phases.registry.js'),
  'utf8'
);
const COMM = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'communication.registry.js'),
  'utf8'
);
const HR = fs.readFileSync(path.join(BACKEND, 'routes', 'registries', 'hr.registry.js'), 'utf8');

const DELETED_STUBS = [
  'routes/communityAwarenessRoutes.js',
  'routes/advancedSessions.js',
  'routes/ar-rehab.routes.js',
  'routes/employeeProfile.js',
  'routes/communication.routes.js',
  'routes/cache-management.routes.js',
  'routes/conversations.routes.js',
  'routes/projects.routes.js',
  'routes/fuel.routes.js',
  'routes/transport.routes.js',
  'routes/supportTickets.routes.js',
  'routes/specializedPrograms.routes.js',
  'routes/system-settings.routes.js',
  'routes/notificationTemplates.routes.js',
  'routes/templates.routes.js',
  'routes/performanceEvaluations.routes.js',
  'routes/form-templates.routes.js',
  'routes/social-media.routes.js',
  'routes/iot.routes.js',
];

describe('W775 — hollow stub files deleted', () => {
  it.each(DELETED_STUBS)('%s is gone', rel => {
    expect(fs.existsSync(path.join(BACKEND, rel))).toBe(false);
  });
});

describe('W775 — registry no longer mounts deleted stubs', () => {
  it('_registry removed fuel/transport/support/templates/notification-templates stubs', () => {
    expect(REG).not.toMatch(/fuel\.routes/);
    expect(REG).not.toMatch(/transport\.routes/);
    expect(REG).not.toMatch(/supportTickets\.routes/);
    expect(REG).not.toMatch(/routes\/templates\.routes/);
    expect(REG).not.toMatch(/notificationTemplates\.routes/);
    expect(REG).not.toMatch(/performanceEvaluations\.routes/);
    expect(REG).not.toMatch(/projects\.routes/);
    expect(REG).not.toMatch(/social-media\.routes/);
    expect(REG).not.toMatch(/system-settings\.routes/);
    expect(REG).not.toMatch(/form-templates\.routes/);
    expect(REG).not.toMatch(/conversations\.routes/);
  });

  it('_registry wires specialized-programs to programs domain (single mount)', () => {
    const mountMatches = REG.match(/dualMountAuth\([\s\S]*?'specialized-programs'/g) || [];
    expect(mountMatches.length).toBe(1);
    expect(REG).toMatch(/specialized-programs[\s\S]*programs\/routes\/programs\.routes/);
  });

  it('_registry wires form-templates to formTemplate.routes', () => {
    expect(REG).toMatch(/dualMountAuth\(app,\s*'form-templates'[\s\S]*formTemplate\.routes/);
  });

  it('phases.registry keeps systemSettings.routes (no hyphen stub shadow)', () => {
    expect(PHASES).toMatch(/systemSettings\.routes/);
    expect(PHASES).toMatch(/dualMountAuth\(app,\s*'system-settings'/);
    expect(PHASES).not.toMatch(/system-settings\.routes/);
    expect(PHASES).not.toMatch(/cache-management/);
    expect(PHASES).not.toMatch(/iot\.routes/);
    expect(PHASES).not.toMatch(/ar-rehab\.routes/);
    expect(PHASES).not.toMatch(/communityAwarenessRoutes/);
    expect(PHASES).not.toMatch(/advancedSessions/);
  });

  it('communication.registry drops hollow communication.routes stub', () => {
    expect(COMM).not.toMatch(/communication\.routes/);
    expect(COMM).toMatch(/communications\.routes/);
  });

  it('hr.registry drops employeeProfile stub', () => {
    expect(HR).not.toMatch(/employeeProfile/);
  });
});

describe('W775 — real engines kept (not hollow stubs)', () => {
  it.each([
    'routes/rehab-measures.routes.js',
    'routes/rehab-templates.routes.js',
    'routes/uploads.routes.js',
    'routes/build-info.routes.js',
    'routes/public-uploads.routes.js',
    'routes/formTemplate.routes.js',
    'routes/systemSettings.routes.js',
  ])('%s still exists', rel => {
    expect(fs.existsSync(path.join(BACKEND, rel))).toBe(true);
  });
});
