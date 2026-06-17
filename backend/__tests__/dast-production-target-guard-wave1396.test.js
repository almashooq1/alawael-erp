'use strict';

/**
 * W1396 — DAST production-target safety guard.
 *
 * Prevents accidental dynamic scan against production-like URLs unless a
 * human explicitly opts in via workflow_dispatch.allow_production=true.
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'dast.yml');

describe('W1396 — DAST workflow production target safety', () => {
  it('defines explicit manual override input for production-like targets', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toMatch(/allow_production:/);
    expect(yml).toMatch(/type:\s*boolean/);
    expect(yml).toMatch(/default:\s*false/);
  });

  it('wires allow_production into resolve step and blocks production-like targets by default', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toContain(
      "ALLOW_PRODUCTION: ${{ github.event.inputs.allow_production || 'false' }}"
    );
    expect(yml).toContain('TARGET_URL_LC="$(echo "$TARGET_URL" | tr');
    expect(yml).toMatch(/if \[ "\$ALLOW_PRODUCTION" != "true" \]/);
    expect(yml).toContain('Refusing production-like DAST target by default');
    expect(yml).toContain('workflow_dispatch.allow_production=true');
  });

  it('keeps the original fail-fast on missing target URL', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toMatch(/DAST target URL is not configured/);
    expect(yml).toMatch(/exit 1/);
  });
});
