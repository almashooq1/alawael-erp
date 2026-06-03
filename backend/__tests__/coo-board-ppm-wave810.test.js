'use strict';

/**
 * W810 — COO executive board includes cross-branch facilityPpm section.
 */

const fs = require('fs');
const path = require('path');

const DASH = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'operations', 'opsDashboard.service.js'),
  'utf8'
);

describe('W810 COO board PPM integration', () => {
  it('opsDashboard exposes facilityPpm on COO executive board', () => {
    expect(DASH).toMatch(/_cooFacilityPpmSection/);
    expect(DASH).toMatch(/facilityPpm,/);
    expect(DASH).toMatch(/worstBranches/);
  });
});
