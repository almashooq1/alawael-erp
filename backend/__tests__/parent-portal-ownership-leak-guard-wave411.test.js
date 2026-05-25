'use strict';

/**
 * W411 — anti-regression guard for the parent-portal ownership-leak.
 *
 * The legacy parent-portal-v1 routes returned 403 + a descriptive message
 * ("consent belongs to another family", etc.) when the caller's guardian
 * didn't own the resource. That leaks two distinguishers to an attacker:
 *
 *   1. 403 status vs 404 — caller can distinguish "exists but not yours"
 *      from "doesn't exist", enumerating valid resource IDs across families.
 *   2. Message text — same channel via response body.
 *
 * Same bug class as the W410 cross-tenant audit (5ca905fde) on
 * `routes/beneficiaries.js`. W411 converts all 13 sites in
 * `routes/parent-portal-v1.routes.js` to a uniform 404 +
 * `{ error: 'NotFound', message: 'not found' }`.
 *
 * This guard prevents the leak from coming back in any future edit:
 *   - no `status(403)` paired with `Forbidden` + `belongs to another family`
 *   - no `status(403)` paired with `Forbidden` + `not linked to this guardian`
 *   - no `status(403)` paired with `Forbidden` + `report belongs`
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'routes', 'parent-portal-v1.routes.js');

describe('W411 parent-portal ownership-leak anti-regression guard', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('no "belongs to another family" 403 ownership-leak remains', () => {
    expect(src).not.toMatch(/belongs to another family/);
  });

  it('no "not linked to this guardian" 403 ownership-leak remains', () => {
    expect(src).not.toMatch(/not linked to this guardian/);
  });

  it('no "report belongs to" 403 ownership-leak remains', () => {
    expect(src).not.toMatch(/report belongs to/);
  });

  it('file still mounts at least 5 endpoints (sanity — no accidental wipe)', () => {
    const endpoints = src.match(/router\.(get|post|patch|put|delete)\(/g) || [];
    expect(endpoints.length).toBeGreaterThanOrEqual(5);
  });

  it('ownership-fail returns 404 (the uniform replacement)', () => {
    // At least one of the W411 replacements landed
    expect(src).toMatch(/W411: unify with 404/);
    expect(src).toMatch(/status\(404\)\.json\(\{ error: 'NotFound', message: 'not found' \}\)/);
  });
});
