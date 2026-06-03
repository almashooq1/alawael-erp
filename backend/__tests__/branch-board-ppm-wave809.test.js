'use strict';

/**
 * W809 — branch ops board includes PPM (facilityAssets) section.
 */

const fs = require('fs');
const path = require('path');

const DASH = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'operations', 'opsDashboard.service.js'),
  'utf8'
);
const BOOT = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'operationsBootstrap.js'),
  'utf8'
);
const FAC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'operations', 'facility.routes.js'),
  'utf8'
);

describe('W809 branch board PPM integration', () => {
  it('opsDashboard exposes facilityAssets on branch board', () => {
    expect(DASH).toMatch(/_branchFacilityAssetsSection/);
    expect(DASH).toMatch(/facilityAssets,/);
    expect(DASH).toMatch(/dueMaintenance/);
    expect(DASH).toMatch(/openWorkOrdersOnAssets/);
    expect(DASH).toMatch(/facilityAssetModel/);
  });

  it('operationsBootstrap wires FacilityAsset into dashboard service', () => {
    expect(BOOT).toMatch(/facilityAssetModel:\s*FacilityAsset/);
  });

  it('facility finding route accepts facilityAssetId for WO spawn', () => {
    expect(FAC).toMatch(/body\('facilityAssetId'\)/);
    expect(FAC).toMatch(/facilityAssetId:\s*req\.body\.facilityAssetId/);
  });
});
