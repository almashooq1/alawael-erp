'use strict';

/**
 * W801 — facilities + maintenance integration drift guard.
 *
 * 1. Phase-16 ops routes registered in ops.registry + _registry.
 * 2. MaintenanceWorkOrder links facilityAssetId / facilityId (assetId optional).
 * 3. Ops WO create + facility-asset spawn-work-order endpoints exist.
 * 4. State machine accepts facilityAssetId in lieu of assetId on submit.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WO_MODEL = fs.readFileSync(path.join(ROOT, 'models', 'MaintenanceWorkOrder.js'), 'utf8');
const WO_ROUTES = fs.readFileSync(
  path.join(ROOT, 'routes', 'operations', 'workOrder.routes.js'),
  'utf8'
);
const FA_ROUTES = fs.readFileSync(path.join(ROOT, 'routes', 'facility-asset.routes.js'), 'utf8');
const OPS_REG = fs.readFileSync(path.join(ROOT, 'routes', 'registries', 'ops.registry.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'routes', '_registry.js'), 'utf8');
const WO_SM = fs.readFileSync(
  path.join(ROOT, 'services', 'operations', 'workOrderStateMachine.service.js'),
  'utf8'
);

describe('W801 facility-maintenance bridge', () => {
  it('ops.registry mounts work-orders, facilities, and maintenance-hub paths', () => {
    expect(OPS_REG).toMatch(/\/api\/v1\/ops\/work-orders/);
    expect(OPS_REG).toMatch(/\/api\/v1\/ops\/facilities/);
    expect(OPS_REG).toMatch(/\/api\/v1\/ops\/maintenance-hub/);
    expect(OPS_REG).toMatch(/operations\/workOrder\.routes/);
    expect(OPS_REG).toMatch(/operations\/facility\.routes/);
    expect(OPS_REG).toMatch(/operations\/maintenanceHub\.routes/);
  });

  it('_registry wires registerOpsRoutes before feature routes', () => {
    expect(REGISTRY).toMatch(/registerOpsRoutes/);
    const opsIdx = REGISTRY.indexOf('registerOpsRoutes');
    const featIdx = REGISTRY.indexOf('registerFeatureRoutes');
    expect(opsIdx).toBeGreaterThan(-1);
    expect(featIdx).toBeGreaterThan(opsIdx);
  });

  it('MaintenanceWorkOrder schema carries facilityAssetId + facilityId + subject validate', () => {
    expect(WO_MODEL).toMatch(/facilityAssetId:\s*\{/);
    expect(WO_MODEL).toMatch(/facilityId:\s*\{/);
    expect(WO_MODEL).toMatch(/pre\('validate',\s*async function woSubjectLink/);
    expect(WO_MODEL).toMatch(/assetId:\s*\{[\s\S]*?default:\s*null/);
  });

  it('ops work-order routes expose POST / create with branchFilter', () => {
    expect(WO_ROUTES).toMatch(/router\.post\(\s*['"]\/['"]/);
    expect(WO_ROUTES).toMatch(/branchFilter\(req\)/);
    expect(WO_ROUTES).toMatch(/facilityAssetId/);
  });

  it('ops work-order list filters by facilityAssetId and facilityId query', () => {
    expect(WO_ROUTES).toMatch(/query\('facilityAssetId'\)/);
    expect(WO_ROUTES).toMatch(/filter\.facilityAssetId = req\.query\.facilityAssetId/);
    expect(WO_ROUTES).toMatch(/query\('facilityId'\)/);
  });

  it('ops work-order list and getById populate facility links for UI labels', () => {
    expect(WO_ROUTES).toMatch(/populate\('facilityAssetId',\s*'name nameAr assetTag'\)/);
    expect(WO_ROUTES).toMatch(/populate\('facilityId',\s*'nameAr nameEn'\)/);
    expect(WO_ROUTES).toMatch(/require\('\.\.\/\.\.\/models\/FacilityAsset'\)/);
    expect(WO_ROUTES).toMatch(/require\('\.\.\/\.\.\/models\/operations\/Facility\.model'\)/);
  });

  it('facility-asset routes expose spawn-work-order', () => {
    expect(FA_ROUTES).toMatch(/\/:id\/spawn-work-order/);
    expect(FA_ROUTES).toMatch(/facilityAssetId:\s*row\._id/);
  });

  it('state machine treats facilityAssetId as satisfying assetId precondition', () => {
    expect(WO_SM).toMatch(/f === 'assetId'/);
    expect(WO_SM).toMatch(/facilityAssetId/);
  });
});
