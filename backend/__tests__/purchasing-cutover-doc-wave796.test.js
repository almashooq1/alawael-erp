'use strict';

/**
 * purchasing-cutover-doc-wave796.test.js — W796 cutover doc W793–W795 sync guard.
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
    'PRODUCTION_CUTOVER_W780_W792_PURCHASING.md'
  ),
  'utf8'
);

describe('W796 — purchasing cutover doc W793–W795 extensions', () => {
  it('wave map includes W793 W794 W795', () => {
    expect(DOC).toMatch(/W780–W799/);
    expect(DOC).toMatch(/\| W793 \|/);
    expect(DOC).toMatch(/\| W794 \|/);
    expect(DOC).toMatch(/\| W795 \|/);
  });

  it('documents partial receive API and closed follow-ups', () => {
    expect(DOC).toMatch(/body\.items.*quantityReceived/s);
    expect(DOC).toMatch(/receive dialog|PartialReceiveDialog/i);
    expect(DOC).toMatch(/purchasing-routes-auth-wave794/);
    expect(DOC).toMatch(/purchasing-partial-receive-wave795/);
    expect(DOC).not.toMatch(/Partial receive.*deferred/i);
  });
});
