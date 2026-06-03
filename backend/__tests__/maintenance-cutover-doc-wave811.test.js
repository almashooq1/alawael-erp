'use strict';

/**
 * maintenance-cutover-doc-wave811.test.js — W811 cutover doc sync guard.
 */

const fs = require('fs');
const path = require('path');

const DOC = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md'
  ),
  'utf8'
);

describe('W811 — maintenance cutover doc W801–W810 extensions', () => {
  it('wave map and scope include W801 through W811', () => {
    expect(DOC).toMatch(/W801–W810/);
    expect(DOC).toMatch(/\| W801 \|/);
    expect(DOC).toMatch(/\| W807 \|/);
    expect(DOC).toMatch(/\| W808 \|/);
    expect(DOC).toMatch(/\| W809 \|/);
    expect(DOC).toMatch(/\| W810 \|/);
    expect(DOC).toMatch(/\| W811 \|/);
  });

  it('documents PPM sweeper env and verification curls', () => {
    expect(DOC).toMatch(/ENABLE_PPM_WO_SWEEPER/);
    expect(DOC).toMatch(/maintenance-hub\/snapshot/);
    expect(DOC).toMatch(/spawn-due-maintenance/);
    expect(DOC).toMatch(/facility-maintenance-bridge-wave801/);
    expect(DOC).toMatch(/maintenance-hub-wave807/);
  });
});
