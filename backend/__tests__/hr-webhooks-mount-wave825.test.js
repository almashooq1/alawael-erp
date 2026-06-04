'use strict';

/**
 * W825 — HR webhooks router mounted via hr.registry (ratchet-down dormant baseline).
 */

const fs = require('fs');
const path = require('path');

const HR_REGISTRY = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js'),
  'utf8'
);
const DORMANT_SCRIPT = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'check-dormant-modules.js'),
  'utf8'
);
const CUTOVER = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'PRODUCTION_CUTOVER_W356_W370.md'
  ),
  'utf8'
);

describe('W825 — HR webhooks registry mount', () => {
  it('hr.registry wires createHrWebhooksRouter at /api/hr and /api/v1/hr', () => {
    expect(HR_REGISTRY).toMatch(/createHrWebhooksRouter/);
    expect(HR_REGISTRY).toMatch(/HrWebhookSubscription/);
    expect(HR_REGISTRY).toMatch(/app\.use\('\/api\/hr', hrWebhooksRouter\)/);
    expect(HR_REGISTRY).toMatch(/app\.use\('\/api\/v1\/hr', hrWebhooksRouter\)/);
    expect(HR_REGISTRY).toMatch(/\/api\/hr\/webhooks/);
  });

  it('dormant-modules baseline no longer holds hr-webhooks.routes.js', () => {
    expect(DORMANT_SCRIPT).not.toMatch(/hr-webhooks\.routes\.js/);
  });

  it('clinical cutover doc lists 13 sweepers including W383 assessment overdue', () => {
    expect(CUTOVER).toMatch(/13 ENV flags/);
    expect(CUTOVER).toMatch(/ENABLE_ASSESSMENT_OVERDUE_SWEEPER/);
  });
});
